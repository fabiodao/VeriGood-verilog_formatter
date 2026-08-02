'use strict';

/**
 * Shared command-line runner for the VeriGood formatter.
 *
 * Contains all argument parsing, file handling and output modes. It is
 * intentionally decoupled from *how* the formatter is obtained: callers pass a
 * `makeFormatter(overrides, indentSize)` factory that returns a
 * `(text) => string` formatting function.
 *
 *   - bin/verigood-fmt.js  -> loads the compiled formatter from ../dist
 *   - cli/standalone.js    -> uses the formatter bundled into a single file
 *
 * The full default configuration is always loaded; command-line parameters
 * override individual settings for the current run only.
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Option schema (mirrors the Config interface / package.json defaults).
// ---------------------------------------------------------------------------

const BOOLEAN_DEFAULTS = {
  alignPortList: true,
  alignParameters: true,
  wrapPortList: true,
  removeTrailingWhitespace: true,
  alignAssignments: true,
  alignWireDeclSemicolons: true,
  formatModuleInstantiations: true,
  formatModuleHeaders: true,
  indentAlwaysBlocks: true,
  enforceBeginEnd: true,
  indentCaseStatements: true,
  annotateIfdefComments: true,
  enableUVMFormatting: true,
  preserveInstantiationStyle: false
};

// `indentSize` is handled specially (passed straight to formatVerilogText).
const NUMBER_DEFAULTS = {
  indentSize: 2,
  maxBlankLines: 1,
  lineLength: 160,
  commentColumn: 0,
  uvmLineLength: 100
};

const ARRAY_DEFAULTS = {
  expandSingleLineModules: [],
  collapseSingleLineModules: []
};

const ALIASES = {
  uvm: 'enableUVMFormatting'
};

const VERILOG_EXTENSIONS = new Set(['.v', '.vh', '.sv', '.svh']);

// ---------------------------------------------------------------------------
// Flag <-> key helpers.
// ---------------------------------------------------------------------------

function camelToKebab(name) {
  return name
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2') // UVMFormatting -> UVM-Formatting
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')     // enableUVM -> enable-UVM
    .toLowerCase();
}

const FLAG_TO_KEY = {};
for (const key of [...Object.keys(BOOLEAN_DEFAULTS), ...Object.keys(NUMBER_DEFAULTS), ...Object.keys(ARRAY_DEFAULTS)]) {
  FLAG_TO_KEY[camelToKebab(key)] = key;
}
for (const [alias, key] of Object.entries(ALIASES)) {
  FLAG_TO_KEY[alias] = key;
}

function isBooleanKey(key) {
  return Object.prototype.hasOwnProperty.call(BOOLEAN_DEFAULTS, key);
}
function isNumberKey(key) {
  return Object.prototype.hasOwnProperty.call(NUMBER_DEFAULTS, key);
}
function isArrayKey(key) {
  return Object.prototype.hasOwnProperty.call(ARRAY_DEFAULTS, key);
}

function fail(message) {
  process.stderr.write(`error: ${message}\n`);
  process.exit(2);
}

function parseBool(raw) {
  const v = String(raw).toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(v)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(v)) return false;
  fail(`expected a boolean value, got: ${raw}`);
}

function parseNumber(flag, raw) {
  if (raw === undefined) fail(`--${flag} expects a value`);
  const n = Number(raw);
  if (!Number.isFinite(n)) fail(`--${flag} expects a number, got: ${raw}`);
  return n;
}

// ---------------------------------------------------------------------------
// Argument parsing.
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = {
    overrides: {},                 // camelCase key -> value (booleans + numbers, excluding indentSize)
    indentSize: NUMBER_DEFAULTS.indentSize,
    files: [],
    write: false,
    check: false,
    help: false,
    version: false
  };

  let noMoreFlags = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (noMoreFlags || arg === '-' || !arg.startsWith('-')) {
      opts.files.push(arg);
      continue;
    }

    if (arg === '--') { noMoreFlags = true; continue; }
    if (arg === '-h' || arg === '--help') { opts.help = true; continue; }
    if (arg === '-v' || arg === '--version') { opts.version = true; continue; }
    if (arg === '-w' || arg === '--write') { opts.write = true; continue; }
    if (arg === '-c' || arg === '--check') { opts.check = true; continue; }

    // Support --flag=value in addition to --flag value.
    let rawName = arg;
    let inlineValue;
    const eq = arg.indexOf('=');
    if (eq !== -1) {
      rawName = arg.slice(0, eq);
      inlineValue = arg.slice(eq + 1);
    }

    let flagName = rawName.replace(/^--?/, '');
    let negated = false;
    if (flagName.startsWith('no-')) {
      negated = true;
      flagName = flagName.slice(3);
    }

    const key = FLAG_TO_KEY[flagName];
    if (!key) fail(`unknown option: ${rawName}`);
    if (negated && !isBooleanKey(key)) {
      fail(`the "no-" prefix is only valid for boolean options: ${rawName}`);
    }

    if (key === 'indentSize') {
      const value = inlineValue !== undefined ? inlineValue : argv[++i];
      opts.indentSize = parseNumber('indent-size', value);
      continue;
    }

    if (isBooleanKey(key)) {
      opts.overrides[key] = inlineValue !== undefined ? parseBool(inlineValue) : !negated;
      continue;
    }

    if (isNumberKey(key)) {
      const value = inlineValue !== undefined ? inlineValue : argv[++i];
      opts.overrides[key] = parseNumber(flagName, value);
      continue;
    }

    if (isArrayKey(key)) {
      const value = inlineValue !== undefined ? inlineValue : argv[++i];
      if (value === undefined) fail(`--${flagName} expects a value`);
      // Parse comma-separated values
      const arrayValue = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
      opts.overrides[key] = arrayValue;
      continue;
    }

    fail(`unknown option: ${rawName}`);
  }

  return opts;
}

// ---------------------------------------------------------------------------
// File collection.
// ---------------------------------------------------------------------------

function collectFromDirectory(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      collectFromDirectory(path.join(dir, entry.name), out);
    } else if (VERILOG_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      out.push(path.join(dir, entry.name));
    }
  }
}

function resolveTargets(files) {
  const targets = [];
  for (const file of files) {
    let stat;
    try {
      stat = fs.statSync(file);
    } catch (err) {
      fail(`cannot access "${file}": ${err.message}`);
    }
    if (stat.isDirectory()) {
      collectFromDirectory(file, targets);
    } else {
      targets.push(file);
    }
  }
  return targets;
}

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch (err) {
    fail(`could not read from stdin: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Help / version.
// ---------------------------------------------------------------------------

function printVersion() {
  try {
    const pkg = require('../package.json');
    process.stdout.write(`${pkg.name} ${pkg.version}\n`);
  } catch {
    process.stdout.write('unknown\n');
  }
}

function printHelp() {
  const lines = [];
  lines.push('VeriGood - Verilog/SystemVerilog formatter (CLI)');
  lines.push('');
  lines.push('Usage:');
  lines.push('  verigood-fmt [options] [file|dir ...]');
  lines.push('  cat file.v | verigood-fmt [options]');
  lines.push('');
  lines.push('The full default configuration is always loaded; the options below');
  lines.push('override individual settings for this run only.');
  lines.push('');
  lines.push('Modes:');
  lines.push('  (default)            Print the formatted result to stdout (single file or stdin).');
  lines.push('  -w, --write          Rewrite the given files in place.');
  lines.push('  -c, --check          Do not write; exit 1 if any file is not already formatted.');
  lines.push('');
  lines.push('Info:');
  lines.push('  -h, --help           Show this help.');
  lines.push('  -v, --version        Show the version.');
  lines.push('');
  lines.push('Numeric options:');
  for (const key of Object.keys(NUMBER_DEFAULTS)) {
    const flag = `--${camelToKebab(key)} <n>`;
    lines.push(`  ${flag.padEnd(28)} default: ${NUMBER_DEFAULTS[key]}`);
  }
  lines.push('');
  lines.push('Boolean options (enable with --flag, disable with --no-flag):');
  for (const key of Object.keys(BOOLEAN_DEFAULTS)) {
    const flag = `--[no-]${camelToKebab(key)}`;
    lines.push(`  ${flag.padEnd(38)} default: ${BOOLEAN_DEFAULTS[key]}`);
  }
  lines.push('  --[no-]uvm                             alias for --[no-]enable-uvm-formatting');
  lines.push('');
  lines.push('Array options (comma-separated values):');
  for (const key of Object.keys(ARRAY_DEFAULTS)) {
    const flag = `--${camelToKebab(key)} <values>`;
    lines.push(`  ${flag.padEnd(38)} default: ${ARRAY_DEFAULTS[key].length > 0 ? ARRAY_DEFAULTS[key].join(',') : '[]'}`);
  }
  lines.push('');
  lines.push('Examples:');
  lines.push('  verigood-fmt design.v');
  lines.push('  verigood-fmt -w rtl/');
  lines.push('  verigood-fmt -c rtl/ generated/top.v');
  lines.push('  verigood-fmt -w --indent-size 4 --no-indent-always-blocks a.v');
  lines.push('  verigood-fmt --expand-single-line-modules ILF_REG,DFF a.v');
  lines.push('  verigood-fmt --preserve-instantiation-style a.v');
  process.stdout.write(lines.join('\n') + '\n');
}

// ---------------------------------------------------------------------------
// Main entry.
// ---------------------------------------------------------------------------

/**
 * Runs the CLI.
 * @param {string[]} argv Arguments (already sliced past `node script`).
 * @param {(overrides: object, indentSize: number) => (text: string) => string} makeFormatter
 * @returns {number} process exit code
 */
