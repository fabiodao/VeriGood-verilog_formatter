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

console.log('Generating expected outputs with appropriate settings...\n');

const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.v')).sort();
let generated = 0;

files.forEach(file => {
  try {
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

    // Clear all formatter-related cache
    Object.keys(require.cache).forEach(key => {
      if (key.includes('formatter')) {
        delete require.cache[key];
      }
    });

    const { formatVerilogText } = require('../dist/formatter/index');

    const inputPath = path.join(inputDir, file);
    const expectedPath = path.join(expectedDir, file);
    const input = fs.readFileSync(inputPath, 'utf8');
    const output = formatVerilogText(input, 2);
    fs.writeFileSync(expectedPath, output);

    const setting = indentAlways ? 'indentAlways:true' : 'indentAlways:false';
    console.log(`✓ Generated: ${file} (${setting})`);
    generated++;

    // Restore require and clear cache again
    Module.prototype.require = originalRequire;
    Object.keys(require.cache).forEach(key => {
      if (key.includes('formatter')) {
        delete require.cache[key];
      }
    });
  } catch (error) {
    console.error(`✗ Error generating ${file}:`, error.message);
  }
});

console.log(`\n============================================================`);
console.log(`Generated: ${generated} files`);
console.log(`✓ All expected outputs generated successfully!`);
