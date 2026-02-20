// Comprehensive test runner for Verilog formatter
const fs = require('fs');
const path = require('path');
const Module = require('module');

// Test configuration - which tests need which settings
const testConfig = {
  '01_module_declarations.v': { indentAlwaysBlocks: false },
  '02_module_instantiations.v': { indentAlwaysBlocks: false },
  '03_always_blocks.v': { indentAlwaysBlocks: true },
  '04_case_statements.v': { indentAlwaysBlocks: true },
  '05_multiline_conditions.v': { indentAlwaysBlocks: true },
  '06_assignments.v': { indentAlwaysBlocks: true },
  '07_wire_reg_declarations.v': { indentAlwaysBlocks: false },
  '08_parameters_ports.v': { indentAlwaysBlocks: false },
  '09_comments_edge_cases.v': { indentAlwaysBlocks: true },
  '10_parameter_alignment.v': { indentAlwaysBlocks: false },
  '11_nested_ifdefs.v': { indentAlwaysBlocks: false }
};

const inputDir = path.join(__dirname, 'inputs');
const expectedDir = path.join(__dirname, 'expected');
const outputDir = path.join(__dirname, 'outputs');
const logDir = path.join(__dirname, 'logs');

// Create output and log directories if they don't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Create log file with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('Z')[0];
const logFile = path.join(logDir, `test-run-${timestamp}.log`);
let logContent = '';

function log(message) {
  console.log(message);
  logContent += message + '\n';
}

function saveLog() {
  fs.writeFileSync(logFile, logContent, 'utf8');
}

log('╔════════════════════════════════════════════════════════════╗');
log('║        Verilog Formatter - Comprehensive Test Suite        ║');
log('╚════════════════════════════════════════════════════════════╝\n');
log(`Test run started at: ${new Date().toISOString()}`);
log(`Log file: ${logFile}\n`);

// Check if expected outputs exist
if (!fs.existsSync(expectedDir) || fs.readdirSync(expectedDir).length === 0) {
  log('⚠  Expected outputs not found. Run "npm run test:generate" first.\n');
  saveLog();
  process.exit(1);
}

const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.v')).sort();

let passed = 0;
let failed = 0;
const failures = [];

files.forEach(file => {
  const testName = file.replace('.v', '').replace(/^\d+_/, '').replace(/_/g, ' ');

  try {
    const inputPath = path.join(inputDir, file);
    const expectedPath = path.join(expectedDir, file);

    if (!fs.existsSync(expectedPath)) {
      log(`⚠  SKIP: ${testName} (no expected output)`);
      return;
    }

    const config = testConfig[file] || { indentAlwaysBlocks: false };
    log(`\nTesting: ${testName} (${file})`);
    log(`  Config: ${JSON.stringify(config)}`);

    // Mock vscode with appropriate settings for this test
    const originalRequire = Module.prototype.require;
    Module.prototype.require = function(id) {
      if (id === 'vscode') {
        return {
          workspace: {
            getConfiguration: () => ({
              get: (k, d) => {
                if (k === 'indentAlwaysBlocks') return config.indentAlwaysBlocks || false;
                if (k === 'formatModuleInstantiations') return true;
                return d;
              },
              inspect: () => ({})
            })
          },
          TextEdit: { replace: (r, t) => ({ range: r, newText: t }) },
          Position: class { constructor(l, c) { this.line = l; this.character = c; } },
          Range: class { constructor(s, e) { this.start = s; this.end = e; } }
        };
      }
      return originalRequire.apply(this, arguments);
    };

    // Clear all formatter-related cache
    Object.keys(require.cache).forEach(key => {
      if (key.includes('formatter')) {
        delete require.cache[key];
      }
    });

    const { formatVerilogText } = require('../dist/formatter/index');

    const input = fs.readFileSync(inputPath, 'utf8');
    const expected = fs.readFileSync(expectedPath, 'utf8');
    const actual = formatVerilogText(input, 2);

    // Save actual output to file for comparison
    const outputPath = path.join(outputDir, file);
    fs.writeFileSync(outputPath, actual, 'utf8');

    // Restore require and clear cache again
    Module.prototype.require = originalRequire;
    Object.keys(require.cache).forEach(key => {
      if (key.includes('formatter')) {
        delete require.cache[key];
      }
    });

    if (actual === expected) {
      log(`  ✓ PASS`);
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      log(`  ✗ FAIL`);
      console.log(`✗ FAIL: ${testName}`);
      failed++;
      failures.push({
        file,
        testName,
        actual,
        expected
      });
    }
  } catch (error) {
    log(`  ✗ ERROR: ${error.message}`);
    log(`  Stack: ${error.stack}`);
    console.log(`✗ ERROR: ${testName} - ${error.message}`);
    failed++;
  }
});

