// Generate expected outputs for all test cases
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

console.log('Generating expected outputs...\n');

const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.v')).sort();

let generated = 0;
let errors = 0;

files.forEach(file => {
  try {
    const inputPath = path.join(inputDir, file);
    const expectedPath = path.join(expectedDir, file);

    const input = fs.readFileSync(inputPath, 'utf8');
    const output = formatVerilogText(input, 2);

    fs.writeFileSync(expectedPath, output);
    console.log(`✓ Generated: ${file}`);
    generated++;
  } catch (error) {
    console.error(`✗ Failed: ${file} - ${error.message}`);
    errors++;
  }
});

console.log(`\n${'='.repeat(60)}`);
console.log(`Generated: ${generated} files`);
if (errors > 0) {
  console.log(`Errors: ${errors} files`);
  process.exit(1);
} else {
  console.log('✓ All expected outputs generated successfully!');
}
