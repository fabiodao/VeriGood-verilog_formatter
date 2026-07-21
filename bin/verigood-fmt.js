#!/usr/bin/env node
'use strict';

/**
 * VeriGood formatter - in-repo command-line interface.
 *
 * Thin entry point that runs the ALREADY-COMPILED formatter (dist/formatter)
 * headlessly. All argument parsing and output handling lives in cli/runner.js,
 * which is shared with the bundled standalone build (standalone/verigood-fmt.js).
 *
 * The formatter core reads its settings through the `vscode` API. Since this
 * runs outside VS Code, we install a tiny in-memory `vscode` stub built from the
 * chosen configuration (the exact technique used by tests/run_tests.js). The
 * extension and its formatting logic are not modified.
 *
 * For a portable, dependency-free single file, use `npm run build:cli`.
 */

const fs = require('fs');
const path = require('path');
const Module = require('module');
const { run } = require('../cli/runner');

function makeVscodeStub(overrides) {
  const configuration = {
    get(key, defaultValue) {
      return Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] : defaultValue;
    },
    inspect() { return {}; }
  };
  return {
    workspace: { getConfiguration() { return configuration; } },
    TextEdit: { replace: (range, newText) => ({ range, newText }) },
    Position: class { constructor(line, character) { this.line = line; this.character = character; } },
    Range: class { constructor(start, end) { this.start = start; this.end = end; } }
  };
}

/**
 * Builds a `(text) => string` formatter backed by the compiled dist bundle.
 */
function makeFormatter(overrides, indentSize) {
  const entry = path.resolve(__dirname, '..', 'dist', 'formatter', 'index.js');
  if (!fs.existsSync(entry)) {
    process.stderr.write(
      `error: formatter build not found at ${entry}\n` +
      `Run "npm run compile" in the extension directory first.\n`
    );
    process.exit(2);
  }

  const stub = makeVscodeStub(overrides);
  const originalLoad = Module._load;
  Module._load = function (request) {
    if (request === 'vscode') return stub;
    return originalLoad.apply(this, arguments);
  };

  let formatVerilogText;
  try {
    formatVerilogText = require(entry).formatVerilogText;
  } finally {
    Module._load = originalLoad;
  }

  if (typeof formatVerilogText !== 'function') {
    process.stderr.write('error: formatVerilogText export not found in the compiled formatter.\n');
    process.exit(2);
  }

  return (text) => formatVerilogText(text, indentSize);
}

process.exit(run(process.argv.slice(2), makeFormatter));
