'use strict';

/**
 * Bundles the standalone CLI (cli/standalone.js) + the compiled formatter into a
 * single self-contained file: standalone/verigood-fmt.js
 *
 * The `vscode` import used by the formatter is redirected to a small local shim
 * so the bundle has no external dependencies and can run with plain Node.
 *
 * Run via: npm run build:cli  (which compiles TypeScript first)
 */

const path = require('path');
const esbuild = require('esbuild');

const shimPath = path.resolve(__dirname, 'cli', 'vscode-shim.js');

esbuild.build({
  entryPoints: [path.resolve(__dirname, 'cli', 'standalone.js')],
  bundle: true,
  platform: 'node',
  target: 'node16',
  outfile: path.resolve(__dirname, 'standalone', 'verigood-fmt.js'),
  banner: { js: '#!/usr/bin/env node' },
  legalComments: 'none',
  plugins: [
    {
      name: 'vscode-shim',
      setup(build) {
        build.onResolve({ filter: /^vscode$/ }, () => ({ path: shimPath }));
      }
    }
  ]
})
  .then(() => {
    console.log('Bundled standalone CLI -> standalone/verigood-fmt.js');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