log(`\n============================================================`);
log(`Total:  ${files.length} tests`);
log(`Passed: ${passed} ✓`);
log(`Failed: ${failed} ✗`);
log(`============================================================`);

console.log(`\n============================================================`);
console.log(`Total:  ${files.length} tests`);
console.log(`Passed: ${passed} ✓`);
console.log(`Failed: ${failed} ✗`);
console.log(`============================================================`);

if (failed > 0) {
  log(`\n╔════════════════════════════════════════════════════════════╗`);
  log(`║                      FAILURE DETAILS                       ║`);
  log(`╚════════════════════════════════════════════════════════════╝\n`);
  
  console.log(`\n╔════════════════════════════════════════════════════════════╗`);
  console.log(`║                      FAILURE DETAILS                       ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝\n`);

  failures.forEach((failure, index) => {
    const header = `\n[${index + 1}] ${failure.testName} (${failure.file})`;
    const separator = `------------------------------------------------------------`;
    
    console.log(header);
    console.log(separator);
    log(header);
    log(separator);

    const expectedLines = failure.expected.split('\n');
    const actualLines = failure.actual.split('\n');

    let firstDiff = -1;
    for (let i = 0; i < Math.max(expectedLines.length, actualLines.length); i++) {
      if (expectedLines[i] !== actualLines[i]) {
        firstDiff = i;
        break;
      }
    }

    if (firstDiff >= 0) {
      const diffMsg = `First difference at line ${firstDiff + 1}:`;
      const expMsg = `  Expected: "${expectedLines[firstDiff] || ''}"`;
      const actMsg = `  Actual:   "${actualLines[firstDiff] || ''}"`;
      
      console.log(diffMsg);
      console.log(expMsg);
      console.log(actMsg);
      log(diffMsg);
      log(expMsg);
      log(actMsg);

      const start = Math.max(0, firstDiff - 2);
      const end = Math.min(expectedLines.length, firstDiff + 3);
      const contextMsg = `\nContext (lines ${start + 1}-${end + 1}):`;
      console.log(contextMsg);
      log(contextMsg);
      
      for (let i = start; i < end; i++) {
        const marker = i === firstDiff ? '>' : ' ';
        const expLine = `  ${marker} E[${i + 1}]: "${expectedLines[i] || ''}"`;
        const actLine = `  ${marker} A[${i + 1}]: "${actualLines[i] || ''}"`;
        console.log(expLine);
        console.log(actLine);
        log(expLine);
        log(actLine);
      }
      
      // Write detailed diff to log only
      log(`\n--- Full Diff for ${failure.file} ---`);
      log(`Expected output (${expectedLines.length} lines):`);
      expectedLines.forEach((line, i) => {
        log(`E[${i + 1}]: ${line}`);
      });
      log(`\nActual output (${actualLines.length} lines):`);
      actualLines.forEach((line, i) => {
        log(`A[${i + 1}]: ${line}`);
      });
      log(`--- End Diff ---\n`);
    }
  });

  const footer = `\n============================================================`;
  const updateMsg = `To update expected outputs: npm run test:generate`;
  const diffMsg = `To view full diff: check tests/outputs/ directory`;
  const logMsg = `Detailed log saved to: ${logFile}`;
  const footer2 = `============================================================\n`;
  
  console.log(footer);
  console.log(updateMsg);
  console.log(diffMsg);
  console.log(logMsg);
  console.log(footer2);
  
  log(footer);
  log(updateMsg);
  log(diffMsg);
  log(footer2);
  log(`Test run completed at: ${new Date().toISOString()}`);
  
  saveLog();
  process.exit(1);
} else {
  const successMsg = `\n🎉 All tests passed! Extension is ready for publish.\n`;
  console.log(successMsg);
  log(successMsg);
  log(`Test run completed at: ${new Date().toISOString()}`);
  saveLog();
}
