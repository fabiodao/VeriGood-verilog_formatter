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
  '06_assignments.v': { indentAlwaysBlocks: false },
  '07_wire_reg_declarations.v': { indentAlwaysBlocks: false },
  '08_parameters_ports.v': { indentAlwaysBlocks: false },
  '09_comments_edge_cases.v': { indentAlwaysBlocks: true },
  '10_parameter_alignment.v': { indentAlwaysBlocks: false },
  '11_nested_ifdefs.v': { indentAlwaysBlocks: false }
};

const inputDir = path.join(__dirname, 'inputs');
const expectedDir = path.join(__dirname, 'expected');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║        Verilog Formatter - Comprehensive Test Suite        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Check if expected outputs exist
if (!fs.existsSync(expectedDir) || fs.readdirSync(expectedDir).length === 0) {
  console.error('⚠  Expected outputs not found. Run "npm run test:generate" first.\n');
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
      console.log(`⚠  SKIP: ${testName} (no expected output)`);
      return;
    }

    const config = testConfig[file] || { indentAlwaysBlocks: false };
    const indentAlways = config.indentAlwaysBlocks;

    // Mock vscode with appropriate settings for this test
    const originalRequire = Module.prototype.require;
    Module.prototype.require = function(id) {
      if (id === 'vscode') {
        return {
          workspace: {
            getConfiguration: () => ({
              get: (k, d) => {
                if (k === 'indentAlwaysBlocks') return indentAlways;
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

    // Clear cache and load formatter with new mock
    delete require.cache[require.resolve('../dist/formatter/index')];
    const { formatVerilogText } = require('../dist/formatter/index');

    const input = fs.readFileSync(inputPath, 'utf8');
    const expected = fs.readFileSync(expectedPath, 'utf8');
    const actual = formatVerilogText(input, 2);

    // Restore require
    Module.prototype.require = originalRequire;

    if (actual === expected) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
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
    console.log(`✗ ERROR: ${testName} - ${error.message}`);
    failed++;
  }
});

console.log(`\n============================================================`);
console.log(`Total:  ${files.length} tests`);
console.log(`Passed: ${passed} ✓`);
console.log(`Failed: ${failed} ✗`);
console.log(`============================================================`);

if (failed > 0) {
  console.log(`\n╔════════════════════════════════════════════════════════════╗`);
  console.log(`║                      FAILURE DETAILS                       ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝\n`);

  failures.forEach((failure, index) => {
    console.log(`\n[${index + 1}] ${failure.testName} (${failure.file})`);
    console.log(`------------------------------------------------------------`);

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
      console.log(`First difference at line ${firstDiff + 1}:`);
      console.log(`  Expected: "${expectedLines[firstDiff] || ''}"`);
      console.log(`  Actual:   "${actualLines[firstDiff] || ''}"`);

      const start = Math.max(0, firstDiff - 2);
      const end = Math.min(expectedLines.length, firstDiff + 3);
      console.log(`\nContext (lines ${start + 1}-${end + 1}):`);
      for (let i = start; i < end; i++) {
        const marker = i === firstDiff ? '>' : ' ';
        console.log(`  ${marker} E[${i + 1}]: "${expectedLines[i] || ''}"`);
        console.log(`  ${marker} A[${i + 1}]: "${actualLines[i] || ''}"`);
      }
    }
  });

  console.log(`\n============================================================`);
  console.log(`To update expected outputs: npm run test:generate`);
  console.log(`To view full diff: check tests/outputs/ directory`);
  console.log(`============================================================\n`);
  process.exit(1);
} else {
  console.log(`\n🎉 All tests passed! Extension is ready for publish.\n`);
}