function run(argv, makeFormatter) {
  const opts = parseArgs(argv);

  if (opts.help) { printHelp(); return 0; }
  if (opts.version) { printVersion(); return 0; }

  if (opts.write && opts.check) {
    fail('choose either --write or --check, not both.');
  }

  const format = makeFormatter(opts.overrides, opts.indentSize);

  const hasStdinToken = opts.files.includes('-');
  const useStdin = opts.files.length === 0 || (opts.files.length === 1 && hasStdinToken);

  if (useStdin) {
    const input = readStdin();
    process.stdout.write(format(input));
    return 0;
  }
  if (hasStdinToken) {
    fail('stdin ("-") cannot be combined with file arguments.');
  }

  const targets = resolveTargets(opts.files);
  if (targets.length === 0) {
    fail('no Verilog/SystemVerilog files found.');
  }

  if (opts.check) {
    const unformatted = [];
    for (const file of targets) {
      const input = fs.readFileSync(file, 'utf8');
      if (format(input) !== input) unformatted.push(file);
    }
    if (unformatted.length > 0) {
      process.stderr.write('Not formatted:\n');
      unformatted.forEach(f => process.stderr.write(`  ${f}\n`));
      return 1;
    }
    process.stdout.write(`All ${targets.length} file(s) already formatted.\n`);
    return 0;
  }

  if (opts.write) {
    let changed = 0;
    for (const file of targets) {
      const input = fs.readFileSync(file, 'utf8');
      const output = format(input);
      if (output !== input) {
        fs.writeFileSync(file, output, 'utf8');
        changed++;
        process.stderr.write(`formatted ${file}\n`);
      }
    }
    process.stderr.write(`Done: ${changed} of ${targets.length} file(s) changed.\n`);
    return 0;
  }

  if (targets.length > 1) {
    fail('multiple files given; use --write to format in place or --check to verify.');
  }
  process.stdout.write(format(fs.readFileSync(targets[0], 'utf8')));
  return 0;
}

module.exports = { run };
