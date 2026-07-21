'use strict';

/**
 * Minimal in-memory replacement for the parts of the VS Code API that the
 * formatter core touches. Used only by the bundled standalone CLI so the entire
 * formatter can run as a single self-contained script (no `vscode` module, no
 * VS Code host).
 *
 * The formatter reads configuration through `workspace.getConfiguration(...)`.
 * The CLI supplies the effective overrides for the current run via
 * {@link __setOverrides} before formatting; unspecified keys fall back to the
 * default passed by the caller (i.e. the extension defaults from getConfig).
 */

let overrides = {};

function __setOverrides(next) {
  overrides = next || {};
}

const configuration = {
  get(key, defaultValue) {
    return Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] : defaultValue;
  },
  // Nothing is reported as "explicitly set"; indentSize flows through tabSize.
  inspect() { return {}; }
};

const workspace = {
  getConfiguration() { return configuration; }
};

const TextEdit = {
  replace: (range, newText) => ({ range, newText })
};

class Position {
  constructor(line, character) {
    this.line = line;
    this.character = character;
  }
}

class Range {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }
}

module.exports = { __setOverrides, workspace, TextEdit, Position, Range };
