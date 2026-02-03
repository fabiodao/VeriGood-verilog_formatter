const fs = require('fs');
const Module = require('module');

// Mock vscode - specifically for test 05, we need indentAlwaysBlocks = true
const origReq = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === 'vscode') {
    return {
      workspace: { getConfiguration: () => ({
        get: (k,d) => {
          if (k === 'indentAlwaysBlocks') return true;  // Enable for this test
          if (k === 'formatModuleInstantiations') return true;
          return d;
        },
        inspect: () => ({})
      }) },
      TextEdit: { replace: (r,t) => ({range:r, newText:t}) },
      Position: class { constructor(l,c) { this.line=l; this.character=c; } },
      Range: class { constructor(s,e) { this.start=s; this.end=e; } }
    };
  }
  return origReq.apply(this, arguments);
};

const {formatVerilogText} = require('../dist/formatter/index');
const input = fs.readFileSync('inputs/05_multiline_conditions.v', 'utf8');
const output = formatVerilogText(input, 2);
fs.writeFileSync('expected/05_multiline_conditions.v', output);
console.log('✓ Generated expected/05_multiline_conditions.v (with indentAlwaysBlocks: true)');
