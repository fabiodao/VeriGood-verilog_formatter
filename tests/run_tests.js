// Comprehensive test runner for Verilog formatter
const fs = require('fs');
const path = require('path');
const Module = require('module');

// Mock vscode module
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === 'vscode') {
    const Position = class {
      constructor(line, character) {
        this.line = line;
        this.character = character;
      }
    };

    const Range = class {
      constructor(start, end) {
        this.start = start;
        this.end = end;
      }
    };

    return {
      workspace: {
        getConfiguration: () => ({
          get: (k, d) => ({
            indentAlwaysBlocks: true,
            enforceBeginEnd: true,
            indentCaseStatements: true,
            formatModuleHeaders: true,
            formatModuleInstantiations: true,
            alignAssignments: true,
            alignWireDeclSemicolons: true,
            alignParameters: true,
            alignPortList: true,
            annotateIfdefComments: true,
            removeTrailingWhitespace: true,
            maxBlankLines: 1
          })[k] !== undefined ? ({
            indentAlwaysBlocks: true,
            enforceBeginEnd: true,
            indentCaseStatements: true,
            formatModuleHeaders: true,
            formatModuleInstantiations: true,
            alignAssignments: true,
            alignWireDeclSemicolons: true,
            alignParameters: true,
            alignPortList: true,
            annotateIfdefComments: true,
            removeTrailingWhitespace: true,
            maxBlankLines: 1
          })[k] : d,
          inspect: () => ({})
        })
      },
      TextEdit: {
        replace: (range, text) => ({ range, newText: text })
      },
      Position: Position,
      Range: Range
    };
  }
  return originalRequire.apply(this, arguments);
};

const { formatVerilogText } = require('../dist/formatter/index');

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

    const input = fs.readFileSync(inputPath, 'utf8');
    const expected = fs.readFileSync(expectedPath, 'utf8');
    const actual = formatVerilogText(input, 2);

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
    failures.push({
      file,
      testName,
      error: error.message
    });
  }
});

console.log('\n' + '='.repeat(60));
console.log(`Total:  ${files.length} tests`);
console.log(`Passed: ${passed} ✓`);
console.log(`Failed: ${failed} ✗`);
console.log('='.repeat(60));

// Show detailed failure information
if (failures.length > 0) {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      FAILURE DETAILS                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  failures.forEach((failure, idx) => {
    console.log(`\n[${idx + 1}] ${failure.testName} (${failure.file})`);
    console.log('-'.repeat(60));

    if (failure.error) {
      console.log(`Error: ${failure.error}`);
    } else {
      // Show first difference
      const actualLines = failure.actual.split('\n');
      const expectedLines = failure.expected.split('\n');
      const maxLines = Math.max(actualLines.length, expectedLines.length);

      let firstDiff = -1;
      for (let i = 0; i < maxLines; i++) {
        if (actualLines[i] !== expectedLines[i]) {
          firstDiff = i;
          break;
        }
      }

      if (firstDiff >= 0) {
        console.log(`First difference at line ${firstDiff + 1}:`);
        console.log(`  Expected: "${expectedLines[firstDiff] || '(empty)'}"`);
        console.log(`  Actual:   "${actualLines[firstDiff] || '(empty)'}"`);

        // Show context
        const contextStart = Math.max(0, firstDiff - 2);
        const contextEnd = Math.min(maxLines, firstDiff + 3);
        console.log(`\nContext (lines ${contextStart + 1}-${contextEnd}):`);
        for (let i = contextStart; i < contextEnd; i++) {
          const marker = i === firstDiff ? '>' : ' ';
          const expected = (expectedLines[i] || '').replace(/\t/g, '→');
          const actual = (actualLines[i] || '').replace(/\t/g, '→');
          if (i === firstDiff) {
            console.log(`  ${marker} E[${i + 1}]: "${expected}"`);
            console.log(`  ${marker} A[${i + 1}]: "${actual}"`);
          }
        }
      }
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('To update expected outputs: npm run test:generate');
  console.log('To view full diff: check tests/outputs/ directory');
  console.log('='.repeat(60) + '\n');

  process.exit(1);
} else {
  console.log('\n🎉 All tests passed! Extension is ready for publish.\n');
  process.exit(0);
}
