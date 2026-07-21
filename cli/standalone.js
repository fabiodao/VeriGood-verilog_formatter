'use strict';

/**
 * Bundle entry point for the standalone single-file CLI.
 *
 * esbuild bundles this file together with the compiled formatter and the local
 * `vscode` shim (see esbuild.config.js) into `standalone/verigood-fmt.js`, a
 * single self-contained script with no external dependencies.
 *
 * This file is not meant to be run directly from source (it resolves `vscode`
 * to the shim only through the bundler). Use `npm run build:cli`.
 */

// Resolved to cli/vscode-shim.js by the esbuild plugin.
const vscode = require('vscode');
// Bundled into the output file by esbuild.
const { formatVerilogText } = require('../dist/formatter/index.js');
const { run } = require('./runner');

function makeFormatter(overrides, indentSize) {
  vscode.__setOverrides(overrides);
  return (text) => formatVerilogText(text, indentSize);
}

process.exit(run(process.argv.slice(2), makeFormatter));
