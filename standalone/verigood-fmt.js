#!/usr/bin/env node
"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __normalizeEqSpacing = (s) => {
  const masks = [];
  let masked = s.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"/g, (m) => {
    masks.push(m);
    return "\0" + (masks.length - 1) + "\0";
  });
  masked = masked.replace(/([^=!<>])\s*=\s*([^=])/g, "$1 = $2");
  masked = masked.replace(/([^<])\s*<=\s*/g, "$1 <= ");
  return masked.replace(/\0(\d+)\0/g, (_m, i) => masks[+i]);
};
var __splitTopLevelAssign = (s) => {
  let depth = 0;
  let inStr = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === "/" && s[i + 1] === "/") break;
    if (ch === "(" || ch === "[" || ch === "{") {
      depth++;
      continue;
    }
    if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
      continue;
    }
    if (depth !== 0) continue;
    if (ch === "=") {
      const prev = s[i - 1];
      if (s[i + 1] === "=") {
        i++;
        continue;
      }
      if (prev === "!" || prev === ">" || prev === "=") continue;
      if (prev === "<") return [s, s.slice(0, i - 1).trim(), "<=", s.slice(i + 1).trim()];
      return [s, s.slice(0, i).trim(), "=", s.slice(i + 1).trim()];
    }
  }
  return null;
};
var __declVarKind = (s) => {
  return "signal";
};

// cli/vscode-shim.js
var require_vscode_shim = __commonJS({
  "cli/vscode-shim.js"(exports2, module2) {
    "use strict";
    var overrides = {};
    function __setOverrides(next) {
      overrides = next || {};
    }
    var configuration = {
      get(key, defaultValue) {
        return Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] : defaultValue;
      },
      // Nothing is reported as "explicitly set"; indentSize flows through tabSize.
      inspect() {
        return {};
      }
    };
    var workspace = {
      getConfiguration() {
        return configuration;
      }
    };
    var TextEdit = {
      replace: (range, newText) => ({ range, newText })
    };
    var Position = class {
      constructor(line, character) {
        this.line = line;
        this.character = character;
      }
    };
    var Range = class {
      constructor(start, end) {
        this.start = start;
        this.end = end;
      }
    };
    module2.exports = { __setOverrides, workspace, TextEdit, Position, Range };
  }
});

// dist/formatter/types.js
var require_types = __commonJS({
  "dist/formatter/types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DEFAULT_CONFIG = void 0;
    exports2.resolveConfig = resolveConfig;
    exports2.getConfig = getConfig;
    exports2.hasAnyFeatureEnabled = hasAnyFeatureEnabled;
    var vscode2 = require_vscode_shim();
    exports2.DEFAULT_CONFIG = {
      indentSize: 2,
      maxBlankLines: 1,
      alignPortList: true,
      alignParameters: true,
      wrapPortList: true,
      lineLength: 160,
      removeTrailingWhitespace: true,
      alignAssignments: true,
      alignWireDeclSemicolons: true,
      commentColumn: 0,
      formatModuleInstantiations: true,
      formatModuleHeaders: true,
      indentAlwaysBlocks: true,
      enforceBeginEnd: true,
      indentCaseStatements: true,
      annotateIfdefComments: true,
      enableUVMFormatting: true,
      uvmLineLength: 100
    };
    function resolveConfig(overrides = {}) {
      const cfg = { ...exports2.DEFAULT_CONFIG };
      Object.keys(overrides).forEach((key) => {
        const value = overrides[key];
        if (value !== void 0) {
          cfg[key] = value;
        }
      });
      return cfg;
    }
    function getConfig(options) {
      const wcfg = vscode2.workspace.getConfiguration("verilogFormatter");
      let indentSize;
      const configuredIndentSize = wcfg.inspect("indentSize");
      if (configuredIndentSize && (configuredIndentSize.workspaceValue !== void 0 || configuredIndentSize.globalValue !== void 0 || configuredIndentSize.workspaceFolderValue !== void 0)) {
        indentSize = wcfg.get("indentSize", exports2.DEFAULT_CONFIG.indentSize);
      } else {
        indentSize = (options == null ? void 0 : options.tabSize) !== void 0 ? options.tabSize : exports2.DEFAULT_CONFIG.indentSize;
      }
      return resolveConfig({
        indentSize,
        maxBlankLines: wcfg.get("maxBlankLines", exports2.DEFAULT_CONFIG.maxBlankLines),
        alignPortList: wcfg.get("alignPortList", exports2.DEFAULT_CONFIG.alignPortList),
        alignParameters: wcfg.get("alignParameters", exports2.DEFAULT_CONFIG.alignParameters),
        wrapPortList: wcfg.get("wrapPortList", exports2.DEFAULT_CONFIG.wrapPortList),
        lineLength: wcfg.get("lineLength", exports2.DEFAULT_CONFIG.lineLength),
        removeTrailingWhitespace: wcfg.get("removeTrailingWhitespace", exports2.DEFAULT_CONFIG.removeTrailingWhitespace),
        alignAssignments: wcfg.get("alignAssignments", exports2.DEFAULT_CONFIG.alignAssignments),
        alignWireDeclSemicolons: wcfg.get("alignWireDeclSemicolons", exports2.DEFAULT_CONFIG.alignWireDeclSemicolons),
        commentColumn: wcfg.get("commentColumn", exports2.DEFAULT_CONFIG.commentColumn),
        formatModuleInstantiations: wcfg.get("formatModuleInstantiations", exports2.DEFAULT_CONFIG.formatModuleInstantiations),
        formatModuleHeaders: wcfg.get("formatModuleHeaders", exports2.DEFAULT_CONFIG.formatModuleHeaders),
        indentAlwaysBlocks: wcfg.get("indentAlwaysBlocks", exports2.DEFAULT_CONFIG.indentAlwaysBlocks),
        enforceBeginEnd: wcfg.get("enforceBeginEnd", exports2.DEFAULT_CONFIG.enforceBeginEnd),
        indentCaseStatements: wcfg.get("indentCaseStatements", exports2.DEFAULT_CONFIG.indentCaseStatements),
        annotateIfdefComments: wcfg.get("annotateIfdefComments", exports2.DEFAULT_CONFIG.annotateIfdefComments),
        enableUVMFormatting: wcfg.get("enableUVMFormatting", exports2.DEFAULT_CONFIG.enableUVMFormatting),
        uvmLineLength: wcfg.get("uvmLineLength", exports2.DEFAULT_CONFIG.uvmLineLength)
      });
    }
    function hasAnyFeatureEnabled(cfg) {
      return cfg.removeTrailingWhitespace || cfg.maxBlankLines < 100 || cfg.alignAssignments || cfg.alignWireDeclSemicolons || cfg.alignParameters || cfg.alignPortList || cfg.formatModuleHeaders || cfg.formatModuleInstantiations || cfg.indentAlwaysBlocks || cfg.enforceBeginEnd || cfg.indentCaseStatements || cfg.annotateIfdefComments || cfg.commentColumn > 0;
    }
  }
});

// dist/formatter/utils/comments.js
var require_comments = __commonJS({
  "dist/formatter/utils/comments.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.applyCommentColumn = applyCommentColumn;
    exports2.wrapComment = wrapComment;
    function applyCommentColumn(line, cfg) {
      if (cfg.commentColumn <= 0)
        return line;
      const idx = line.indexOf("//");
      if (idx === -1)
        return line;
      const prefix = line.substring(0, idx).replace(/\s+$/, "");
      const comment = line.substring(idx).replace(/\/\/\s?/, "// ");
      if (prefix.length >= cfg.commentColumn)
        return prefix + " " + comment;
      const spaces = " ".repeat(cfg.commentColumn - prefix.length);
      return prefix + spaces + comment;
    }
    function wrapComment(line, maxLen) {
      const m = line.match(/^(\s*\/\/)(\s*)(.*)$/);
      if (!m)
        return line;
      const lead = m[1] + (m[2] || "");
      const text = m[3];
      if (line.length <= maxLen)
        return line;
      const words = text.split(/\s+/);
      const lines = [];
      let current = "";
      words.forEach((w) => {
        if (lead.length + current.length + w.length + 1 > maxLen) {
          lines.push(lead + current.trim());
          current = w + " ";
        } else {
          current += w + " ";
        }
      });
      if (current.trim().length)
        lines.push(lead + current.trim());
      return lines.join("\n");
    }
  }
});

// dist/formatter/utils/uvmDetection.js
var require_uvmDetection = __commonJS({
  "dist/formatter/utils/uvmDetection.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.isUVMCode = isUVMCode;
    exports2.getUVMConfigOverrides = getUVMConfigOverrides;
    function isUVMCode(text) {
      const uvmMacros = [
        "`uvm_component_utils",
        "`uvm_object_utils",
        "`uvm_field_",
        "`uvm_info",
        "`uvm_error",
        "`uvm_warning",
        "`uvm_fatal",
        "`uvm_do",
        "`uvm_create",
        "`uvm_send",
        "`uvm_analysis_imp"
      ];
      for (const macro of uvmMacros) {
        if (text.includes(macro)) {
          return true;
        }
      }
      const uvmBaseClasses = [
        "extends uvm_component",
        "extends uvm_test",
        "extends uvm_env",
        "extends uvm_agent",
        "extends uvm_driver",
        "extends uvm_monitor",
        "extends uvm_scoreboard",
        "extends uvm_sequence",
        "extends uvm_sequence_item",
        "extends uvm_object",
        "extends uvm_subscriber"
      ];
      for (const baseClass of uvmBaseClasses) {
        if (text.includes(baseClass)) {
          return true;
        }
      }
      const uvmPhases = [
        "function void build_phase",
        "function void connect_phase",
        "task run_phase",
        "function void end_of_elaboration_phase",
        "function void start_of_simulation_phase",
        "task main_phase",
        "task pre_reset_phase",
        "task reset_phase",
        "task post_reset_phase"
      ];
      for (const phase of uvmPhases) {
        if (text.includes(phase)) {
          return true;
        }
      }
      const uvmFactoryCalls = [
        "uvm_config_db",
        "uvm_factory",
        "set_type_override",
        "set_inst_override",
        "create_component",
        "create_object"
      ];
      for (const call of uvmFactoryCalls) {
        if (text.includes(call)) {
          return true;
        }
      }
      return false;
    }
    function getUVMConfigOverrides(cfg) {
      return {
        // Don't override indentSize - use editor's setting
        lineLength: cfg.uvmLineLength || 100,
        // UVM standard is 100 chars
        enforceBeginEnd: true,
        // Always use begin/end in UVM
        alignAssignments: false,
        // UVM style guide discourages alignment
        alignWireDeclSemicolons: false,
        // No alignment in UVM
        maxBlankLines: 1
        // More compact than RTL
      };
    }
  }
});

// dist/formatter/uvmFormatter.js
var require_uvmFormatter = __commonJS({
  "dist/formatter/uvmFormatter.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.formatUVMDocument = formatUVMDocument;
    exports2.formatUVMRange = formatUVMRange;
    var vscode2 = require_vscode_shim();
    function formatUVMDocument(document, options) {
      const cfg = getUVMConfig(options);
      const original = document.getText();
      const lines = original.split(/\r?\n/);
      const eol = original.includes("\r\n") ? "\r\n" : "\n";
      const formatted = formatUVMLines(lines, cfg);
      const newText = formatted.join(eol) + (original.endsWith("\n") || original.endsWith("\r\n") ? eol : "");
      if (newText === original) {
        return [];
      }
      const fullRange = new vscode2.Range(document.positionAt(0), document.positionAt(original.length));
      return [vscode2.TextEdit.replace(fullRange, newText)];
    }
    function getUVMConfig(options) {
      const wcfg = vscode2.workspace.getConfiguration("verilogFormatter");
      const indentSize = (options == null ? void 0 : options.tabSize) !== void 0 ? options.tabSize : 4;
      return {
        indentSize,
        lineLength: wcfg.get("uvmLineLength", 100),
        removeTrailingWhitespace: wcfg.get("removeTrailingWhitespace", true)
      };
    }
    function formatUVMLines(lines, cfg) {
      const indented = applyUVMIndentation(lines, cfg);
      const aligned = alignUVMAssignments(indented, cfg);
      const normalized = normalizeUVMSpacing(aligned);
      return normalized;
    }
    function normalizeUVMSpacing(lines) {
      return lines.map((line) => {
        var _a;
        const trimmed = line.trim();
        if (trimmed === "" || trimmed.startsWith("//")) {
          return line;
        }
        const indent = ((_a = line.match(/^(\s*)/)) == null ? void 0 : _a[1]) || "";
        const isAssignment = /^[^(]*\s*(<=|=)(?!=)\s+/.test(trimmed) && !/^(if|for|while|foreach|repeat|wait)\s*\(/.test(trimmed);
        if (isAssignment) {
          const parts = trimmed.split(/("[^"]*"|'[^']*')/);
          let normalized = "";
          for (let i = 0; i < parts.length; i++) {
            if (i % 2 === 0) {
              let part = parts[i];
              part = normalizeOperators(part);
              normalized += part;
            } else {
              normalized += parts[i];
            }
          }
          return indent + normalized;
        } else {
          const parts = trimmed.split(/("[^"]*"|'[^']*')/);
          let normalized = "";
          for (let i = 0; i < parts.length; i++) {
            if (i % 2 === 0) {
              let part = parts[i];
              part = part.replace(/\s+;/g, ";");
              part = normalizeParentheses(part);
              part = normalizeOperators(part);
              normalized += part;
            } else {
              normalized += parts[i];
            }
          }
          return indent + normalized;
        }
      });
    }
    function normalizeOperators(text) {
      let result = text;
      const twoCharOps = ["==", "!=", "<=", ">=", "&&", "||", "<<", ">>", "<<<", ">>>"];
      for (const op of twoCharOps) {
        const escapedOp = op.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`(\\S)${escapedOp}(\\S)`, "g");
        result = result.replace(regex, `$1 ${op} $2`);
      }
      const singleOps = ["+", "-", "*", "/", "%", "<", ">"];
      for (const op of singleOps) {
        const escapedOp = op.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`(\\w|\\))${escapedOp}(\\w|\\()`, "g");
        result = result.replace(regex, `$1 ${op} $2`);
      }
      return result;
    }
    function normalizeParentheses(text) {
      let result = text;
      result = result.replace(/(\w)\s+\(/g, "$1(");
      return result;
    }
    function applyUVMIndentation(lines, cfg) {
      const result = [];
      let indentLevel = 0;
      let singleStatementDepth = 0;
      const indent = " ".repeat(cfg.indentSize);
      const nameStack = [];
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const trimmed = line.trim();
        if (trimmed === "") {
          result.push("");
          continue;
        }
        if (cfg.removeTrailingWhitespace) {
          line = line.replace(/\s+$/, "");
        }
        if (singleStatementDepth > 0) {
          if (!/^(if|else|for|while|foreach|repeat)\b/.test(trimmed)) {
            indentLevel = Math.max(0, indentLevel - singleStatementDepth);
            singleStatementDepth = 0;
          }
        }
        if (/^endclass\b/.test(trimmed)) {
          indentLevel = Math.max(0, indentLevel - 1);
          const info = nameStack.pop();
          const annotated = info && info.type === "class" ? `endclass : ${info.name}` : trimmed;
          result.push(indent.repeat(indentLevel) + annotated);
          continue;
        } else if (/^endfunction\b/.test(trimmed)) {
          indentLevel = Math.max(0, indentLevel - 1);
          const info = nameStack.pop();
          const annotated = info && info.type === "function" ? `endfunction : ${info.name}` : trimmed;
          result.push(indent.repeat(indentLevel) + annotated);
          continue;
        } else if (/^endtask\b/.test(trimmed)) {
          indentLevel = Math.max(0, indentLevel - 1);
          const info = nameStack.pop();
          const annotated = info && info.type === "task" ? `endtask : ${info.name}` : trimmed;
          result.push(indent.repeat(indentLevel) + annotated);
          continue;
        } else if (/^(endmodule|endcase|endpackage|endinterface)\b/.test(trimmed)) {
          indentLevel = Math.max(0, indentLevel - 1);
        } else if (/^end\b/.test(trimmed) && !/^end(class|function|task|module|case|package|interface)/.test(trimmed)) {
          indentLevel = Math.max(0, indentLevel - 1);
        } else if (/^\}/.test(trimmed)) {
          indentLevel = Math.max(0, indentLevel - 1);
        }
        const indentedLine = indent.repeat(indentLevel) + trimmed;
        result.push(indentedLine);
        if (/^class\b/.test(trimmed)) {
          const match = trimmed.match(/^class\s+(\w+)/);
          if (match) {
            nameStack.push({ type: "class", name: match[1] });
          }
          indentLevel++;
        } else if (/^(virtual\s+)?function\b/.test(trimmed)) {
          const match = trimmed.match(/^(?:virtual\s+)?function\s+(?:\w+\s+)?(\w+)\s*\(/);
          if (match) {
            nameStack.push({ type: "function", name: match[1] });
          }
          indentLevel++;
        } else if (/^(virtual\s+)?task\b/.test(trimmed)) {
          const match = trimmed.match(/^(?:virtual\s+)?task\s+(\w+)\s*\(/);
          if (match) {
            nameStack.push({ type: "task", name: match[1] });
          }
          indentLevel++;
        } else if (/^constraint\b/.test(trimmed) && /\{\s*$/.test(trimmed)) {
          indentLevel++;
        } else if (/\bbegin\b/.test(trimmed) && !trimmed.startsWith("//")) {
          indentLevel++;
        } else if (/^(if|else|for|while|foreach|repeat)\b/.test(trimmed) && !/\bbegin\b/.test(trimmed) && !/;\s*$/.test(trimmed)) {
          indentLevel++;
          singleStatementDepth++;
        }
      }
      return result;
    }
    function alignUVMAssignments(lines, cfg) {
      var _a;
      const result = [];
      let inFunction = false;
      let inTask = false;
      let inConstraint = false;
      let pendingAssignments = [];
      function flushAssignments() {
        var _a2;
        if (pendingAssignments.length === 0)
          return;
        const alignSemicolons = true;
        let maxLhsWidth = 0;
        let maxRhsWidth = 0;
        for (const item of pendingAssignments) {
          const trimmed = item.line.trim();
          if (/^\/\//.test(trimmed))
            continue;
          const match = trimmed.match(/^(.+?)\s*(==|>=|<=|=)(?!=)\s*(.+?)\s*(;?)\s*$/);
          if (match) {
            const lhs = match[1].trim().replace(/\s+/g, " ");
            const rhs = match[3].trim();
            maxLhsWidth = Math.max(maxLhsWidth, lhs.length);
            if (alignSemicolons) {
              maxRhsWidth = Math.max(maxRhsWidth, rhs.length);
            }
          }
        }
        for (const item of pendingAssignments) {
          const trimmed = item.line.trim();
          const lineIndent = ((_a2 = item.line.match(/^\s*/)) == null ? void 0 : _a2[0]) || "";
          if (/^\/\//.test(trimmed)) {
            result.push(item.line);
            continue;
          }
          const match = trimmed.match(/^(.+?)\s*(==|>=|<=|=)(?!=)\s*(.+?)\s*(;?)\s*$/);
          if (match) {
            const lhs = match[1].trim().replace(/\s+/g, " ");
            const op = match[2];
            const rhs = match[3].trim();
            const semi = match[4];
            const paddedLhs = lhs.padEnd(maxLhsWidth);
            if (alignSemicolons) {
              const paddedRhs = rhs.padEnd(maxRhsWidth);
              const aligned = `${lineIndent}${paddedLhs} ${op} ${paddedRhs}${semi}`;
              result.push(aligned);
            } else {
              const aligned = `${lineIndent}${paddedLhs} ${op} ${rhs}${semi}`;
              result.push(aligned);
            }
          } else {
            result.push(item.line);
          }
        }
        pendingAssignments = [];
      }
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (/^(virtual\s+)?function\b/.test(trimmed)) {
          flushAssignments();
          inFunction = true;
          result.push(line);
          continue;
        } else if (/^(virtual\s+)?task\b/.test(trimmed)) {
          flushAssignments();
          inTask = true;
          result.push(line);
          continue;
        } else if (/^constraint\b/.test(trimmed)) {
          flushAssignments();
          inConstraint = true;
          result.push(line);
          continue;
        } else if (/^(endfunction|endtask)\b/.test(trimmed)) {
          flushAssignments();
          inFunction = false;
          inTask = false;
          result.push(line);
          continue;
        } else if (/^\}/.test(trimmed)) {
          flushAssignments();
          inConstraint = false;
          result.push(line);
          continue;
        }
        if ((inFunction || inTask || inConstraint) && /\s*(<=|=|==)\s*/.test(trimmed) && !/^\/\//.test(trimmed)) {
          if (/^(if|else|for|while|foreach|repeat|return|wait)\b/.test(trimmed)) {
            flushAssignments();
            const lineIndent = ((_a = line.match(/^\s*/)) == null ? void 0 : _a[0]) || "";
            const normalized = lineIndent + trimmed.replace(/\s+;/g, ";");
            result.push(normalized);
            continue;
          }
          pendingAssignments.push({ idx: i, line });
          continue;
        } else if (pendingAssignments.length > 0) {
          if (trimmed === "" || /^\/\//.test(trimmed)) {
            pendingAssignments.push({ idx: i, line });
            continue;
          } else {
            flushAssignments();
            result.push(line);
            continue;
          }
        }
        result.push(line);
      }
      flushAssignments();
      return result;
    }
    function formatUVMRange(document, range, options) {
      const cfg = getUVMConfig(options);
      const fullText = document.getText();
      const lines = fullText.split(/\r?\n/);
      const startLine = range.start.line;
      const endLine = range.end.line;
      const selectedLines = lines.slice(startLine, endLine + 1);
      const eol = fullText.includes("\r\n") ? "\r\n" : "\n";
      const includesDeclaration = selectedLines.some((line) => {
        const trimmed = line.trim();
        return /^(class|(virtual\s+)?(function|task)|module|package|interface)\b/.test(trimmed);
      });
      let startIndentLevel = 0;
      const nameStack = [];
      let inFunction = false;
      let inTask = false;
      let inConstraint = false;
      if (!includesDeclaration) {
        const minIndent = Math.min(...selectedLines.filter((line) => line.trim() !== "").map((line) => {
          var _a;
          return ((_a = line.match(/^(\s*)/)) == null ? void 0 : _a[1].length) || 0;
        }));
        const normalizedLines = selectedLines.map((line) => {
          var _a;
          if (line.trim() === "")
            return "";
          const currentIndent = ((_a = line.match(/^(\s*)/)) == null ? void 0 : _a[1].length) || 0;
          const relativeIndent = Math.max(0, currentIndent - minIndent);
          return " ".repeat(relativeIndent) + line.trim();
        });
        const formatted2 = formatUVMLines(normalizedLines, cfg);
        const restoredIndent = formatted2.map((line) => {
          if (line.trim() === "")
            return "";
          return " ".repeat(minIndent) + line;
        });
        const newText2 = restoredIndent.join(eol);
        const originalText2 = selectedLines.join(eol);
        if (newText2 === originalText2) {
          return [];
        }
        const rangeStart2 = new vscode2.Position(startLine, 0);
        const rangeEnd2 = new vscode2.Position(endLine, lines[endLine].length);
        const editRange2 = new vscode2.Range(rangeStart2, rangeEnd2);
        return [vscode2.TextEdit.replace(editRange2, newText2)];
      }
      for (let i = 0; i < startLine; i++) {
        const trimmed = lines[i].trim();
        if (/^(class|(virtual\s+)?(function|task)|module|package|interface)\b/.test(trimmed)) {
          startIndentLevel++;
          if (/^class\b/.test(trimmed)) {
            const match = trimmed.match(/^class\s+(\w+)/);
            if (match)
              nameStack.push({ type: "class", name: match[1] });
          } else if (/^(virtual\s+)?function\b/.test(trimmed)) {
            const match = trimmed.match(/^(?:virtual\s+)?function\s+(?:\w+\s+)?(\w+)\s*\(/);
            if (match)
              nameStack.push({ type: "function", name: match[1] });
            inFunction = true;
          } else if (/^(virtual\s+)?task\b/.test(trimmed)) {
            const match = trimmed.match(/^(?:virtual\s+)?task\s+(\w+)\s*\(/);
            if (match)
              nameStack.push({ type: "task", name: match[1] });
            inTask = true;
          }
        } else if (/^constraint\b/.test(trimmed) && /\{\s*$/.test(trimmed)) {
          startIndentLevel++;
          inConstraint = true;
        } else if (/\bbegin\b/.test(trimmed) && !trimmed.startsWith("//")) {
          startIndentLevel++;
        }
        if (/^(endclass|endfunction|endtask|endmodule|endcase|endpackage|endinterface)\b/.test(trimmed)) {
          startIndentLevel = Math.max(0, startIndentLevel - 1);
          if (/^endfunction\b/.test(trimmed)) {
            nameStack.pop();
            inFunction = false;
          } else if (/^endtask\b/.test(trimmed)) {
            nameStack.pop();
            inTask = false;
          } else if (/^endclass\b/.test(trimmed)) {
            nameStack.pop();
          }
        } else if (/^end\b/.test(trimmed) && !/^end(class|function|task|module|case|package|interface)/.test(trimmed)) {
          startIndentLevel = Math.max(0, startIndentLevel - 1);
        } else if (/^\}/.test(trimmed)) {
          startIndentLevel = Math.max(0, startIndentLevel - 1);
          inConstraint = false;
        }
      }
      const formatted = formatUVMLinesWithStartIndent(selectedLines, cfg, startIndentLevel, nameStack, inFunction, inTask, inConstraint);
      const newText = formatted.join(eol);
      const originalText = selectedLines.join(eol);
      if (newText === originalText) {
        return [];
      }
      const rangeStart = new vscode2.Position(startLine, 0);
      const rangeEnd = new vscode2.Position(endLine, lines[endLine].length);
      const editRange = new vscode2.Range(rangeStart, rangeEnd);
      return [vscode2.TextEdit.replace(editRange, newText)];
    }
    function formatUVMLinesWithStartIndent(lines, cfg, startIndentLevel, nameStack = [], initialInFunction = false, initialInTask = false, initialInConstraint = false) {
      const indented = applyUVMIndentationWithContext(lines, cfg, startIndentLevel, [...nameStack]);
      const aligned = alignUVMAssignmentsForRange(indented, cfg, initialInFunction, initialInTask, initialInConstraint);
      const normalized = normalizeUVMSpacing(aligned);
      return normalized;
    }
    function applyUVMIndentationWithContext(lines, cfg, startIndentLevel, nameStack) {
      const result = [];
      let indentLevel = startIndentLevel;
      let singleStatementDepth = 0;
      const indent = " ".repeat(cfg.indentSize);
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const trimmed = line.trim();
        if (trimmed === "") {
          result.push("");
          continue;
        }
        if (cfg.removeTrailingWhitespace) {
          line = line.replace(/\s+$/, "");
        }
        if (singleStatementDepth > 0) {
          if (!/^(if|else|for|while|foreach|repeat)\b/.test(trimmed)) {
            indentLevel = Math.max(0, indentLevel - singleStatementDepth);
            singleStatementDepth = 0;
          }
        }
        if (/^endclass\b/.test(trimmed)) {
          indentLevel = Math.max(0, indentLevel - 1);
          const info = nameStack.pop();
          const annotated = info && info.type === "class" ? `endclass : ${info.name}` : trimmed;
          result.push(indent.repeat(indentLevel) + annotated);
          continue;
        } else if (/^endfunction\b/.test(trimmed)) {
          indentLevel = Math.max(0, indentLevel - 1);
          const info = nameStack.pop();
          const annotated = info && info.type === "function" ? `endfunction : ${info.name}` : trimmed;
          result.push(indent.repeat(indentLevel) + annotated);
          continue;
        } else if (/^endtask\b/.test(trimmed)) {
          indentLevel = Math.max(0, indentLevel - 1);
          const info = nameStack.pop();
          const annotated = info && info.type === "task" ? `endtask : ${info.name}` : trimmed;
          result.push(indent.repeat(indentLevel) + annotated);
          continue;
        } else if (/^(endmodule|endcase|endpackage|endinterface)\b/.test(trimmed)) {
          indentLevel = Math.max(0, indentLevel - 1);
        } else if (/^end\b/.test(trimmed) && !/^end(class|function|task|module|case|package|interface)/.test(trimmed)) {
          indentLevel = Math.max(0, indentLevel - 1);
        } else if (/^\}/.test(trimmed)) {
          indentLevel = Math.max(0, indentLevel - 1);
        }
        const indentedLine = indent.repeat(indentLevel) + trimmed;
        result.push(indentedLine);
        if (/^class\b/.test(trimmed)) {
          const match = trimmed.match(/^class\s+(\w+)/);
          if (match) {
            nameStack.push({ type: "class", name: match[1] });
          }
          indentLevel++;
        } else if (/^(virtual\s+)?function\b/.test(trimmed)) {
          const match = trimmed.match(/^(?:virtual\s+)?function\s+(?:\w+\s+)?(\w+)\s*\(/);
          if (match) {
            nameStack.push({ type: "function", name: match[1] });
          }
          indentLevel++;
        } else if (/^(virtual\s+)?task\b/.test(trimmed)) {
          const match = trimmed.match(/^(?:virtual\s+)?task\s+(\w+)\s*\(/);
          if (match) {
            nameStack.push({ type: "task", name: match[1] });
          }
          indentLevel++;
        } else if (/^constraint\b/.test(trimmed) && /\{\s*$/.test(trimmed)) {
          indentLevel++;
        } else if (/\bbegin\b/.test(trimmed) && !trimmed.startsWith("//")) {
          indentLevel++;
        } else if (/^(if|else|for|while|foreach|repeat)\b/.test(trimmed) && !/\bbegin\b/.test(trimmed) && !/;\s*$/.test(trimmed)) {
          indentLevel++;
          singleStatementDepth++;
        }
      }
      return result;
    }
    function alignUVMAssignmentsForRange(lines, cfg, initialInFunction, initialInTask, initialInConstraint) {
      var _a;
      const result = [];
      let inFunction = initialInFunction;
      let inTask = initialInTask;
      let inConstraint = initialInConstraint;
      let pendingAssignments = [];
      function flushAssignments() {
        var _a2;
        if (pendingAssignments.length === 0)
          return;
        const alignSemicolons = true;
        let maxLhsWidth = 0;
        let maxRhsWidth = 0;
        for (const item of pendingAssignments) {
          const trimmed = item.line.trim();
          if (/^\/\//.test(trimmed))
            continue;
          const match = trimmed.match(/^(.+?)\s*(==|>=|<=|=)(?!=)\s*(.+?)\s*(;?)\s*$/);
          if (match) {
            const lhs = match[1].trim().replace(/\s+/g, " ");
            const rhs = match[3].trim();
            maxLhsWidth = Math.max(maxLhsWidth, lhs.length);
            if (alignSemicolons) {
              maxRhsWidth = Math.max(maxRhsWidth, rhs.length);
            }
          }
        }
        for (const item of pendingAssignments) {
          const trimmed = item.line.trim();
          const lineIndent = ((_a2 = item.line.match(/^\s*/)) == null ? void 0 : _a2[0]) || "";
          if (/^\/\//.test(trimmed)) {
            result.push(item.line);
            continue;
          }
          const match = trimmed.match(/^(.+?)\s*(==|>=|<=|=)(?!=)\s*(.+?)\s*(;?)\s*$/);
          if (match) {
            const lhs = match[1].trim().replace(/\s+/g, " ");
            const op = match[2];
            const rhs = match[3].trim();
            const semi = match[4];
            const paddedLhs = lhs.padEnd(maxLhsWidth);
            if (alignSemicolons) {
              const paddedRhs = rhs.padEnd(maxRhsWidth);
              const aligned = `${lineIndent}${paddedLhs} ${op} ${paddedRhs}${semi}`;
              result.push(aligned);
            } else {
              const aligned = `${lineIndent}${paddedLhs} ${op} ${rhs}${semi}`;
              result.push(aligned);
            }
          } else {
            result.push(item.line);
          }
        }
        pendingAssignments = [];
      }
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (/^(virtual\s+)?function\b/.test(trimmed)) {
          flushAssignments();
          inFunction = true;
          result.push(line);
          continue;
        } else if (/^(virtual\s+)?task\b/.test(trimmed)) {
          flushAssignments();
          inTask = true;
          result.push(line);
          continue;
        } else if (/^constraint\b/.test(trimmed)) {
          flushAssignments();
          inConstraint = true;
          result.push(line);
          continue;
        } else if (/^(endfunction|endtask)\b/.test(trimmed)) {
          flushAssignments();
          inFunction = false;
          inTask = false;
          result.push(line);
          continue;
        } else if (/^\}/.test(trimmed)) {
          flushAssignments();
          inConstraint = false;
          result.push(line);
          continue;
        }
        if ((inFunction || inTask || inConstraint) && /\s*(<=|=|==)\s*/.test(trimmed) && !/^\/\//.test(trimmed)) {
          if (/^(if|else|for|while|foreach|repeat|return|wait)\b/.test(trimmed)) {
            flushAssignments();
            const lineIndent = ((_a = line.match(/^\s*/)) == null ? void 0 : _a[0]) || "";
            const normalized = lineIndent + trimmed.replace(/\s+;/g, ";");
            result.push(normalized);
            continue;
          }
          pendingAssignments.push({ idx: i, line });
          continue;
        } else if (pendingAssignments.length > 0) {
          if (trimmed === "" || /^\/\//.test(trimmed)) {
            pendingAssignments.push({ idx: i, line });
            continue;
          } else {
            flushAssignments();
            result.push(line);
            continue;
          }
        }
        result.push(line);
      }
      flushAssignments();
      return result;
    }
  }
});

// dist/formatter/alignment/assignments.js
var require_assignments = __commonJS({
  "dist/formatter/alignment/assignments.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.alignAssignmentGroup = alignAssignmentGroup;
    function alignAssignmentGroup(lines) {
      var _a;
      const firstCodeLine = lines.find((l) => !/^\s*\/\//.test(l) && !/^\s*`(ifn?def|else|endif)\b/.test(l) && l.trim() !== "") || lines[0];
      const baseIndent = ((_a = firstCodeLine.match(/^\s*/)) == null ? void 0 : _a[0]) || "";
      const merged = [];
      let current = [];
      lines.forEach((l) => {
        const trimmed = l.trim();
        const isComment = /^\/\//.test(trimmed);
        const isBlank = trimmed === "";
        const isIfdef = /^`(ifn?def|else|endif)\b/.test(trimmed);
        if (isComment || isBlank || isIfdef) {
          if (current.length) {
            merged.push(current);
            current = [];
          }
          merged.push([l]);
          return;
        }
        current.push(l);
        if (/;\s*(\/\/.*)?$/.test(l)) {
          merged.push(current);
          current = [];
        }
      });
      if (current.length)
        merged.push(current);
      const rows = merged.map((stLines) => {
        const first = stLines[0];
        const commentMatch = first.match(/(.*?)(\/\/.*)$/);
        const commentFirst = commentMatch ? commentMatch[2].replace(/\/\/\s?/, "// ").trim() : "";
        const bodyFirst = (commentMatch ? commentMatch[1] : first).trim();
        const m = __splitTopLevelAssign(bodyFirst);
        if (m) {
          const lhsRaw = m[1].trim();
          const isAssign = /^assign\b/.test(lhsRaw);
          const assignRemainder = isAssign ? lhsRaw.replace(/^assign\s+/, "").trim() : "";
          const rhsAll = [];
          const firstRhs = m[3];
          rhsAll.push(firstRhs.replace(/;\s*$/, ""));
          stLines.slice(1).forEach((sl) => {
            const trimmed = sl.replace(/;\s*(\/\/.*)?$/, "");
            rhsAll.push(trimmed.trim());
          });
          let endComment = commentFirst;
          const lastLine = stLines[stLines.length - 1];
          const lastCommentMatch = lastLine !== first ? lastLine.match(/(.*?)(\/\/.*)$/) : null;
          if (lastCommentMatch)
            endComment = lastCommentMatch[2].replace(/\/\/\s?/, "// ").trim();
          const endsWithSemicolon = /;\s*(\/\/.*)?$/.test(lastLine);
          return { rawLines: stLines, lhs: lhsRaw, op: m[2], rhsLines: rhsAll, comment: endComment, hasOp: true, isAssign, assignRemainder, endsWithSemicolon };
        }
        const combined = stLines.join(" ");
        return { rawLines: stLines, lhs: combined.trim(), op: "", rhsLines: [], comment: "", hasOp: false, isAssign: false, assignRemainder: "", endsWithSemicolon: /;\s*(\/\/.*)?$/.test(stLines[stLines.length - 1]) };
      });
      const opRows = rows.filter((r) => r.hasOp);
      if (!opRows.length) {
        return rows.flatMap((r) => r.rawLines.map((rl) => rl.trim() ? baseIndent + rl.trim() : ""));
      }
      const assignRemainderLengths = opRows.filter((r) => r.isAssign).map((r) => r.assignRemainder.length);
      const maxAssignRemainder = assignRemainderLengths.length ? Math.max(...assignRemainderLengths) : 0;
      const maxNonAssignLhs = opRows.filter((r) => !r.isAssign).length ? Math.max(...opRows.filter((r) => !r.isAssign).map((r) => r.lhs.length)) : 0;
      const assignPrefixLen = 7;
      const targetLhsWidth = Math.max(assignPrefixLen + maxAssignRemainder, maxNonAssignLhs);
      const singleLineOpRows = opRows.filter((r) => r.rhsLines.length === 1);
      const maxCodeLen = singleLineOpRows.length ? Math.max(...singleLineOpRows.map((r) => {
        const lhs = r.isAssign ? "assign " + r.assignRemainder.padEnd(targetLhsWidth - assignPrefixLen) : r.lhs.padEnd(targetLhsWidth);
        return (baseIndent + lhs + " " + r.op + " " + r.rhsLines[0].trim() + ";").length;
      })) : 0;
      const out = [];
      rows.forEach((r) => {
        if (!r.hasOp) {
          r.rawLines.forEach((rl) => out.push(rl.trim() ? baseIndent + rl.trim() : ""));
          return;
        }
        const lhsDisplay = r.isAssign ? "assign " + r.assignRemainder.padEnd(targetLhsWidth - assignPrefixLen) : r.lhs.padEnd(targetLhsWidth);
        const prefix = baseIndent + lhsDisplay + " " + r.op + " ";
        if (r.rhsLines.length === 1) {
          const code = prefix + r.rhsLines[0].trim() + ";";
          out.push(r.comment ? code.padEnd(maxCodeLen) + " " + r.comment : code);
        } else {
          out.push(prefix + r.rhsLines[0].trim());
        }
        if (r.rhsLines.length > 1) {
          const contIndentLen = prefix.length;
          const contIndentSpaces = " ".repeat(contIndentLen);
          const lastIdx = r.rhsLines.length - 1;
          r.rhsLines.slice(1).forEach((rl, idx) => {
            const isLastLine = idx === lastIdx - 1;
            let lineCore = contIndentSpaces + rl.trim();
            if (isLastLine) {
              lineCore = lineCore + ";" + (r.comment ? " " + r.comment : "");
            }
            out.push(lineCore);
          });
        }
      });
      return out;
    }
  }
});

// dist/formatter/alignment/wires.js
var require_wires = __commonJS({
  "dist/formatter/alignment/wires.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.alignWireDeclGroup = alignWireDeclGroup;
    function alignWireDeclGroup(lines, cfg) {
      function isDeclStart(l) {
        return /^\s*(wire|reg|logic|input|output|inout|integer|genvar)\b/.test(l);
      }
      function isMacro(l) {
        return /^\s*`(ifn?def|else|endif)\b/.test(l);
      }
      function isComment(l) {
        return /^\s*\/\//.test(l);
      }
      const blocks = [];
      let collecting = false;
      let current = [];
      lines.forEach((l) => {
        if (!collecting && isDeclStart(l)) {
          current = [l];
          collecting = !/;\s*(\/\/.*)?$/.test(l);
          if (!collecting) {
            blocks.push(current);
            current = [];
          }
          return;
        }
        if (collecting) {
          current.push(l);
          if (/;\s*(\/\/.*)?$/.test(l)) {
            blocks.push(current);
            current = [];
            collecting = false;
          }
          return;
        }
        if (isComment(l) || isMacro(l)) {
          blocks.push([l]);
          return;
        }
        blocks.push([l]);
      });
      if (current.length)
        blocks.push(current);
      const rows = blocks.map((block) => {
        var _a;
        const first = block[0];
        const indent = ((_a = first.match(/^\s*/)) == null ? void 0 : _a[0]) || "";
        const isPass = isComment(first) || isMacro(first) || !isDeclStart(first);
        if (isPass) {
          return { indent, keyword: "", typeKeyword: "", range: "", name: "", unpackedDim: "", initLines: [], hasInit: false, comment: "", originalLines: block, isMultiNames: false, namesList: "", isPassthrough: true };
        }
        const commentMatchLast = block[block.length - 1].match(/(.*?)(\/\/.*)$/);
        const endComment = commentMatchLast ? commentMatchLast[2].replace(/\/\/\s?/, "// ").trim() : "";
        const bodyFirst = first.replace(/(\/\/.*)$/, "").trim();
        const declMatch = bodyFirst.match(/^(input|output|inout|wire|reg|logic|integer|genvar)\s*(?:(wire|reg|logic)\s*)?(?:(signed|unsigned)\s*)?(\[[^\]]+\])?\s*(.*)$/);
        if (declMatch) {
          const firstKeyword = declMatch[1];
          const secondKeyword = declMatch[2] || "";
          const signKeyword = declMatch[3] || "";
          const keyword = /^(input|output|inout)$/.test(firstKeyword) ? firstKeyword : firstKeyword;
          const typeKeyword = /^(input|output|inout)$/.test(firstKeyword) ? secondKeyword + (signKeyword ? " " + signKeyword : "") : signKeyword;
          const range = declMatch[4] ? declMatch[4].trim() : "";
          let remainder = declMatch[5].trim();
          const hasEquals = /\=/.test(remainder);
          if (!hasEquals && /,/.test(remainder)) {
            const namesList = remainder.replace(/;\s*$/, "") + (block.length > 1 ? " " + block.slice(1, -1).map((b) => b.trim()).join(" ") : "");
            return { indent, keyword, typeKeyword, range, name: "", unpackedDim: "", initLines: [], hasInit: false, comment: endComment, originalLines: block, isMultiNames: true, namesList: namesList.replace(/;\s*$/, ""), isPassthrough: false };
          }
          let name = remainder.replace(/;\s*$/, "").trim();
          let unpackedDim = "";
          const unpackedMatch = name.match(/^([A-Za-z_][A-Za-z0-9_$]*)(\s*\[.+\])$/);
          if (unpackedMatch) {
            name = unpackedMatch[1];
            unpackedDim = " " + unpackedMatch[2].trim();
          }
          let initLines = [];
          let hasInit = false;
          if (hasEquals) {
            const nm = remainder.match(/^([A-Za-z_][A-Za-z0-9_$]*)\s*=\s*(.*)$/);
            if (nm) {
              name = nm[1];
              const firstInit = nm[2].replace(/;\s*$/, "");
              initLines = [firstInit];
              hasInit = true;
            }
          }
          if (block.length > 1) {
            block.slice(1).forEach((ln) => {
              const trimmed = ln.replace(/;\s*(\/\/.*)?$/, "").trim();
              if (trimmed.length)
                initLines.push(trimmed);
            });
            if (initLines.length)
              hasInit = true;
          }
          for (let i = 0; i < initLines.length - 1; i++) {
            if (initLines[i].trim() === "{") {
              initLines[i] = "{" + (initLines[i + 1] ? " " + initLines[i + 1] : "");
              initLines.splice(i + 1, 1);
              i--;
            }
          }
          for (let i = 1; i < initLines.length; i++) {
            if (/^}[,;]?\s*$/.test(initLines[i].trim())) {
              initLines[i - 1] = initLines[i - 1] + " " + initLines[i].trim();
              initLines.splice(i, 1);
              i--;
            }
          }
          return { indent, keyword, typeKeyword, range, name, unpackedDim, initLines, hasInit, comment: endComment, originalLines: block, isMultiNames: false, namesList: "", isPassthrough: false };
        }
        return { indent, keyword: "", typeKeyword: "", range: "", name: first.trim(), unpackedDim: "", initLines: [], hasInit: false, comment: endComment, originalLines: block, isMultiNames: false, namesList: "", isPassthrough: true };
      });
      const decls = rows.filter((r) => r.keyword);
      if (!decls.length) {
        return rows.flatMap((r) => r.originalLines);
      }
      const allSimple = decls.every((r) => !r.range && !r.typeKeyword && !r.hasInit && !r.isMultiNames && !r.unpackedDim);
      if (allSimple) {
        const maxSimpleName = Math.max(...decls.map((r) => r.name.length));
        const keywords = decls.map((r) => r.keyword);
        const allSameKeyword = keywords.every((k) => k === keywords[0]);
        let alreadyAligned2 = true;
        for (const r of rows) {
          if (r.isPassthrough && !r.keyword)
            continue;
          const keywordPart = allSameKeyword ? r.keyword : r.keyword.padEnd(Math.max(...decls.map((d) => d.keyword.length)));
          const nameCol = r.name.padEnd(maxSimpleName);
          const expectedLine = r.indent + keywordPart + " " + nameCol + ";" + (r.comment ? " " + r.comment : "");
          if (r.originalLines[0] !== expectedLine) {
            alreadyAligned2 = false;
            break;
          }
        }
        if (alreadyAligned2) {
          return rows.flatMap((r) => r.originalLines);
        }
        return rows.flatMap((r) => {
          if (r.isPassthrough && !r.keyword) {
            return r.originalLines;
          }
          const keywordPart = allSameKeyword ? r.keyword : r.keyword.padEnd(Math.max(...decls.map((d) => d.keyword.length)));
          const nameCol = r.name.padEnd(maxSimpleName);
          const line = r.indent + keywordPart + " " + nameCol + ";" + (r.comment ? " " + r.comment : "");
          return [line];
        });
      }
      const multiNameRows = decls.filter((r) => r.isMultiNames);
      const singleRows = decls.filter((r) => !r.isMultiNames);
      const maxKeyword = Math.max(...decls.map((r) => r.keyword.length));
      const maxTypeKeyword = Math.max(0, ...decls.map((r) => r.typeKeyword.length));
      const maxRange = Math.max(0, ...decls.map((r) => r.range.length));
      const maxNamesList = multiNameRows.length ? Math.max(...multiNameRows.map((r) => r.namesList.length)) : 0;
      const declsWithoutInit = singleRows.filter((r) => !r.hasInit);
      const maxSingleNameNoInit = declsWithoutInit.length ? Math.max(...declsWithoutInit.map((r) => r.name.length)) : 0;
      const multiNamesLengths = multiNameRows.map((r) => {
        const keywordCol = r.keyword.padEnd(maxKeyword);
        const typeKeywordCol = maxTypeKeyword ? r.typeKeyword.padEnd(maxTypeKeyword) : "";
        const rangeCol = maxRange ? r.range.padStart(maxRange) : "";
        const namesCol = r.namesList.padEnd(maxNamesList);
        const segs = [keywordCol];
        if (r.typeKeyword)
          segs.push(typeKeywordCol);
        if (maxRange)
          segs.push(rangeCol);
        segs.push(namesCol);
        return segs.join(" ").length;
      });
      const noInitLengths = declsWithoutInit.map((r) => {
        const keywordCol = r.keyword.padEnd(maxKeyword);
        const typeKeywordCol = maxTypeKeyword ? r.typeKeyword.padEnd(maxTypeKeyword) : "";
        const rangeCol = maxRange ? r.range.padStart(maxRange) : "";
        const nameCol = r.name.padEnd(maxSingleNameNoInit);
        const segs = [keywordCol];
        if (r.typeKeyword)
          segs.push(typeKeywordCol);
        if (maxRange)
          segs.push(rangeCol);
        segs.push(nameCol);
        return segs.join(" ").length + r.unpackedDim.length;
      });
      const maxBodyLenNoInit = [...multiNamesLengths, ...noInitLengths].length ? Math.max(...[...multiNamesLengths, ...noInitLengths]) : 0;
      const declsWithInit = singleRows.filter((r) => r.hasInit);
      const maxSingleNameWithInit = declsWithInit.length ? Math.max(...declsWithInit.map((r) => r.name.length)) : 0;
      const maxDeclBeforeEquals = declsWithInit.length ? Math.max(...declsWithInit.map((r) => {
        const keywordCol = r.keyword.padEnd(maxKeyword);
        const typeKeywordCol = maxTypeKeyword ? r.typeKeyword.padEnd(maxTypeKeyword) : "";
        const rangeCol = maxRange ? r.range.padStart(maxRange) : "";
        const nameCol = r.name.padEnd(maxSingleNameWithInit);
        const segs = [keywordCol];
        if (r.typeKeyword)
          segs.push(typeKeywordCol);
        if (maxRange)
          segs.push(rangeCol);
        segs.push(nameCol);
        return segs.join(" ").length + r.unpackedDim.length;
      })) : 0;
      const maxSemicolonPos = Math.max(...rows.filter((r) => r.keyword || r.isPassthrough).map((r) => {
        if (r.isPassthrough && !r.keyword)
          return 0;
        const keywordCol = r.keyword.padEnd(maxKeyword);
        const typeKeywordCol = maxTypeKeyword ? r.typeKeyword.padEnd(maxTypeKeyword) : "";
        const rangeCol = maxRange ? r.range.padStart(maxRange) : "";
        if (r.isMultiNames) {
          const namesCol = r.namesList.trim();
          const segs = [keywordCol];
          if (r.typeKeyword)
            segs.push(typeKeywordCol);
          if (maxRange)
            segs.push(rangeCol);
          segs.push(namesCol);
          const pos = r.indent.length + segs.join(" ").length;
          return pos + 1 + (r.comment ? r.comment.length + 1 : 0) <= cfg.lineLength ? pos : 0;
        } else {
          const nameCol = r.name;
          const segs = [keywordCol];
          if (r.typeKeyword)
            segs.push(typeKeywordCol);
          if (maxRange)
            segs.push(rangeCol);
          segs.push(nameCol);
          let baseDecl = segs.join(" ") + r.unpackedDim;
          if (r.hasInit) {
            if (r.initLines.length <= 1) {
              const paddedBase = baseDecl.padEnd(maxDeclBeforeEquals);
              const initValue = (r.initLines[0] || "").trim();
              const pos = r.indent.length + paddedBase.length + " = ".length + initValue.length;
              return pos + 1 + (r.comment ? r.comment.length + 1 : 0) <= cfg.lineLength ? pos : 0;
            } else {
              return 0;
            }
          } else {
            const pos = r.indent.length + baseDecl.length;
            return pos + 1 + (r.comment ? r.comment.length + 1 : 0) <= cfg.lineLength ? pos : 0;
          }
        }
      }));
      let alreadyAligned = true;
      let declIndex = 0;
      for (const r of rows) {
        if (r.isPassthrough && !r.keyword)
          continue;
        const expectedKeywordCol = r.keyword.padEnd(maxKeyword);
        const expectedTypeKeywordCol = maxTypeKeyword ? r.typeKeyword.padEnd(maxTypeKeyword) : "";
        const expectedRangeCol = maxRange ? r.range.padStart(maxRange) : "";
        if (r.isMultiNames) {
          const expectedNamesCol = r.namesList.trim();
          const segs = [expectedKeywordCol];
          if (r.typeKeyword)
            segs.push(expectedTypeKeywordCol);
          if (maxRange)
            segs.push(expectedRangeCol);
          segs.push(expectedNamesCol);
          const lineBeforeSemi = r.indent + segs.join(" ");
          const padding = " ".repeat(Math.max(0, maxSemicolonPos - lineBeforeSemi.length));
          const expectedLine = lineBeforeSemi + padding + ";" + (r.comment ? " " + r.comment : "");
          if (r.originalLines[0] !== expectedLine) {
            alreadyAligned = false;
            break;
          }
        } else {
          const expectedNameCol = r.name;
          const segs = [expectedKeywordCol];
          if (r.typeKeyword)
            segs.push(expectedTypeKeywordCol);
          if (maxRange)
            segs.push(expectedRangeCol);
          segs.push(expectedNameCol);
          let baseDecl = segs.join(" ");
          if (r.hasInit) {
            const paddedBase = baseDecl.padEnd(maxDeclBeforeEquals);
            const initPart = " = " + (r.initLines[0] || "").trim();
            if (r.initLines.length <= 1) {
              const lineBeforeSemi = r.indent + paddedBase + initPart;
              const padding = " ".repeat(Math.max(0, maxSemicolonPos - lineBeforeSemi.length));
              const expectedFirstLine = lineBeforeSemi + padding + ";" + (r.comment ? " " + r.comment : "");
              if (r.originalLines[0] !== expectedFirstLine) {
                alreadyAligned = false;
                break;
              }
            } else {
              const expectedFirstLine = r.indent + paddedBase + initPart;
              if (r.originalLines[0] !== expectedFirstLine) {
                alreadyAligned = false;
                break;
              }
            }
            if (r.initLines.length > 1) {
              const contIndentLen = (r.indent + paddedBase + " = ").length;
              const contIndentSpaces = " ".repeat(contIndentLen);
              const lastIdx = r.initLines.length - 1;
              for (let i2 = 1; i2 < r.initLines.length; i2++) {
                const trimmed = r.initLines[i2].trim();
                const isLast = i2 === lastIdx;
                let expectedCont = contIndentSpaces + trimmed;
                if (isLast) {
                  expectedCont += ";" + (r.comment ? " " + r.comment : "");
                }
                if (r.originalLines[i2] !== expectedCont) {
                  alreadyAligned = false;
                  break;
                }
              }
              if (!alreadyAligned)
                break;
            }
          } else {
            const dimPart = r.unpackedDim ? r.unpackedDim.trim() : "";
            const lineBeforeDim = r.indent + baseDecl;
            const naturalSemiPos = lineBeforeDim.length + (dimPart ? 1 + dimPart.length : 0);
            const wouldExceedLimit = naturalSemiPos + 1 + (r.comment ? r.comment.length + 1 : 0) > cfg.lineLength;
            let expectedLine;
            if (wouldExceedLimit) {
              expectedLine = lineBeforeDim + (dimPart ? " " + dimPart : "") + ";" + (r.comment ? " " + r.comment : "");
            } else if (dimPart) {
              const gap = " ".repeat(Math.max(1, maxSemicolonPos - dimPart.length - lineBeforeDim.length));
              expectedLine = lineBeforeDim + gap + dimPart + ";" + (r.comment ? " " + r.comment : "");
            } else {
              const padding = " ".repeat(Math.max(0, maxSemicolonPos - lineBeforeDim.length));
              expectedLine = lineBeforeDim + padding + ";" + (r.comment ? " " + r.comment : "");
            }
            if (r.originalLines[0] !== expectedLine) {
              alreadyAligned = false;
              break;
            }
          }
        }
        declIndex++;
      }
      if (alreadyAligned) {
        return rows.flatMap((r) => r.originalLines);
      }
      const out = [];
      rows.forEach((r) => {
        if (r.isPassthrough && !r.keyword) {
          r.originalLines.forEach((ln) => out.push(ln));
          return;
        }
        const keywordCol = r.keyword.padEnd(maxKeyword);
        const typeKeywordCol = maxTypeKeyword ? r.typeKeyword.padEnd(maxTypeKeyword) : "";
        const rangeCol = maxRange ? r.range.padStart(maxRange) : "";
        if (r.isMultiNames) {
          const namesCol = r.namesList.trim();
          const segs = [keywordCol];
          if (r.typeKeyword)
            segs.push(typeKeywordCol);
          if (maxRange)
            segs.push(rangeCol);
          segs.push(namesCol);
          const lineBeforeSemi = r.indent + segs.join(" ");
          const wouldExceedLimit = lineBeforeSemi.length + 1 + (r.comment ? r.comment.length + 1 : 0) > cfg.lineLength;
          if (wouldExceedLimit) {
            out.push(lineBeforeSemi + ";" + (r.comment ? " " + r.comment : ""));
          } else {
            const padding = " ".repeat(Math.max(0, maxSemicolonPos - lineBeforeSemi.length));
            out.push(lineBeforeSemi + padding + ";" + (r.comment ? " " + r.comment : ""));
          }
        } else {
          const nameCol = r.name;
          const segs = [keywordCol];
          if (r.typeKeyword)
            segs.push(typeKeywordCol);
          if (maxRange)
            segs.push(rangeCol);
          segs.push(nameCol);
          let baseDecl = segs.join(" ");
          if (r.hasInit) {
            const paddedBase = baseDecl.padEnd(maxDeclBeforeEquals);
            const initPart = " = " + (r.initLines[0] || "").trim();
            if (r.initLines.length <= 1) {
              const lineBeforeSemi = r.indent + paddedBase + initPart;
              const wouldExceedLimit = lineBeforeSemi.length + 1 + (r.comment ? r.comment.length + 1 : 0) > cfg.lineLength;
              if (wouldExceedLimit) {
                const firstLine = lineBeforeSemi + ";" + (r.comment ? " " + r.comment : "");
                out.push(firstLine);
              } else {
                const padding = " ".repeat(Math.max(0, maxSemicolonPos - lineBeforeSemi.length));
                const firstLine = lineBeforeSemi + padding + ";" + (r.comment ? " " + r.comment : "");
                out.push(firstLine);
              }
            } else {
              const firstLine = r.indent + paddedBase + initPart;
              out.push(firstLine);
            }
            if (r.initLines.length > 1) {
              const contIndentLen = (r.indent + paddedBase + " = ").length;
              const contIndentSpaces = " ".repeat(contIndentLen);
              r.initLines.slice(1).forEach((ln, idx) => {
                const trimmed = ln.trim();
                const isLastInitLine = idx === r.initLines.length - 2;
                let cont = contIndentSpaces + trimmed;
                if (isLastInitLine) {
                  cont += ";" + (r.comment ? " " + r.comment : "");
                }
                out.push(cont);
              });
            }
          } else {
            const dimPart = r.unpackedDim ? r.unpackedDim.trim() : "";
            const lineBeforeDim = r.indent + baseDecl;
            const naturalSemiPos = lineBeforeDim.length + (dimPart ? 1 + dimPart.length : 0);
            const wouldExceedLimit = naturalSemiPos + 1 + (r.comment ? r.comment.length + 1 : 0) > cfg.lineLength;
            if (wouldExceedLimit) {
              const firstLine = lineBeforeDim + (dimPart ? " " + dimPart : "") + ";" + (r.comment ? " " + r.comment : "");
              out.push(firstLine);
            } else if (dimPart) {
              const gap = " ".repeat(Math.max(1, maxSemicolonPos - dimPart.length - lineBeforeDim.length));
              const firstLine = lineBeforeDim + gap + dimPart + ";" + (r.comment ? " " + r.comment : "");
              out.push(firstLine);
            } else {
              const padding = " ".repeat(Math.max(0, maxSemicolonPos - lineBeforeDim.length));
              const firstLine = lineBeforeDim + padding + ";" + (r.comment ? " " + r.comment : "");
              out.push(firstLine);
            }
          }
        }
      });
      return out;
    }
  }
});

// dist/formatter/alignment/parameters.js
var require_parameters = __commonJS({
  "dist/formatter/alignment/parameters.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.alignParameterLines = alignParameterLines;
    function alignParameterLines(lines) {
      var _a;
      if (!lines.length)
        return [];
      const blocks = [];
      let current = [];
      let collecting = false;
      lines.forEach((l) => {
        const startsParam = /^\s*(parameter|localparam)\b/.test(l);
        const isNonParam = /^\s*\/\//.test(l) || /^\s*`(ifn?def|else|endif)\b/.test(l) || /^\s*$/.test(l);
        if (!collecting && startsParam) {
          current = [l];
          collecting = !/;\s*(\/\/.*)?$/.test(l);
          if (!collecting) {
            blocks.push(current);
            current = [];
          }
          return;
        }
        if (collecting) {
          current.push(l);
          if (/;\s*(\/\/.*)?$/.test(l)) {
            blocks.push(current);
            current = [];
            collecting = false;
          }
          return;
        }
        if (isNonParam) {
          blocks.push([l]);
          return;
        }
        blocks.push([l]);
      });
      if (current.length)
        blocks.push(current);
      const parsed = blocks.map((block) => {
        const first = block[0].trim();
        const isNonParam = /^\s*\/\//.test(block[0]) || /^\s*`(ifn?def|else|endif)\b/.test(block[0]) || /^\s*$/.test(block[0]);
        if (isNonParam) {
          return { keyword: "", typeSpec: "", name: "", valueLines: [], comment: "", originalLines: block, hasEq: false, isParam: false };
        }
        const lastLine = block[block.length - 1];
        const commentMatch = lastLine.match(/(.*?)(\/\/.*)$/);
        const comment = commentMatch ? commentMatch[2].replace(/\/\/\s?/, "// ").trim() : "";
        const body = first.replace(/(\/\/.*)$/, "").trim();
        const eqIdx = body.indexOf("=");
        if (eqIdx === -1) {
          return { keyword: "", typeSpec: "", name: body.replace(/;\s*$/, ""), valueLines: [], comment, originalLines: block, hasEq: false, isParam: false };
        }
        const leftPart = body.substring(0, eqIdx).trim();
        const firstValuePart = body.substring(eqIdx + 1).trim().replace(/;\s*$/, "");
        const tokens = leftPart.split(/\s+/);
        let keyword = "";
        if (tokens.length && /^(parameter|localparam)$/.test(tokens[0]))
          keyword = tokens.shift();
        let typeSpec = "";
        let name = "";
        if (tokens.length > 1) {
          typeSpec = tokens.slice(0, -1).join(" ");
          name = tokens[tokens.length - 1];
        } else if (tokens.length === 1) {
          name = tokens[0];
        }
        let valueLines = [firstValuePart];
        if (block.length > 1) {
          block.slice(1).forEach((ln) => {
            const trimmed = ln.replace(/;\s*(\/\/.*)?$/, "").trim();
            if (trimmed.length)
              valueLines.push(trimmed);
          });
        }
        for (let i = 0; i < valueLines.length - 1; i++) {
          if (valueLines[i].trim() === "{") {
            valueLines[i] = "{" + (valueLines[i + 1] ? " " + valueLines[i + 1] : "");
            valueLines.splice(i + 1, 1);
            i--;
          }
        }
        for (let i = 1; i < valueLines.length; i++) {
          if (/^}[,;]?\s*$/.test(valueLines[i].trim())) {
            valueLines[i - 1] = valueLines[i - 1] + " " + valueLines[i].trim();
            valueLines.splice(i, 1);
            i--;
          }
        }
        return { keyword, typeSpec, name, valueLines, comment, originalLines: block, hasEq: true, isParam: true };
      });
      const withEq = parsed.filter((p) => p.hasEq && p.isParam);
      if (!withEq.length)
        return parsed.flatMap((p) => p.originalLines);
      const firstLine = parsed.length > 0 && parsed[0].originalLines.length > 0 ? parsed[0].originalLines[0] : "";
      let baseIndent = ((_a = firstLine.match(/^\s*/)) == null ? void 0 : _a[0]) || "";
      if (baseIndent === "" && /^(parameter|localparam)\b/.test(firstLine.trim())) {
        baseIndent = "  ";
      }
      const leftSegments = withEq.map((p) => {
        const segs = [];
        if (p.keyword)
          segs.push(p.keyword);
        if (p.typeSpec)
          segs.push(p.typeSpec);
        segs.push(p.name);
        return segs.join(" ");
      });
      const maxLeftLen = Math.max(...leftSegments.map((s) => s.length));
      const maxSemicolonPos = Math.max(...withEq.map((p) => {
        if (p.valueLines.length > 1)
          return 0;
        const segs = [];
        if (p.keyword)
          segs.push(p.keyword);
        if (p.typeSpec)
          segs.push(p.typeSpec);
        segs.push(p.name);
        const leftPadded = segs.join(" ").padEnd(maxLeftLen);
        return baseIndent.length + leftPadded.length + 3 + p.valueLines[0].length;
      }));
      const result = [];
      parsed.forEach((p) => {
        if (!p.isParam) {
          result.push(...p.originalLines);
          return;
        }
        if (!p.hasEq) {
          result.push(...p.originalLines);
          return;
        }
        const segs = [];
        if (p.keyword)
          segs.push(p.keyword);
        if (p.typeSpec)
          segs.push(p.typeSpec);
        segs.push(p.name);
        let leftRaw = segs.join(" ");
        leftRaw = leftRaw.padEnd(maxLeftLen);
        if (p.valueLines.length <= 1) {
          const lineBeforeSemi = baseIndent + leftRaw + " = " + p.valueLines[0];
          const padding = " ".repeat(Math.max(0, maxSemicolonPos - lineBeforeSemi.length));
          const firstLine2 = lineBeforeSemi + padding + ";" + (p.comment ? " " + p.comment : "");
          result.push(firstLine2);
        } else {
          const firstLine2 = baseIndent + leftRaw + " = " + p.valueLines[0];
          result.push(firstLine2);
        }
        if (p.valueLines.length > 1) {
          const contIndent = baseIndent + " ".repeat((leftRaw + " = ").length);
          const lastIdx = p.valueLines.length - 1;
          for (let i = 1; i < p.valueLines.length; i++) {
            const isLast = i === lastIdx;
            const contLine = contIndent + p.valueLines[i] + (isLast ? ";" : "") + (isLast && p.comment ? " " + p.comment : "");
            result.push(contLine);
          }
        }
      });
      return result;
    }
  }
});

// dist/formatter/alignment/ports.js
var require_ports = __commonJS({
  "dist/formatter/alignment/ports.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.alignPortDeclLines = alignPortDeclLines;
    function alignPortDeclLines(lines) {
      var _a;
      if (!lines.length)
        return [];
      const baseIndent = ((_a = lines[0].match(/^(\s*)/)) == null ? void 0 : _a[1]) || "";
      const unit = "  ";
      const portDecls = [];
      for (const line of lines) {
        const trimmed = line.trim();
        const m = trimmed.match(/^(input|output|inout)\s+(wire|reg|logic|bit)?\s*(\[[^\]]+\])?\s*([A-Za-z_][A-Za-z0-9_]*(?:\s*,\s*[A-Za-z_][A-Za-z0-9_]*)*)\s*(\/\/.*)?$/);
        if (m) {
          const dir = m[1];
          const type = m[2] || "";
          const range = m[3] || "";
          const names = m[4];
          const comment = m[5] || "";
          for (const name of names.split(",").map((n) => n.trim())) {
            portDecls.push({ dir, type, range, name, comment });
          }
        }
      }
      if (portDecls.length === 0) {
        return lines;
      }
      const maxDir = Math.max(...portDecls.map((p) => p.dir.length));
      const maxType = Math.max(...portDecls.map((p) => p.type.length));
      const maxRange = Math.max(...portDecls.map((p) => p.range.length));
      const maxName = Math.max(...portDecls.map((p) => p.name.length));
      const formatted = [];
      for (const p of portDecls) {
        const dirPadded = p.dir.padEnd(maxDir);
        const typePadded = p.type ? p.type.padEnd(maxType) + " " : "".padEnd(maxType + 1);
        const rangePadded = p.range ? p.range.padStart(maxRange) + " " : "".padEnd(maxRange + 1);
        const namePadded = p.name.padEnd(maxName);
        const line = baseIndent + dirPadded + " " + typePadded + rangePadded + namePadded + ";" + (p.comment ? " " + p.comment : "");
        formatted.push(line);
      }
      return formatted;
    }
  }
});

// dist/formatter/alignment/blockAssignments.js
var require_blockAssignments = __commonJS({
  "dist/formatter/alignment/blockAssignments.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.alignBlockAssignments = alignBlockAssignments;
    function alignCaseItemAssignments(lines) {
      var _a;
      const result = [];
      let i = 0;
      while (i < lines.length) {
        const line = lines[i];
        if (/^\s*case\b/.test(line)) {
          result.push(line);
          i++;
          const caseItemGroups = [];
          let currentGroup = [];
          while (i < lines.length && !/^\s*endcase\b/.test(lines[i])) {
            const itemLine = lines[i];
            const itemTrimmed = itemLine.trim();
            const caseItemMatch = itemTrimmed.match(/^([\w']+|default)\s*:\s*(.+)$/);
            if (caseItemMatch && !itemTrimmed.includes("begin")) {
              const label = caseItemMatch[1];
              const assignment = caseItemMatch[2];
              const indent = ((_a = itemLine.match(/^(\s*)/)) == null ? void 0 : _a[1]) || "";
              const assignMatch = __splitTopLevelAssign(assignment);
              if (assignMatch) {
                const lhs = assignMatch[1].trim();
                const op = assignMatch[2];
                const rhsWithSemi = assignMatch[3];
                const commentMatch = rhsWithSemi.match(/(.*?)(\/\/.*)$/);
                const rhs = commentMatch ? commentMatch[1].trim().replace(/;\s*$/, "") : rhsWithSemi.trim().replace(/;\s*$/, "");
                const comment = commentMatch ? commentMatch[2].trim() : "";
                currentGroup.push({ indent, label, lhs, op, rhs, comment });
                i++;
                continue;
              }
            }
            if (currentGroup.length > 0) {
              caseItemGroups.push(currentGroup);
              currentGroup = [];
            }
            result.push(itemLine);
            i++;
          }
          if (currentGroup.length > 0) {
            caseItemGroups.push(currentGroup);
          }
          caseItemGroups.forEach((group) => {
            const maxLabelLen = Math.max(...group.map((item) => item.label.length));
            const maxLhsLen = Math.max(...group.map((item) => item.lhs.length));
            const codes = group.map((item) => `${item.indent}${item.label.padEnd(maxLabelLen)}: ${item.lhs.padEnd(maxLhsLen)} ${item.op} ${item.rhs};`);
            const maxCodeLen = Math.max(...codes.map((c) => c.length));
            group.forEach((item, idx) => {
              result.push(item.comment ? codes[idx].padEnd(maxCodeLen) + " " + item.comment : codes[idx]);
            });
          });
          if (i < lines.length) {
            result.push(lines[i]);
            i++;
          }
          continue;
        }
        result.push(line);
        i++;
      }
      return result;
    }
    function alignBlockLevelAssignments(lines) {
      var _a, _b;
      const result = [];
      let i = 0;
      while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();
        if (/^\s*if\s*\(/.test(trimmed)) {
          const ifElseResult = handleIfElseAlignment(lines, i);
          ifElseResult.lines.forEach((l) => result.push(l));
          i = ifElseResult.endIdx + 1;
          continue;
        }
        const isAssignment = /^\s*([\w\[\]]+)\s*(<=|=)\s*(.*)$/.test(trimmed) && !trimmed.includes(":") && !/^\s*assign\b/.test(trimmed) && !/^\s*(wire|reg|logic|input|output|inout)\b/.test(trimmed) && !/^\s*for\s*\(/.test(trimmed);
        if (isAssignment) {
          const indent = ((_a = line.match(/^(\s*)/)) == null ? void 0 : _a[1]) || "";
          const assignmentGroup = [];
          while (i < lines.length) {
            const assignLine = lines[i];
            const assignTrimmed = assignLine.trim();
            const assignIndent = ((_b = assignLine.match(/^(\s*)/)) == null ? void 0 : _b[1]) || "";
            if (assignIndent !== indent)
              break;
            if (/^\s*(end|endcase|endmodule)\b/.test(assignTrimmed) || /^\s*\w+\s*:/.test(assignTrimmed)) {
              break;
            }
            const assignMatch = assignTrimmed.match(/^([\w\[\]]+)\s*(<=|=)\s*(.*)$/);
            if (assignMatch && !assignTrimmed.includes(":") && !/^\s*assign\b/.test(assignTrimmed) && !/^\s*(wire|reg|logic|input|output|inout)\b/.test(assignTrimmed) && !/^\s*for\s*\(/.test(assignTrimmed)) {
              const lhs = assignMatch[1].trim();
              const op = assignMatch[2];
              const rhsWithSemi = assignMatch[3];
              const commentMatch = rhsWithSemi.match(/(.*?)(\/\/.*)$/);
              const rhs = commentMatch ? commentMatch[1].trim().replace(/;\s*$/, "") : rhsWithSemi.trim().replace(/;\s*$/, "");
              const comment = commentMatch ? commentMatch[2].trim() : "";
              assignmentGroup.push({ indent, lhs, op, rhs, comment });
              i++;
            } else {
              break;
            }
          }
          if (assignmentGroup.length > 1) {
            const maxLhsLen = Math.max(...assignmentGroup.map((item) => item.lhs.length));
            const codes = assignmentGroup.map((item) => `${item.indent}${item.lhs.padEnd(maxLhsLen)} ${item.op} ${item.rhs};`);
            const maxCodeLen = Math.max(...codes.map((c) => c.length));
            assignmentGroup.forEach((item, idx) => {
              result.push(item.comment ? codes[idx].padEnd(maxCodeLen) + " " + item.comment : codes[idx]);
            });
          } else if (assignmentGroup.length === 1) {
            result.push(lines[i - 1]);
          }
          continue;
        }
        result.push(line);
        i++;
      }
      return result;
    }
    function handleIfElseAlignment(lines, startIdx) {
      var _a;
      const collectedLines = [];
      const assignments = [];
      let i = startIdx;
      let depth = 0;
      let inIfElse = true;
      while (i < lines.length && inIfElse) {
        const line = lines[i];
        const trimmed = line.trim();
        if (/^\s*\w+\s*:/.test(trimmed) && !/^\s*(default|if|else|for|while)\s*:/.test(trimmed)) {
          break;
        }
        if (/\bbegin\b/.test(trimmed) && !/\/\/.*\bbegin\b/.test(line)) {
          depth++;
        }
        collectedLines.push(line);
        const assignMatch = trimmed.match(/^([\w\[\]]+)\s*(<=|=)\s*(.*)$/);
        if (assignMatch && !trimmed.includes(":") && !/^\s*assign\b/.test(trimmed) && !/^\s*(wire|reg|logic|input|output|inout)\b/.test(trimmed) && !/^\s*for\s*\(/.test(trimmed)) {
          const indent = ((_a = line.match(/^(\s*)/)) == null ? void 0 : _a[1]) || "";
          const lhs = assignMatch[1].trim();
          const op = assignMatch[2];
          const rhsWithSemi = assignMatch[3];
          const commentMatch = rhsWithSemi.match(/(.*?)(\/\/.*)$/);
          const rhs = commentMatch ? commentMatch[1].trim().replace(/;\s*$/, "") : rhsWithSemi.trim().replace(/;\s*$/, "");
          const comment = commentMatch ? commentMatch[2].trim() : "";
          assignments.push({ lineIdx: collectedLines.length - 1, indent, lhs, op, rhs, comment });
        }
        i++;
        if (/\bend\b/.test(trimmed) && !/\/\/.*\bend\b/.test(line)) {
          depth--;
          if (depth === 0) {
            if (/\bend\s+else\b/.test(trimmed)) {
              continue;
            } else if (i < lines.length) {
              const nextTrimmed = lines[i].trim();
              if (/^else\b/.test(nextTrimmed)) {
                continue;
              } else {
                inIfElse = false;
              }
            } else {
              inIfElse = false;
            }
          }
        }
      }
      if (assignments.length > 1) {
        const maxLhsLen = Math.max(...assignments.map((a) => a.lhs.length));
        const targetLen = maxLhsLen <= 5 ? 7 : maxLhsLen == 6 ? 6 : maxLhsLen;
        assignments.forEach((a) => {
          const paddedLhs = a.lhs.padEnd(targetLen);
          const alignedLine = `${a.indent}${paddedLhs} ${a.op} ${a.rhs};${a.comment ? " " + a.comment : ""}`;
          collectedLines[a.lineIdx] = alignedLine;
        });
      }
      return { lines: collectedLines, endIdx: i - 1 };
    }
    var __BLOCK_LVALUE = /^[A-Za-z_][A-Za-z0-9_$]*(?:\s*\[[^\]]*\]|\.[A-Za-z_$][A-Za-z0-9_$]*)*$/;
    function parseBlockAssignment(rawLine) {
      var _a;
      const indent = ((_a = rawLine.match(/^(\s*)/)) == null ? void 0 : _a[1]) || "";
      const m = __splitTopLevelAssign(rawLine.trim());
      if (!m) return null;
      const lhs = m[1].trim();
      if (!__BLOCK_LVALUE.test(lhs)) return null;
      // Require exactly one statement: no ';' before the terminator, then only
      // an optional trailing comment. This skips multi-statement lines like
      // "a = 0; b = 0;" which must not be column-aligned on just their first '='.
      const cm = m[3].match(/^([^;]*);(\s*)(\/\/.*)?$/);
      if (!cm) return null;
      const rhs = cm[1].trim();
      if (rhs === "") return null;
      // Preserve the original spacing between ';' and any trailing comment so the
      // realignment only shifts the LHS, keeping the author's comment layout.
      return { indent, lhs, op: m[2], rhs, gap: cm[3] ? cm[2] : "", comment: cm[3] || "" };
    }
    function __scanBlockAssignRhs(s, depth) {
      // Advance bracket depth over one RHS fragment (strings and // comments
      // respected). Stops early at a top-level ';' (statement end) or ',' (which
      // means this is a list body such as a typedef enum, not a single-expression
      // assignment). Returns { depth, stop } where stop is ";", "," or null.
      let inStr = false;
      for (let k = 0; k < s.length; k++) {
        const ch = s[k];
        if (inStr) {
          if (ch === "\\") {
            k++;
            continue;
          }
          if (ch === '"') inStr = false;
          continue;
        }
        if (ch === '"') {
          inStr = true;
          continue;
        }
        if (ch === "/" && s[k + 1] === "/") break;
        if (ch === "(" || ch === "[" || ch === "{") {
          depth++;
          continue;
        }
        if (ch === ")" || ch === "]" || ch === "}") {
          depth--;
          continue;
        }
        if (depth === 0 && ch === ";") return { depth, stop: ";" };
        if (depth === 0 && ch === ",") return { depth, stop: "," };
      }
      return { depth, stop: null };
    }
    function reindentMultilineBlockAssignment(lines, i) {
      var _a;
      const raw = lines[i];
      const indent = ((_a = raw.match(/^(\s*)/)) == null ? void 0 : _a[1]) || "";
      const m = __splitTopLevelAssign(raw.trim());
      if (!m) return null;
      const lhs = m[1].trim();
      if (!__BLOCK_LVALUE.test(lhs)) return null;
      const firstRhs = m[3];
      if (firstRhs === "") return null;
      // The first line must not terminate the statement (single-line assignments
      // are handled above) and must not carry a top-level ',' (that marks a list
      // body such as a typedef enum member, e.g. "NAME = 4'h0,").
      let st = __scanBlockAssignRhs(firstRhs, 0);
      if (st.stop) return null;
      let depth = st.depth;
      if (depth < 0) return null;
      const cont = [];
      let j = i + 1;
      let closed = false;
      while (j < lines.length && cont.length < 64) {
        const t = lines[j].trim();
        if (t === "" || /^[)\]}]*\s*(begin|end|endcase|else|if|for|while|case[xz]?|default|assign|always|initial)\b/.test(t)) break;
        st = __scanBlockAssignRhs(t, depth);
        if (st.stop === ",") return null;
        cont.push(t);
        j++;
        if (st.stop === ";") {
          closed = true;
          break;
        }
        depth = st.depth;
        if (depth < 0) return null;
      }
      if (!closed || cont.length === 0) return null;
      // Continuation lines align to the RHS start column, matching the module-level
      // assign wrapper.
      const contCol = indent.length + lhs.length + 1 + m[2].length + 1;
      const pad = " ".repeat(contCol);
      const out = [`${indent}${lhs} ${m[2]} ${firstRhs}`];
      cont.forEach((t) => out.push(pad + t));
      return { out, next: j };
    }
    function alignConsecutiveBlockAssignments(lines) {
      const result = [];
      let i = 0;
      while (i < lines.length) {
        const parsed = parseBlockAssignment(lines[i]);
        if (!parsed) {
          const ml = reindentMultilineBlockAssignment(lines, i);
          if (ml) {
            ml.out.forEach((l) => result.push(l));
            i = ml.next;
            continue;
          }
          result.push(lines[i]);
          i++;
          continue;
        }
        const group = [parsed];
        let j = i + 1;
        while (j < lines.length) {
          const next = parseBlockAssignment(lines[j]);
          if (!next || next.indent !== parsed.indent) break;
          group.push(next);
          j++;
        }
        if (group.length > 1) {
          const maxLhs = Math.max(...group.map((g) => g.lhs.length));
          group.forEach((g) => {
            result.push(`${g.indent}${g.lhs.padEnd(maxLhs)} ${g.op} ${g.rhs};${g.gap}${g.comment}`);
          });
        } else {
          result.push(lines[i]);
        }
        i = j;
      }
      return result;
    }
    function alignBlockAssignments(lines, cfg) {
      // Align case-item columns, then column-align runs of consecutive,
      // same-indent plain =/<= assignments inside procedural blocks. Splitting
      // uses __splitTopLevelAssign, so ':' from ternaries/part-selects and
      // comparison ops (>=, ==, !=) in the LHS/RHS are handled correctly.
      const aligned = alignCaseItemAssignments(lines);
      if (cfg && cfg.alignAssignments === false) return aligned;
      return alignConsecutiveBlockAssignments(aligned);
    }
  }
});

// dist/formatter/formatting/moduleHeader.js
var require_moduleHeader = __commonJS({
  "dist/formatter/formatting/moduleHeader.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.formatModuleHeader = formatModuleHeader;
    function splitTopLevelCommas(s) {
      const parts = [];
      let depth = 0;
      let cur = "";
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === "(" || ch === "[" || ch === "{") depth++;
        else if (ch === ")" || ch === "]" || ch === "}") depth--;
        if (ch === "," && depth === 0) {
          parts.push(cur.trim());
          cur = "";
        } else {
          cur += ch;
        }
      }
      if (cur.trim().length) parts.push(cur.trim());
      return parts;
    }
    function matchCloseParen(s, openIdx) {
      let depth = 0;
      for (let i = openIdx; i < s.length; i++) {
        if (s[i] === "(") depth++;
        else if (s[i] === ")") {
          depth--;
          if (depth === 0) return i;
        }
      }
      return -1;
    }
    function preNormalizeParamHeader(lines) {
      if (!lines || !lines.length) return lines;
      const joined = lines.join("\n");
      if (!/#\s*\(/.test(joined)) return lines;
      if (/\/\//.test(joined) || /`/.test(joined)) return lines;
      if (lines.some((l) => /^\s*\)\s*(\(|$)/.test(l))) return lines;
      const flat = lines.map((l) => l.trim()).join(" ").replace(/\s+/g, " ").trim();
      const mm = flat.match(/^module\s+(\w+)\s*#\s*\(/);
      if (!mm) return lines;
      const name = mm[1];
      const pOpen = mm[0].length - 1;
      const pClose = matchCloseParen(flat, pOpen);
      if (pClose === -1) return lines;
      const paramInner = flat.slice(pOpen + 1, pClose).trim();
      const rest = flat.slice(pClose + 1).trim();
      let portInner = "";
      if (rest.startsWith("(")) {
        const qClose = matchCloseParen(rest, 0);
        if (qClose !== -1) portInner = rest.slice(1, qClose).trim();
      }
      const out = [];
      out.push("module " + name + " #(");
      const params = splitTopLevelCommas(paramInner);
      params.forEach((p, idx) => out.push("  " + p + (idx < params.length - 1 ? "," : "")));
      out.push(") (");
      const ports = splitTopLevelCommas(portInner);
      ports.forEach((p, idx) => out.push("  " + p + (idx < ports.length - 1 ? "," : "")));
      out.push(");");
      return out;
    }
    function formatModuleHeader(lines, cfg) {
      var _a, _b;
      lines = preNormalizeParamHeader(lines);
      const firstLine = ((_a = lines[0]) == null ? void 0 : _a.trim()) || "";
      if (!/^\s*module\b/.test(firstLine)) {
        return lines;
      }
      const hasOpen = lines.some((l) => l.includes("("));
      const hasClose = lines.some((l) => /\)\s*;\s*$/.test(l));
      if (!hasOpen || !hasClose)
        return lines;
      const moduleHeaderEndIdx = lines.findIndex((l) => /\)\s*;\s*$/.test(l));
      const headerLines = moduleHeaderEndIdx >= 0 ? lines.slice(0, moduleHeaderEndIdx + 1) : lines;
      const remainingLines = moduleHeaderEndIdx >= 0 ? lines.slice(moduleHeaderEndIdx + 1) : [];
      const paramStartIdx = headerLines.findIndex((l) => /#\s*\(/.test(l));
      let paramEndIdx = -1;
      let inlinePortAfterParams = null;
      if (paramStartIdx !== -1) {
        for (let i = paramStartIdx; i < headerLines.length; i++) {
          if (/^\s*\)\s*(\(|$)/.test(headerLines[i])) {
            paramEndIdx = i;
            const mInline = headerLines[i].match(/\)\s*\((.*)$/);
            if (mInline) {
              inlinePortAfterParams = mInline[1].replace(/\)\s*;?\s*$/, "").trim();
            }
            break;
          }
        }
      }
      let paramOpenComment = "";
      if (paramStartIdx !== -1) {
        const openLineMatch = headerLines[paramStartIdx].match(/#\s*\(\s*(\/\/.*)$/);
        if (openLineMatch)
          paramOpenComment = openLineMatch[1].replace(/\/\/\s?/, "// ").trimEnd();
      }
      const moduleDeclLine = headerLines[0].trim();
      const portLinesStart = paramEndIdx !== -1 ? paramEndIdx + 1 : 1;
      const portLinesEnd = headerLines.length - 1;
      const rawPortLines = [
        ...inlinePortAfterParams ? [inlinePortAfterParams] : [],
        ...headerLines.slice(portLinesStart, portLinesEnd)
      ];
      let portOpenComment = "";
      const cleanedRawPortLines = rawPortLines.filter((l) => {
        const t = l.trim();
        if (/^\(\s*$/.test(t))
          return false;
        const openCommentMatch = t.match(/^\(\s*(\/\/.*)$/);
        if (openCommentMatch) {
          portOpenComment = openCommentMatch[1].replace(/\/\/\s?/, "// ").trimEnd();
          return false;
        }
        return true;
      });
      const macroStack = [];
      const entries = [];
      cleanedRawPortLines.forEach((line) => {
        let trimmed = line.trim();
        if (trimmed === "") {
          entries.push({ original: line, kind: "blank", content: "" });
          return;
        }
        if (/^,$/.test(trimmed)) {
          entries.push({ original: line, kind: "separator", content: "," });
          return;
        }
        if (trimmed.startsWith("`")) {
          let macroName;
          const ifdefM = trimmed.match(/^`ifn?def\s+(\w+)/);
          if (ifdefM) {
            macroName = ifdefM[1];
            macroStack.push(macroName);
          }
          if (/^`else\b/.test(trimmed)) {
            const current = macroStack[macroStack.length - 1];
            if (current)
              trimmed = "`else // " + current;
          }
          if (/^`endif\b/.test(trimmed)) {
            const popped = macroStack.pop();
            trimmed = "`endif" + (popped ? ` // ${popped}` : "");
            if (/`endif\s*\/\/\s*\w+/.test(trimmed)) {
              trimmed = trimmed.replace(/`endif\s*\/\/\s*(\w+)/, (_m, g1) => "`endif // " + g1);
            }
          }
          entries.push({ original: line, kind: "directive", content: trimmed });
          return;
        }
        if (trimmed.startsWith("//")) {
          entries.push({ original: line, kind: "directive", content: trimmed });
          return;
        }
        const commentMatch = trimmed.match(/(.*?)(\/\/.*)$/);
        const comment = commentMatch ? commentMatch[2].replace(/\/\/\s?/, "// ") : void 0;
        const body = commentMatch ? commentMatch[1].trim() : trimmed;
        const trailingComma = /,\s*$/.test(body);
        const bodyNoComma = body.replace(/,\s*$/, "").trim();
        const m = bodyNoComma.match(/^(input|output|inout)?\s*(wire|reg|logic)?\s*(\[[^\]]+\])?\s*(.*)$/);
        if (m) {
          entries.push({ original: line, kind: "port", content: bodyNoComma, dir: m[1] || "", type: m[2] || "", range: m[3] || "", name: m[4].trim(), comma: trailingComma, comment });
        } else {
          entries.push({ original: line, kind: "port", content: bodyNoComma, dir: "", type: "", range: "", name: bodyNoComma, comma: trailingComma, comment });
        }
      });
      const portEntries = entries.filter((e) => e.kind === "port");
      const maxDir = Math.max(0, ...portEntries.map((e) => {
        var _a2;
        return ((_a2 = e.dir) == null ? void 0 : _a2.length) || 0;
      }));
      const maxType = Math.max(0, ...portEntries.map((e) => {
        var _a2;
        return ((_a2 = e.type) == null ? void 0 : _a2.length) || 0;
      }));
      const maxRange = Math.max(0, ...portEntries.map((e) => {
        var _a2;
        return ((_a2 = e.range) == null ? void 0 : _a2.length) || 0;
      }));
      const maxName = Math.max(0, ...portEntries.map((e) => {
        var _a2;
        return ((_a2 = e.name) == null ? void 0 : _a2.length) || 0;
      }));
      portEntries.forEach((e) => {
        const dirCol = maxDir ? (e.dir || "").padEnd(maxDir) : "";
        const typeCol = maxType ? (e.type || "").padEnd(maxType) : "";
        const rangeCol = maxRange ? (e.range || "").padStart(maxRange) : "";
        let nameCol = e.name || "";
        if (nameCol.includes("=") && nameCol.match(/^\s*parameter\s+/)) {
          nameCol = nameCol.replace(/\s*=\s*/, " = ");
        }
        const segments = [];
        if (maxDir)
          segments.push(dirCol);
        if (maxType)
          segments.push(typeCol);
        if (maxRange)
          segments.push(rangeCol);
        let base = segments.length ? segments.join(" ") + " " + nameCol : nameCol;
        e.content = base;
      });
      const maxBaseLength = Math.max(0, ...portEntries.map((e) => {
        var _a2;
        return ((_a2 = e.content) == null ? void 0 : _a2.length) || 0;
      }));
      portEntries.forEach((e) => {
        if (e.comma) {
          const basePadded = e.content.padEnd(maxBaseLength);
          e.content = basePadded + ",";
        }
      });
      const commentAlignPos = maxBaseLength + 1;
      const anyComma = portEntries.some((e) => e.comma);
      portEntries.forEach((e) => {
        if (e.comment) {
          const targetLen = anyComma ? commentAlignPos : commentAlignPos - 1;
          e.content = e.content.padEnd(targetLen) + " " + e.comment;
        }
      });
      const formattedPortLines = entries.map((e) => {
        if (e.kind === "blank")
          return "";
        if (e.kind === "separator")
          return ",";
        if (e.kind === "directive")
          return e.content;
        if (e.kind === "port")
          return e.content;
        return e.original.trim();
      });
      const out = [];
      const hasParameters = paramStartIdx !== -1 && paramEndIdx !== -1;
      const indentSpaces = " ".repeat(cfg.indentSize);
      const moduleNameMatch = moduleDeclLine.match(/^\s*module\s+(\w+)/);
      const moduleNameBase = moduleNameMatch ? "module " + moduleNameMatch[1] : moduleDeclLine.replace(/\(.*/, "").trim();
      if (hasParameters) {
        const modNameOnly = ((_b = moduleDeclLine.match(/^\s*module\s+(\w+)/)) == null ? void 0 : _b[1]) || moduleNameBase.replace(/^module\s+/, "").trim();
        out.push("module " + modNameOnly + " #(" + (paramOpenComment ? " " + paramOpenComment : ""));
        const paramBlockLinesRaw = lines.slice(paramStartIdx, paramEndIdx + 1);
        const innerParamLines = [];
        paramBlockLinesRaw.forEach((pl) => {
          const trimmed = pl.trim();
          if (/#\s*\(\s*(\/\/.*)?$/.test(trimmed))
            return;
          if (/^\)\s*(\(|$)/.test(trimmed))
            return;
          if (trimmed.length)
            innerParamLines.push(pl);
        });
        const paramInfos = [];
        let lastParamKeyword = "parameter";
        let contDepth = 0;
        for (let i = 0; i < innerParamLines.length; i++) {
          const originalLine = innerParamLines[i];
          const trimmed = originalLine.trim();
          if (/^,\s*$/.test(trimmed)) {
            paramInfos.push({ original: originalLine, kind: "separator", content: ",", hasComma: false, comment: "" });
            continue;
          }
          if (/^`(ifn?def|else|endif)\b/.test(trimmed)) {
            paramInfos.push({ original: originalLine, kind: "directive", content: trimmed, hasComma: false, comment: "" });
            continue;
          }
          if (/^\/\//.test(trimmed)) {
            paramInfos.push({ original: originalLine, kind: "comment", content: trimmed, hasComma: false, comment: "" });
            continue;
          }
          const codePart = trimmed.replace(/\/\/.*$/, "");
          const depthDelta = (codePart.match(/[{([]/g) || []).length - (codePart.match(/[})\]]/g) || []).length;
          const isTopLevel = contDepth === 0;
          if (/^(parameter|localparam)\b/.test(trimmed)) {
            lastParamKeyword = /^localparam\b/.test(trimmed) ? "localparam" : "parameter";
            const commentMatch2 = trimmed.match(/(.*?)(\/\/.*)$/);
            const comment2 = commentMatch2 ? commentMatch2[2].replace(/\/\/\s?/, "// ").trim() : "";
            let body2 = (commentMatch2 ? commentMatch2[1] : trimmed).trim();
            const hasComma2 = /,\s*$/.test(body2);
            body2 = body2.replace(/,\s*$/, "").trim();
            body2 = body2.replace(/\s*=\s*/, " = ");
            paramInfos.push({ original: originalLine, kind: "parameter", content: body2, hasComma: hasComma2, comment: comment2 });
            contDepth += depthDelta;
            continue;
          }
          if (isTopLevel && /^[A-Za-z_][\w\s\[\]:$.\-]*\s*=(?!=)/.test(trimmed)) {
            const commentMatch2 = trimmed.match(/(.*?)(\/\/.*)$/);
            const comment2 = commentMatch2 ? commentMatch2[2].replace(/\/\/\s?/, "// ").trim() : "";
            let body2 = (commentMatch2 ? commentMatch2[1] : trimmed).trim();
            const hasComma2 = /,\s*$/.test(body2);
            body2 = body2.replace(/,\s*$/, "").trim();
            body2 = body2.replace(/\s*=\s*/, " = ");
            body2 = lastParamKeyword + " " + body2;
            paramInfos.push({ original: originalLine, kind: "parameter", content: body2, hasComma: hasComma2, comment: comment2 });
            contDepth += depthDelta;
            continue;
          }
          const commentMatch = trimmed.match(/(.*?)(\/\/.*)$/);
          const comment = commentMatch ? commentMatch[2].replace(/\/\/\s?/, "// ").trim() : "";
          let body = (commentMatch ? commentMatch[1] : trimmed).trim();
          const hasComma = /,\s*$/.test(body);
          body = body.replace(/,\s*$/, "").trim();
          let preservedContent = originalLine;
          if (comment) {
            preservedContent = originalLine.replace(/\/\/.*$/, "").trimEnd();
          }
          if (hasComma) {
            preservedContent = preservedContent.replace(/,\s*$/, "");
          }
          paramInfos.push({ original: originalLine, kind: "continuation", content: preservedContent, hasComma, comment });
          contDepth += depthDelta;
        }
        const allParamLines = paramInfos.filter((p) => p.kind === "parameter");
        const maxContentLen = allParamLines.length > 0 ? Math.max(...allParamLines.map((p) => p.content.length)) : 0;
        paramInfos.forEach((info) => {
          if (info.kind === "separator") {
            out.push(indentSpaces + ",");
            return;
          }
          if (info.kind === "directive") {
            out.push(indentSpaces + info.content);
            return;
          }
          if (info.kind === "comment") {
            out.push(indentSpaces + info.content);
            return;
          }
          if (info.kind === "continuation") {
            if (info.merged) {
              return;
            }
            const prevParamIndex = paramInfos.slice(0, paramInfos.indexOf(info)).reverse().findIndex((p) => p.kind === "parameter");
            if (prevParamIndex >= 0) {
              const prevParam = paramInfos[paramInfos.indexOf(info) - prevParamIndex - 1];
              const braceMatch = prevParam.content.match(/.*=\s*(\{)/);
              if (braceMatch) {
                const eqMatch = prevParam.content.match(/^(.*?)\s*=\s*/);
                if (eqMatch) {
                  const leftPart = eqMatch[1].trim();
                  const allLeftParts = allParamLines.map((p) => {
                    const m = p.content.match(/^(.*?)\s*=\s*(.*)$/);
                    return m ? m[1].trim() : p.content;
                  });
                  const maxLeftLen = Math.max(...allLeftParts.map((s) => s.length));
                  const trimmedContent = info.content.trim();
                  const contIndent = trimmedContent === "}" ? " ".repeat(indentSpaces.length + maxLeftLen + " = ".length) : " ".repeat(indentSpaces.length + maxLeftLen + " = ".length + 1);
                  const commaStr2 = info.hasComma ? "," : "";
                  if (info.comment) {
                    out.push(contIndent + trimmedContent + commaStr2 + " " + info.comment);
                  } else {
                    out.push(contIndent + trimmedContent + commaStr2);
                  }
                  return;
                }
              }
            }
            const commaStr = info.hasComma ? "," : "";
            if (info.comment) {
              out.push(info.content + commaStr + " " + info.comment);
            } else {
              out.push(info.content + commaStr);
            }
            return;
          }
          if (info.hasComma) {
            const eqMatch = info.content.match(/^(.*?)\s*=\s*(.*)$/);
            if (eqMatch) {
              const leftPart = eqMatch[1].trim();
              let rightPart = eqMatch[2].trim();
              const currentIndex = paramInfos.indexOf(info);
              if (rightPart === "{" && currentIndex + 1 < paramInfos.length && paramInfos[currentIndex + 1].kind === "continuation") {
                const nextLine = paramInfos[currentIndex + 1];
                rightPart = "{" + nextLine.content.trim();
                nextLine.merged = true;
              }
              const allLeftParts = allParamLines.map((p) => {
                const m = p.content.match(/^(.*?)\s*=\s*(.*)$/);
                return m ? m[1].trim() : p.content;
              });
              const maxLeftLen = Math.max(...allLeftParts.map((s) => s.length));
              const allRightParts = allParamLines.map((p) => {
                const m = p.content.match(/^(.*?)\s*=\s*(.*)$/);
                return m ? m[2].trim() : "";
              });
              const maxRightLen = Math.max(...allRightParts.map((s) => s.length));
              const paddedLeft = leftPart.padEnd(maxLeftLen);
              const paddedRightComma = rightPart.padEnd(maxRightLen) + ",";
              if (info.comment) {
                out.push(indentSpaces + paddedLeft + " = " + paddedRightComma + " " + info.comment);
              } else {
                out.push(indentSpaces + paddedLeft + " = " + paddedRightComma);
              }
            } else {
              const paddedContent = info.content.padEnd(maxContentLen);
              const baseLine = indentSpaces + paddedContent + ",";
              if (info.comment) {
                out.push(baseLine + " " + info.comment);
              } else {
                out.push(baseLine);
              }
            }
          } else {
            const eqMatch = info.content.match(/^(.*?)\s*=\s*(.*)$/);
            if (eqMatch) {
              const leftPart = eqMatch[1].trim();
              let rightPart = eqMatch[2].trim();
              const allLeftParts = allParamLines.map((p) => {
                const m = p.content.match(/^(.*?)\s*=\s*(.*)$/);
                return m ? m[1].trim() : p.content;
              });
              const maxLeftLen = Math.max(...allLeftParts.map((s) => s.length));
              const paddedLeft = leftPart.padEnd(maxLeftLen);
              if (info.comment) {
                const allRightParts = allParamLines.map((p) => {
                  const m = p.content.match(/^(.*?)\s*=\s*(.*)$/);
                  return m ? m[2].trim() : "";
                });
                const maxRightLen = Math.max(...allRightParts.map((s) => s.length));
                const paddedRight = rightPart.padEnd(maxRightLen);
                const baseLine = indentSpaces + paddedLeft + " = " + paddedRight;
                out.push(baseLine + "  " + info.comment);
              } else {
                const baseLine = indentSpaces + paddedLeft + " = " + rightPart;
                out.push(baseLine);
              }
            } else {
              const baseLine = indentSpaces + info.content;
              if (info.comment) {
                out.push(baseLine + " " + info.comment);
              } else {
                out.push(baseLine);
              }
            }
          }
        });
        const havePorts = formattedPortLines.some((l) => l.trim().length);
        if (havePorts && !inlinePortAfterParams) {
          out.push(indentSpaces + ")");
          out.push(indentSpaces + "(" + (portOpenComment ? " " + portOpenComment : ""));
        } else {
          out.push(indentSpaces + ")");
        }
      } else {
        const inlineTailMatch = moduleDeclLine.match(/\(\s*(.*)$/);
        let inlineTail = "";
        if (inlineTailMatch)
          inlineTail = inlineTailMatch[1].replace(/\)\s*;?\s*$/, "").trim();
        out.push(moduleNameBase + "(" + (portOpenComment ? " " + portOpenComment : ""));
        if (inlineTail)
          formattedPortLines.unshift(inlineTail.replace(/,\s*$/, ",").trim());
      }
      const portIndent = indentSpaces;
      formattedPortLines.forEach((l) => {
        out.push(l === "" ? "" : portIndent + l);
      });
      out.push(portIndent + ");");
      for (let i = 1; i < out.length - 1; i++) {
        if (/^\s*\($/.test(out[i]) && /^\s*\($/.test(out[i + 1])) {
          out.splice(i + 1, 1);
          i--;
        }
      }
      return [...out, ...remainingLines];
    }
  }
});

// dist/formatter/formatting/singleInstantiation.js
var require_singleInstantiation = __commonJS({
  "dist/formatter/formatting/singleInstantiation.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.formatSingleInstantiation = formatSingleInstantiation;
    function instMatchCloseParen(s, openIdx) {
      let depth = 0;
      for (let i = openIdx; i < s.length; i++) {
        if (s[i] === "(") depth++;
        else if (s[i] === ")") {
          depth--;
          if (depth === 0) return i;
        }
      }
      return -1;
    }
    function instSplitTopLevelCommas(s) {
      const parts = [];
      let depth = 0;
      let cur = "";
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === "(" || ch === "[" || ch === "{") depth++;
        else if (ch === ")" || ch === "]" || ch === "}") depth--;
        if (ch === "," && depth === 0) {
          parts.push(cur.trim());
          cur = "";
        } else {
          cur += ch;
        }
      }
      if (cur.trim().length) parts.push(cur.trim());
      return parts;
    }
    function explodeCompactInstantiation(lines) {
      if (!lines || lines.length !== 1) return lines;
      const s = lines[0].trim();
      if (/\/\//.test(s) || /`/.test(s)) return lines;
      if (!/;\s*$/.test(s)) return lines;
      const modMatch = s.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+/);
      if (!modMatch) return lines;
      const moduleName = modMatch[1];
      let rest = s.slice(modMatch[0].length).trim();
      let params = null;
      if (rest.startsWith("#")) {
        const po = rest.indexOf("(");
        if (po === -1) return lines;
        const pc = instMatchCloseParen(rest, po);
        if (pc === -1) return lines;
        params = rest.slice(po + 1, pc).trim();
        rest = rest.slice(pc + 1).trim();
      }
      const instMatch = rest.match(/^([A-Za-z_][A-Za-z0-9_]*(?:\s*\[[^\]]+\])?)\s*\(/);
      if (!instMatch) return lines;
      const instName = instMatch[1].replace(/\s+/g, "");
      const qOpen = instMatch[0].length - 1;
      const qClose = instMatchCloseParen(rest, qOpen);
      if (qClose === -1) return lines;
      const ports = rest.slice(qOpen + 1, qClose).trim();
      if (rest.slice(qClose + 1).trim() !== ";") return lines;
      const out = [];
      if (params !== null) {
        out.push(moduleName + " #(");
        const pl = instSplitTopLevelCommas(params);
        pl.forEach((p, idx) => out.push(p + (idx < pl.length - 1 ? "," : "")));
        out.push(") " + instName + " (");
      } else {
        out.push(moduleName + " " + instName + " (");
      }
      const portl = instSplitTopLevelCommas(ports);
      portl.forEach((p, idx) => out.push(p + (idx < portl.length - 1 ? "," : "")));
      out.push(");");
      return out;
    }
    function formatSingleInstantiation(lines, baseIndent, unit) {
      var _a, _b;
      lines = explodeCompactInstantiation(lines);
      const firstLine = lines[0].trim();
      const hasParams = /^[A-Za-z_][A-Za-z0-9_]*\s+#/.test(firstLine);
      const parsed = [];
      let moduleName = "";
      let instanceName = "";
      let state = "init";
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (state === "init") {
          const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+#\s*\(/);
          if (m) {
            moduleName = m[1];
            parsed.push({ type: "param_start", content: trimmed });
            state = "in_params";
            continue;
          }
          const m_hash = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+#\s*$/);
          if (m_hash) {
            moduleName = m_hash[1];
            parsed.push({ type: "module_start", content: trimmed });
            state = "in_params";
            continue;
          }
          const m2 = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
          if (m2) {
            moduleName = m2[1];
            instanceName = m2[2];
            parsed.push({ type: "inst_start", content: trimmed });
            state = "in_ports";
            continue;
          }
          const m3 = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)$/);
          if (m3 && i + 1 < lines.length) {
            moduleName = m3[1];
            const nextTrimmed = lines[i + 1].trim();
            const m4 = nextTrimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
            if (m4) {
              instanceName = m4[1];
              i++;
              parsed.push({ type: "inst_start", content: trimmed + " " + nextTrimmed });
              state = "in_ports";
              continue;
            }
          }
        }
        if (state === "in_params") {
          if (/^\s*\(\s*$/.test(trimmed) && parsed.length > 0 && parsed[parsed.length - 1].type === "module_start") {
            parsed.push({ type: "param_start", content: trimmed });
            continue;
          }
          if (/^\s*\)/.test(trimmed)) {
            parsed.push({ type: "param_end", content: trimmed });
            const sameLineInst = trimmed.match(/^\)\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
            if (sameLineInst) {
              instanceName = sameLineInst[1];
              parsed.push({ type: "inst_start", content: sameLineInst[0] });
              state = "in_ports";
            } else {
              const instNameOnly = trimmed.match(/^\)\s*([A-Za-z_][A-Za-z0-9_]*)\s*$/);
              if (instNameOnly) {
                instanceName = instNameOnly[1];
              }
              state = "between";
            }
            continue;
          }
          if (/^\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/.test(trimmed)) {
            let parenCount = 0;
            let hasClosingParen = false;
            for (const ch of trimmed) {
              if (ch === "(")
                parenCount++;
              if (ch === ")") {
                parenCount--;
                if (parenCount === 0) {
                  hasClosingParen = true;
                  break;
                }
              }
            }
            if (hasClosingParen) {
              const pm = trimmed.match(/^\.([A-Za-z_][A-Za-z0-9_]*)\s*\((.*?)\)\s*(,?)\s*(\/\/.*)?$/);
              if (pm) {
                parsed.push({
                  type: "param",
                  content: trimmed,
                  port: pm[1],
                  conn: pm[2].trim(),
                  comment: pm[4] ? pm[4].trim() : void 0,
                  hadComma: pm[3] === ","
                  // Track if original had comma
                });
                continue;
              }
            }
            const paramName = (_a = trimmed.match(/^\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/)) == null ? void 0 : _a[1];
            if (paramName) {
              const multilineLines = [line];
              let foundClosing = false;
              let parenDepth = 1;
              const firstLineAfterParam = trimmed.substring(trimmed.indexOf("(") + 1);
              for (const ch of firstLineAfterParam) {
                if (ch === "(")
                  parenDepth++;
                if (ch === ")")
                  parenDepth--;
              }
              if (parenDepth === 0) {
                foundClosing = true;
              }
              let j = i + 1;
              while (j < lines.length && !foundClosing) {
                const nextLine = lines[j];
                multilineLines.push(nextLine);
                for (const ch of nextLine) {
                  if (ch === "(")
                    parenDepth++;
                  if (ch === ")") {
                    parenDepth--;
                    if (parenDepth === 0) {
                      foundClosing = true;
                      break;
                    }
                  }
                }
                j++;
              }
              if (foundClosing) {
                const isSimpleSplit = multilineLines.length === 2 && multilineLines[1].trim().match(/^\)\s*,?\s*$/);
                if (isSimpleSplit) {
                  const valueMatch = multilineLines[0].match(/^\.([A-Za-z_][A-Za-z0-9_]*)\s*\((.*)$/);
                  if (valueMatch) {
                    const port = valueMatch[1];
                    const value = valueMatch[2].trim();
                    const hasComma = multilineLines[1].includes(",");
                    parsed.push({
                      type: "param",
                      content: `.${port} (${value})${hasComma ? "," : ""}`,
                      port,
                      conn: value,
                      comment: void 0
                    });
                    i = j - 1;
                    continue;
                  }
                }
                let paramMaxSignalLen = 0;
                const firstLine2 = multilineLines[0].trim();
                const firstLineMatch = firstLine2.match(/^\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+[\da-fA-F_]+|\([^)]+\))\s*[,}]/);
                if (firstLineMatch && firstLineMatch[2].length > paramMaxSignalLen) {
                  paramMaxSignalLen = firstLineMatch[2].length;
                }
                for (const origLine of multilineLines) {
                  const trimmed2 = origLine.trim();
                  if (trimmed2.startsWith("`") || trimmed2.startsWith("//"))
                    continue;
                  const signalMatch = trimmed2.match(/^([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+[\da-fA-F_]+|\([^)]+\))\s*[,}]/);
                  if (signalMatch && signalMatch[1].length > paramMaxSignalLen) {
                    paramMaxSignalLen = signalMatch[1].length;
                  }
                  const replicationMatch = trimmed2.match(/^(\{[^}]+\{[^}]+\}\})/);
                  if (replicationMatch && replicationMatch[1].length > paramMaxSignalLen) {
                    paramMaxSignalLen = replicationMatch[1].length;
                  }
                  const doubleReplicationMatch = trimmed2.match(/^(\{\{[^}]+\{[^}]+\}\})/);
                  if (doubleReplicationMatch && doubleReplicationMatch[1].length > paramMaxSignalLen) {
                    paramMaxSignalLen = doubleReplicationMatch[1].length;
                  }
                }
                parsed.push({
                  type: "param",
                  content: "",
                  // Will be reconstructed during output
                  port: paramName,
                  conn: "MULTILINE",
                  // Marker for multiline
                  originalLines: multilineLines,
                  maxSignalLen: paramMaxSignalLen
                  // Store max signal length for this parameter
                });
                i = j - 1;
                continue;
              }
            }
          }
          if (/^`(ifn?def|else|endif)/.test(trimmed)) {
            parsed.push({ type: "directive", content: trimmed });
            continue;
          }
          if (/^\/\//.test(trimmed)) {
            parsed.push({ type: "directive", content: trimmed });
            continue;
          }
          if (trimmed === ",") {
            parsed.push({ type: "comma", content: trimmed });
            continue;
          }
          if (trimmed === "") {
            parsed.push({ type: "blank", content: trimmed });
            continue;
          }
        }
        if (state === "between") {
          const im = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?)\s*\(/);
          if (im) {
            instanceName = im[1];
            parsed.push({ type: "inst_start", content: trimmed });
            state = "in_ports";
            continue;
          }
          if (/^\s*\(\s*$/.test(trimmed) && instanceName) {
            parsed.push({ type: "inst_start", content: trimmed });
            state = "in_ports";
            continue;
          }
        }
        if (state === "in_ports") {
          if (/^\s*\)\s*;\s*$/.test(trimmed)) {
            parsed.push({ type: "inst_end", content: trimmed });
            break;
          }
          if (/^\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/.test(trimmed)) {
            let parenCount = 0;
            let hasClosingParen = false;
            for (const ch of trimmed) {
              if (ch === "(")
                parenCount++;
              if (ch === ")") {
                parenCount--;
                if (parenCount === 0) {
                  hasClosingParen = true;
                  break;
                }
              }
            }
            if (hasClosingParen) {
              const pm = trimmed.match(/^\.([A-Za-z_][A-Za-z0-9_]*)\s*\((.*?)\)\s*(,?)\s*(\/\/.*)?$/);
              if (pm) {
                parsed.push({
                  type: "port",
                  content: trimmed,
                  port: pm[1],
                  conn: pm[2].trim(),
                  comment: pm[4] ? pm[4].trim() : void 0,
                  hadComma: pm[3] === ","
                  // Track if original had comma
                });
                continue;
              }
            }
            const portName = (_b = trimmed.match(/^\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/)) == null ? void 0 : _b[1];
            if (portName) {
              const multilineLines = [line];
              let foundClosing = false;
              let parenDepth = 1;
              const firstLineAfterPort = trimmed.substring(trimmed.indexOf("(") + 1);
              for (const ch of firstLineAfterPort) {
                if (ch === "(")
                  parenDepth++;
                if (ch === ")")
                  parenDepth--;
              }
              if (parenDepth === 0) {
                foundClosing = true;
              }
              let j = i + 1;
              while (j < lines.length && !foundClosing) {
                const nextLine = lines[j];
                multilineLines.push(nextLine);
                for (const ch of nextLine) {
                  if (ch === "(")
                    parenDepth++;
                  if (ch === ")") {
                    parenDepth--;
                    if (parenDepth === 0) {
                      foundClosing = true;
                      break;
                    }
                  }
                }
                j++;
              }
              if (foundClosing) {
                const isSimpleSplit = multilineLines.length === 2 && multilineLines[1].trim().match(/^\)\s*,?\s*$/);
                if (isSimpleSplit) {
                  const valueMatch = multilineLines[0].match(/^\.([A-Za-z_][A-Za-z0-9_]*)\s*\((.*)$/);
                  if (valueMatch) {
                    const port = valueMatch[1];
                    const value = valueMatch[2].trim();
                    const hasComma = multilineLines[1].includes(",");
                    parsed.push({
                      type: "port",
                      content: `.${port} (${value})${hasComma ? "," : ""}`,
                      port,
                      conn: value,
                      comment: void 0
                    });
                    i = j - 1;
                    continue;
                  }
                }
                let portMaxSignalLen = 0;
                const firstLine2 = multilineLines[0].trim();
                const firstLineMatch = firstLine2.match(/^\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+[\da-fA-F_]+)\s*[,}]/);
                if (firstLineMatch && firstLineMatch[2].length > portMaxSignalLen) {
                  portMaxSignalLen = firstLineMatch[2].length;
                }
                const firstLineContinuedMatch = firstLine2.match(/^\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?)\s*$/);
                if (firstLineContinuedMatch && firstLineContinuedMatch[2].length > portMaxSignalLen) {
                  portMaxSignalLen = firstLineContinuedMatch[2].length;
                }
                const nestedFirstMatch = firstLine2.match(/^\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\{(\{[^,}]+|[a-zA-Z_][a-zA-Z0-9_\[\]\-:]+|\d+'\w+[\da-fA-F_]+)\s*[,}]/);
                if (nestedFirstMatch && nestedFirstMatch[2].length > portMaxSignalLen) {
                  portMaxSignalLen = nestedFirstMatch[2].length;
                }
                for (const origLine of multilineLines) {
                  const trimmed2 = origLine.trim();
                  if (trimmed2.startsWith("`") || trimmed2.startsWith("//"))
                    continue;
                  const signalMatch = trimmed2.match(/^([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+[\da-fA-F_]+)\s*[,}]/);
                  if (signalMatch && signalMatch[1].length > portMaxSignalLen) {
                    portMaxSignalLen = signalMatch[1].length;
                  }
                  const commaLeftMatch = trimmed2.match(/^,\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+[\da-fA-F_]+)(?:\s*,|\s*$)?/);
                  if (commaLeftMatch && commaLeftMatch[1].length > portMaxSignalLen) {
                    portMaxSignalLen = commaLeftMatch[1].length;
                  }
                  const expressionWithBracesMatch = trimmed2.match(/^(.+})\s*}+\s*\)[\),]?\s*$/);
                  if (expressionWithBracesMatch && expressionWithBracesMatch[1].trim().length > portMaxSignalLen) {
                    portMaxSignalLen = expressionWithBracesMatch[1].trim().length;
                  }
                  const replicationMatch = trimmed2.match(/^(\{[^}]+\{[^}]+\}\})/);
                  if (replicationMatch && replicationMatch[1].length > portMaxSignalLen) {
                    portMaxSignalLen = replicationMatch[1].length;
                  }
                  const doubleReplicationMatch = trimmed2.match(/^(\{\{[^}]+\{[^}]+\}\})/);
                  if (doubleReplicationMatch && doubleReplicationMatch[1].length > portMaxSignalLen) {
                    portMaxSignalLen = doubleReplicationMatch[1].length;
                  }
                  const nestedMatch = trimmed2.match(/^(\{[a-zA-Z_][a-zA-Z0-9_\[\]\-:]+)\s*[,}]/);
                  if (nestedMatch && nestedMatch[1].length > portMaxSignalLen) {
                    portMaxSignalLen = nestedMatch[1].length;
                  }
                }
                parsed.push({
                  type: "port",
                  content: "",
                  // Will be reconstructed during output
                  port: portName,
                  conn: "MULTILINE",
                  // Marker for multiline
                  originalLines: multilineLines,
                  maxSignalLen: portMaxSignalLen
                  // Store max signal length for this port
                });
                i = j - 1;
                continue;
              }
            }
          }
          if (/^`(ifn?def|else|endif)/.test(trimmed)) {
            parsed.push({ type: "directive", content: trimmed });
            continue;
          }
          if (/^\/\//.test(trimmed)) {
            parsed.push({ type: "directive", content: trimmed });
            continue;
          }
          if (trimmed === ",") {
            parsed.push({ type: "comma", content: trimmed });
            continue;
          }
          if (trimmed === "") {
            parsed.push({ type: "blank", content: trimmed });
            continue;
          }
        }
      }
      const result = [];
      const params = parsed.filter((p) => p.type === "param" && p.port);
      const ports = parsed.filter((p) => p.type === "port" && p.port);
      const maxParamPort = params.length > 0 ? Math.max(...params.map((p) => p.port.length)) + 1 : 0;
      const maxParamConn = params.length > 0 ? Math.max(...params.filter((p) => p.conn !== "MULTILINE").map((p) => p.conn.length)) : 0;
      const maxPortPort = ports.length > 0 ? Math.max(...ports.map((p) => p.port.length)) + 1 : 0;
      const maxPortConn = ports.length > 0 ? Math.max(...ports.filter((p) => p.conn !== "MULTILINE").map((p) => p.conn.length)) : 0;
      const hasParameters = parsed.some((p) => p.type === "param_start" || p.type === "module_start");
      if (hasParameters) {
        const hasModuleStart = parsed.some((p) => p.type === "module_start");
        if (hasModuleStart) {
          result.push(baseIndent + moduleName + " #");
          result.push(baseIndent + unit + "(");
        } else {
          result.push(baseIndent + moduleName + " #(");
        }
        let globalMaxParamSignalLen = 0;
        let globalMaxParamContentLen = 0;
        for (let i = 0; i < parsed.length; i++) {
          const p = parsed[i];
          if (p.type === "param_end")
            break;
          if (p.type === "param" && p.conn !== void 0) {
            if (p.conn === "MULTILINE" && p.originalLines) {
              const firstLineTrimmed = p.originalLines[0].trim();
              const isConcatenation = /\(\{/.test(firstLineTrimmed);
              if (!isConcatenation) {
                const contentMatch = firstLineTrimmed.match(/\((.+)$/);
                if (contentMatch) {
                  let firstLineContent = contentMatch[1].trim();
                  firstLineContent = firstLineContent.replace(/\/\/.*$/, "").trim();
                  if (!firstLineContent.startsWith("`")) {
                    if (firstLineContent.length > globalMaxParamContentLen) {
                      globalMaxParamContentLen = firstLineContent.length;
                    }
                  }
                }
              }
              for (let lineIdx = 0; lineIdx < p.originalLines.length; lineIdx++) {
                const origLine = p.originalLines[lineIdx];
                const trimmed = origLine.trim();
                if (lineIdx === 0 || trimmed.match(/^\)\s*,?\s*$/) || trimmed.match(/^}\s*\)\s*,?\s*$/) || trimmed.startsWith("`")) {
                  continue;
                }
                if (isConcatenation) {
                  const signalMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+[\da-fA-F_]+)\s*[,}]/);
                  if (signalMatch && signalMatch[1].length > globalMaxParamSignalLen) {
                    globalMaxParamSignalLen = signalMatch[1].length;
                  }
                  const replicationMatch = trimmed.match(/^(\{[^}]+\{[^}]+\}\})/);
                  if (replicationMatch && replicationMatch[1].length > globalMaxParamSignalLen) {
                    globalMaxParamSignalLen = replicationMatch[1].length;
                  }
                  const doubleReplicationMatch = trimmed.match(/^(\{\{[^}]+\{[^}]+\}\})/);
                  if (doubleReplicationMatch && doubleReplicationMatch[1].length > globalMaxParamSignalLen) {
                    globalMaxParamSignalLen = doubleReplicationMatch[1].length;
                  }
                  const nestedMatch = trimmed.match(/^(\{[a-zA-Z_][a-zA-Z0-9_\[\]\-:]+)\s*[,}]/);
                  if (nestedMatch && nestedMatch[1].length > globalMaxParamSignalLen) {
                    globalMaxParamSignalLen = nestedMatch[1].length;
                  }
                } else {
                  let content = trimmed;
                  content = content.replace(/\/\/.*$/, "").trim();
                  content = content.replace(/\s*\)\s*,?\s*$/, "").trim();
                  const contentLen = content.length;
                  if (contentLen > globalMaxParamContentLen) {
                    globalMaxParamContentLen = contentLen;
                  }
                }
              }
            } else if (p.conn !== "MULTILINE") {
              const contentLen = p.conn.length;
              if (contentLen > globalMaxParamContentLen) {
                globalMaxParamContentLen = contentLen;
              }
            }
          }
        }
        const paramContentIndent = (baseIndent + unit).length + 1 + maxParamPort + 1;
        const paramConcatContinuationIndent = (baseIndent + unit).length + 1 + maxParamPort + 2;
        const paramClosingParenCol = Math.max(
          paramContentIndent + maxParamConn,
          // Single-line parameters
          paramConcatContinuationIndent + (globalMaxParamSignalLen > 0 ? globalMaxParamSignalLen + 1 : 0),
          // Multiline concatenations (+1 for })
          paramContentIndent + globalMaxParamContentLen
          // Multiline expressions
        );
        const paramLineInfos = [];
        for (let i = 0; i < parsed.length; i++) {
          const p = parsed[i];
          if (p.type === "param_end")
            break;
          if (p.type === "param_start")
            continue;
          if (p.type === "param" && p.port && p.conn !== void 0) {
            if (p.conn === "MULTILINE" && p.originalLines && p.maxSignalLen !== void 0) {
              const portPadded = p.port.padEnd(maxParamPort);
              let paramContinuationIndent = " ".repeat((baseIndent + unit).length + 1 + maxParamPort + 1);
              let isConcatenation = false;
              const paramMaxSignalLen = p.maxSignalLen;
              for (let lineIdx = 0; lineIdx < p.originalLines.length; lineIdx++) {
                const origLine = p.originalLines[lineIdx];
                const origTrimmed = origLine.trim();
                let hasDirectiveWithClosing = false;
                let directivePart = "";
                let closingPart = "";
                if (/^`(ifn?def|else|endif)/.test(origTrimmed)) {
                  const directiveMatch = origTrimmed.match(/^(`(?:ifdef|ifndef|else|endif)(?:\s+\/\/[^\)\}]+)?)\s*([\)\}]+\s*,?\s*)$/);
                  if (directiveMatch) {
                    hasDirectiveWithClosing = true;
                    directivePart = directiveMatch[1];
                    closingPart = directiveMatch[2];
                  }
                }
                let lineWithoutComment = origLine;
                let lineComment = "";
                if (!hasDirectiveWithClosing) {
                  const commentMatch = origLine.match(/(.*?)(\/\/.*)$/);
                  lineWithoutComment = commentMatch ? commentMatch[1].trimEnd() : origLine;
                  lineComment = commentMatch ? commentMatch[2] : "";
                }
                if (hasDirectiveWithClosing) {
                  paramLineInfos.push({ line: paramContinuationIndent + directivePart.trim(), comment: "", isMultiline: true, lineIndex: lineIdx });
                  const hasComma = closingPart.includes(",");
                  const closingStr = hasComma ? ")," : ")";
                  const paddingNeeded = Math.max(0, paramClosingParenCol + 1 - (baseIndent + unit).length - 1);
                  const closingLine = baseIndent + unit + " ".repeat(paddingNeeded) + closingStr;
                  paramLineInfos.push({ line: closingLine, comment: "", isMultiline: true, lineIndex: lineIdx });
                } else if (lineIdx === 0) {
                  const trimmedWithoutComment = lineWithoutComment.trim();
                  const concatMatch = trimmedWithoutComment.match(/^\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+[\da-fA-F_]+|\([^)]+\))\s*(.*)$/);
                  if (concatMatch) {
                    isConcatenation = true;
                    paramContinuationIndent = " ".repeat((baseIndent + unit).length + 1 + maxParamPort + 2);
                    const paramName = concatMatch[1];
                    const firstValue = concatMatch[2];
                    const remainder = concatMatch[3].trim();
                    const paramPadded = paramName.padEnd(maxParamPort);
                    let formattedRemainder = remainder;
                    if (remainder.startsWith(",")) {
                      const spacesBeforeComma = Math.max(0, paramMaxSignalLen - firstValue.length);
                      const padding = spacesBeforeComma > 0 ? " ".repeat(spacesBeforeComma) : "";
                      formattedRemainder = padding + remainder;
                    }
                    const baseLine = baseIndent + unit + "." + paramPadded + "({" + firstValue + formattedRemainder;
                    paramLineInfos.push({ line: baseLine, comment: lineComment, isMultiline: true, lineIndex: lineIdx, isConcatenation: true });
                  } else {
                    const exprMatch = trimmedWithoutComment.match(/^\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*)$/);
                    if (exprMatch) {
                      isConcatenation = false;
                      const paramName = exprMatch[1];
                      const exprStart = exprMatch[2];
                      const paramPadded = paramName.padEnd(maxParamPort);
                      paramContinuationIndent = " ".repeat((baseIndent + unit).length + 1 + maxParamPort + 1);
                      const baseLine = baseIndent + unit + "." + paramPadded + "(" + exprStart;
                      paramLineInfos.push({ line: baseLine, comment: lineComment, isMultiline: true, lineIndex: lineIdx, isConcatenation: false });
                    } else {
                      paramLineInfos.push({ line: baseIndent + unit + trimmedWithoutComment, comment: lineComment, isMultiline: true, lineIndex: lineIdx });
                    }
                  }
                } else if (/^`(ifn?def|else|endif)/.test(origTrimmed)) {
                  paramLineInfos.push({ line: paramContinuationIndent + origTrimmed, comment: "", isMultiline: true, lineIndex: lineIdx });
                } else if (/^\/\//.test(origTrimmed)) {
                  paramLineInfos.push({ line: paramContinuationIndent + origTrimmed, comment: "", isMultiline: true, lineIndex: lineIdx });
                } else if (/}\s*\),?$/.test(lineWithoutComment.trim())) {
                  const trimmedWithoutComment = lineWithoutComment.trim();
                  const hasComma = trimmedWithoutComment.endsWith(",");
                  const simpleValueMatch = trimmedWithoutComment.match(/^([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+[\da-fA-F_]+)\s*}+\s*\)?/);
                  if (simpleValueMatch) {
                    const valueName = simpleValueMatch[1];
                    const bracePaddingNeeded = Math.max(0, paramMaxSignalLen - valueName.length);
                    const bracePadding = bracePaddingNeeded > 0 ? " ".repeat(bracePaddingNeeded) : "";
                    const closingBraces = "}";
                    const positionAfterBrace = paramContinuationIndent.length + valueName.length + bracePadding.length + closingBraces.length;
                    const parenPaddingNeeded = Math.max(0, paramClosingParenCol - positionAfterBrace);
                    const parenPadding = parenPaddingNeeded > 0 ? " ".repeat(parenPaddingNeeded) : "";
                    const baseLine = paramContinuationIndent + valueName + bracePadding + closingBraces + parenPadding + ")" + (hasComma ? "," : "");
                    paramLineInfos.push({ line: baseLine, comment: lineComment, isMultiline: true, lineIndex: lineIdx });
                  } else {
                    const replicationMatch = trimmedWithoutComment.match(/^(\{[^}]+\{[^}]+\}\})\s*}+\s*\)?/);
                    if (replicationMatch) {
                      const replicationExpr = replicationMatch[1];
                      const bracePaddingNeeded = Math.max(0, paramMaxSignalLen - replicationExpr.length);
                      const bracePadding = bracePaddingNeeded > 0 ? " ".repeat(bracePaddingNeeded) : "";
                      const closingBraces = "}";
                      const positionAfterBrace = paramContinuationIndent.length + replicationExpr.length + bracePadding.length + closingBraces.length;
                      const parenPaddingNeeded = Math.max(0, paramClosingParenCol - positionAfterBrace);
                      const parenPadding = parenPaddingNeeded > 0 ? " ".repeat(parenPaddingNeeded) : "";
                      const baseLine = paramContinuationIndent + replicationExpr + bracePadding + closingBraces + parenPadding + ")" + (hasComma ? "," : "");
                      paramLineInfos.push({ line: baseLine, comment: lineComment, isMultiline: true, lineIndex: lineIdx });
                    } else {
                      const closingBraces = "}";
                      const bracePaddingNeeded = Math.max(0, paramMaxSignalLen - closingBraces.length);
                      const bracePadding = bracePaddingNeeded > 0 ? " ".repeat(bracePaddingNeeded) : "";
                      const positionAfterBrace = paramContinuationIndent.length + bracePadding.length + closingBraces.length;
                      const parenPaddingNeeded = Math.max(0, paramClosingParenCol - positionAfterBrace);
                      const parenPadding = parenPaddingNeeded > 0 ? " ".repeat(parenPaddingNeeded) : "";
                      const baseLine = paramContinuationIndent + bracePadding + closingBraces + parenPadding + ")" + (hasComma ? "," : "");
                      paramLineInfos.push({ line: baseLine, comment: lineComment, isMultiline: true, lineIndex: lineIdx });
                    }
                  }
                } else {
                  const trimmedWithoutComment = lineWithoutComment.trim();
                  if (/\)\s*,?\s*$/.test(trimmedWithoutComment)) {
                    const contentWithoutClosing = trimmedWithoutComment.replace(/\s*\)\s*,?\s*$/, "").trim();
                    const hasComma = trimmedWithoutComment.endsWith(",");
                    const closingStr = hasComma ? ")," : ")";
                    const contentStartCol = paramContinuationIndent.length + contentWithoutClosing.length;
                    const paddingNeeded = Math.max(0, paramClosingParenCol - contentStartCol);
                    const baseLine = paramContinuationIndent + contentWithoutClosing + " ".repeat(paddingNeeded) + closingStr;
                    paramLineInfos.push({ line: baseLine, comment: lineComment, isMultiline: true, lineIndex: lineIdx });
                  } else {
                    const signalMatch = trimmedWithoutComment.match(/^([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+[\da-fA-F_]+|\([^)]+\))\s*(.*)$/);
                    if (signalMatch) {
                      const signalName = signalMatch[1];
                      const remainder = signalMatch[2].trim();
                      let formattedRemainder = remainder;
                      if (remainder.startsWith(",") || remainder.startsWith("}")) {
                        const spacesBeforeComma = paramMaxSignalLen - signalName.length;
                        const padding = spacesBeforeComma > 0 ? " ".repeat(spacesBeforeComma) : "";
                        formattedRemainder = padding + remainder;
                      }
                      const baseLine = paramContinuationIndent + signalName + formattedRemainder;
                      paramLineInfos.push({ line: baseLine, comment: lineComment, isMultiline: true, lineIndex: lineIdx });
                    } else {
                      const replicationMatch = trimmedWithoutComment.match(/^(\{\{?[^}]+\{[^}]+\}\})(.*?)$/);
                      if (replicationMatch) {
                        const replicationExpr = replicationMatch[1];
                        const remainder = replicationMatch[2].trim();
                        let formattedRemainder = remainder;
                        if (remainder.startsWith(",")) {
                          const exprLength = replicationExpr.length;
                          const paddingNeeded = Math.max(0, paramMaxSignalLen - exprLength);
                          const padding = paddingNeeded > 0 ? " ".repeat(paddingNeeded) : "";
                          formattedRemainder = padding + remainder;
                        } else if (remainder.startsWith("}")) {
                          const closingBraceMatch = remainder.match(/^(}+)(\s*\))(.*)$/);
                          if (closingBraceMatch) {
                            const closingBraces = closingBraceMatch[1];
                            const rest = closingBraceMatch[3];
                            const exprLength = replicationExpr.length;
                            const paddingNeeded = Math.max(0, paramMaxSignalLen - exprLength);
                            const padding = paddingNeeded > 0 ? " ".repeat(paddingNeeded) : "";
                            formattedRemainder = padding + closingBraces + ")" + rest;
                          } else {
                            const exprLength = replicationExpr.length;
                            const paddingNeeded = Math.max(0, paramMaxSignalLen - exprLength);
                            const padding = paddingNeeded > 0 ? " ".repeat(paddingNeeded) : "";
                            formattedRemainder = padding + remainder;
                          }
                        }
                        const baseLine = paramContinuationIndent + replicationExpr + formattedRemainder;
                        paramLineInfos.push({ line: baseLine, comment: lineComment, isMultiline: true, lineIndex: lineIdx });
                      } else {
                        const nestedMatch = trimmedWithoutComment.match(/^(\{[a-zA-Z_][a-zA-Z0-9_\[\]\-:]*)(.*?)$/);
                        if (nestedMatch) {
                          const signalPart = nestedMatch[1];
                          const remainder = nestedMatch[2].trim();
                          let formattedRemainder = remainder;
                          if (remainder.startsWith(",")) {
                            const exprLength = signalPart.length;
                            const paddingNeeded = Math.max(0, paramMaxSignalLen - exprLength);
                            const padding = paddingNeeded > 0 ? " ".repeat(paddingNeeded) : "";
                            formattedRemainder = padding + remainder;
                          }
                          const baseLine = paramContinuationIndent + signalPart + formattedRemainder;
                          paramLineInfos.push({ line: baseLine, comment: lineComment, isMultiline: true, lineIndex: lineIdx });
                        } else if (/^\s*\)\s*,?\s*$/.test(trimmedWithoutComment)) {
                          const hasComma = trimmedWithoutComment.includes(",");
                          const closingStr = hasComma ? ")," : ")";
                          const paddingNeeded = Math.max(0, paramClosingParenCol + 1 - (baseIndent + unit).length - 1);
                          const baseLine = baseIndent + unit + " ".repeat(paddingNeeded) + closingStr;
                          paramLineInfos.push({ line: baseLine, comment: lineComment, isMultiline: true, lineIndex: lineIdx });
                        } else if (/\)\s*,?\s*$/.test(trimmedWithoutComment)) {
                          const hasComma = trimmedWithoutComment.endsWith(",");
                          const contentWithoutClosing = trimmedWithoutComment.replace(/\s*\)\s*,?\s*$/, "").trim();
                          const closingStr = hasComma ? ")," : ")";
                          const contentStartCol = paramContinuationIndent.length + contentWithoutClosing.length;
                          const paddingNeeded = Math.max(0, paramClosingParenCol - contentStartCol - 1);
                          const baseLine = paramContinuationIndent + contentWithoutClosing + " ".repeat(paddingNeeded) + " " + closingStr;
                          paramLineInfos.push({ line: baseLine, comment: lineComment, isMultiline: true, lineIndex: lineIdx });
                        } else {
                          paramLineInfos.push({ line: paramContinuationIndent + trimmedWithoutComment, comment: lineComment, isMultiline: true, lineIndex: lineIdx });
                        }
                      }
                    }
                  }
                }
              }
            } else {
              const portPadded = p.port.padEnd(maxParamPort);
              let comma = "";
              let isLast = true;
              let foundDirective = false;
              for (let j = i + 1; j < parsed.length; j++) {
                if (parsed[j].type === "param_end")
                  break;
                if (parsed[j].type === "directive") {
                  foundDirective = true;
                  continue;
                }
                if (parsed[j].type === "param") {
                  if (!foundDirective) {
                    isLast = false;
                  }
                  break;
                }
              }
              if (foundDirective) {
                comma = p.hadComma ? "," : "";
              } else {
                comma = isLast ? "" : ",";
              }
              const currentPos = (baseIndent + unit).length + 1 + portPadded.length + 1 + p.conn.length;
              const paddingNeeded = Math.max(0, paramClosingParenCol - currentPos);
              const connPadded = p.conn + " ".repeat(paddingNeeded);
              const baseLine = baseIndent + unit + "." + portPadded + "(" + connPadded + ")" + comma;
              paramLineInfos.push({ line: baseLine, comment: p.comment || "", isMultiline: false });
            }
          } else if (p.type === "directive") {
            paramLineInfos.push({ line: baseIndent + unit + p.content, comment: "", isMultiline: false });
          } else if (p.type === "comma") {
            let nextIsIfdef = false;
            for (let j = i + 1; j < parsed.length; j++) {
              if (parsed[j].type === "directive") {
                if (/^`ifdef/.test(parsed[j].content)) {
                  nextIsIfdef = true;
                }
                break;
              }
              if (parsed[j].type !== "comma")
                break;
            }
            if (!nextIsIfdef) {
              paramLineInfos.push({ line: baseIndent + unit + ",", comment: "", isMultiline: false });
            }
            continue;
          }
        }
        const maxParamLineLength = Math.max(0, ...paramLineInfos.filter((info) => info.comment && !info.line.includes("//") && !info.line.includes("`")).map((info) => info.line.length));
        paramLineInfos.forEach((info) => {
          if (info.comment && info.comment.trim()) {
            const paddingNeeded = Math.max(1, maxParamLineLength - info.line.length + 1);
            result.push(info.line + " ".repeat(paddingNeeded) + info.comment);
          } else {
            result.push(info.line);
          }
        });
        result.push(baseIndent + unit + ")");
        result.push(baseIndent + unit + instanceName + "(");
      } else {
        result.push(baseIndent + moduleName + " " + instanceName + "(");
      }
      const portIndent = hasParameters ? baseIndent + unit + unit : baseIndent + unit;
      let hasCommaLeftConcat = false;
      let hasCommaRightConcat = false;
      let globalMaxSignalLen = 0;
      for (let i = 0; i < parsed.length; i++) {
        const p = parsed[i];
        if (p.type === "port" && p.conn === "MULTILINE" && p.originalLines) {
          for (let lineIdx = 1; lineIdx < p.originalLines.length; lineIdx++) {
            const trimmed = p.originalLines[lineIdx].trim();
            if (trimmed.startsWith(",")) {
              hasCommaLeftConcat = true;
            } else if (!trimmed.startsWith("`") && !trimmed.startsWith("//") && /,/.test(trimmed)) {
              hasCommaRightConcat = true;
            }
          }
          if (p.maxSignalLen && p.maxSignalLen > globalMaxSignalLen) {
            globalMaxSignalLen = p.maxSignalLen;
          }
        }
      }
      const singleLineClosingCol = portIndent.length + 1 + maxPortPort + 1 + maxPortConn;
      const commaLeftClosingCol = globalMaxSignalLen > 0 && hasCommaLeftConcat ? portIndent.length + 1 + maxPortPort + 2 + (globalMaxSignalLen + 2) + 1 : 0;
      const commaRightClosingCol = globalMaxSignalLen > 0 && hasCommaRightConcat ? portIndent.length + 1 + maxPortPort + 2 + globalMaxSignalLen + 1 : 0;
      const portClosingParenCol = Math.max(singleLineClosingCol, commaLeftClosingCol, commaRightClosingCol);
      const anyPortComma = parsed.filter((x) => x.type === "port").length > 1;
      let inPorts = false;
      for (let i = 0; i < parsed.length; i++) {
        const p = parsed[i];
        if (p.type === "inst_start") {
          inPorts = true;
          continue;
        }
        if (!inPorts)
          continue;
        if (p.type === "inst_end")
          break;
        if (p.type === "port" && p.port && p.conn !== void 0) {
          if (p.conn === "MULTILINE" && p.originalLines && p.maxSignalLen !== void 0) {
            const continuationIndent = " ".repeat(portIndent.length + 1 + maxPortPort + 2);
            const portMaxSignalLen = p.maxSignalLen;
            let portHasCommaLeft = false;
            for (let lineIdx = 1; lineIdx < p.originalLines.length; lineIdx++) {
              const trimmed = p.originalLines[lineIdx].trim();
              if (trimmed.startsWith(",") && !trimmed.startsWith("`") && !trimmed.startsWith("//")) {
                portHasCommaLeft = true;
                break;
              }
            }
            for (let lineIdx = 0; lineIdx < p.originalLines.length; lineIdx++) {
              const origLine = p.originalLines[lineIdx];
              const origTrimmed = origLine.trim();
              let hasDirectiveWithClosing = false;
              let directivePart = "";
              let closingPart = "";
              if (/^`(ifn?def|else|endif)/.test(origTrimmed)) {
                const directiveMatch = origTrimmed.match(/^(`(?:ifdef|ifndef|else|endif)(?:\s+\/\/[^\)\}]+)?)\s*([\)\}]+\s*,?\s*)$/);
                if (directiveMatch) {
                  hasDirectiveWithClosing = true;
                  directivePart = directiveMatch[1];
                  closingPart = directiveMatch[2];
                }
              }
              if (hasDirectiveWithClosing) {
                result.push(continuationIndent + directivePart.trim());
                const hasComma = closingPart.includes(",");
                const closingStr = closingPart.trim().replace(/\s+/g, "").replace(/,/g, "") + (hasComma ? "," : "");
                const paddingNeeded = Math.max(0, portClosingParenCol - portIndent.length - closingStr.length);
                const closingLine = portIndent + " ".repeat(paddingNeeded) + closingStr;
                result.push(closingLine);
              } else if (lineIdx === 0) {
                const firstLineMatch = origTrimmed.match(/^\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+[\da-fA-F_]+)\s*(.*)$/);
                if (firstLineMatch) {
                  const portName = firstLineMatch[1];
                  const firstSignal = firstLineMatch[2];
                  const remainder = firstLineMatch[3].trim();
                  const portPadded = portName.padEnd(maxPortPort);
                  let formattedRemainder = remainder;
                  if (remainder.startsWith(",")) {
                    const spacesBeforeComma = portMaxSignalLen - firstSignal.length;
                    const padding = spacesBeforeComma > 0 ? " ".repeat(spacesBeforeComma) : "";
                    formattedRemainder = padding + remainder;
                  }
                  result.push(portIndent + "." + portPadded + "({" + firstSignal + formattedRemainder);
                } else {
                  const replicationFirstMatch = origTrimmed.match(/^\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\{(\{\{?[^,}]+\{[^}]+\}\}|[a-zA-Z_][a-zA-Z0-9_\[\]\-:]+|\d+'\w+[\da-fA-F_]+)\s*(.*)$/);
                  if (replicationFirstMatch) {
                    const portName = replicationFirstMatch[1];
                    const firstExpr = replicationFirstMatch[2];
                    const remainder = replicationFirstMatch[3].trim();
                    const portPadded = portName.padEnd(maxPortPort);
                    let formattedRemainder = remainder;
                    if (remainder.startsWith(",")) {
                      const spacesBeforeComma = portMaxSignalLen - firstExpr.length;
                      const padding = spacesBeforeComma > 0 ? " ".repeat(spacesBeforeComma) : "";
                      formattedRemainder = padding + remainder;
                    }
                    result.push(portIndent + "." + portPadded + "({" + firstExpr + formattedRemainder);
                  } else {
                    result.push(portIndent + origTrimmed);
                  }
                }
              } else if (/^`(ifn?def|else|endif)/.test(origTrimmed) || /^\/\//.test(origTrimmed)) {
                result.push(continuationIndent + origTrimmed);
              } else if (/}\s*\),?$/.test(origTrimmed)) {
                const closingMatch = origTrimmed.match(/^(.+?)(}+)(\s*\))(,?)$/);
                if (closingMatch && !closingMatch[1].match(/^}+$/)) {
                  const expressionContent = closingMatch[1].trim();
                  const closingBraces = closingMatch[2];
                  const hasComma = closingMatch[4] === ",";
                  if (closingBraces.length > 1 && expressionContent.includes("{")) {
                    const innerClosingBrace = "}";
                    const outerClosingBraces = closingBraces.substring(1);
                    const exprWithInnerBrace = expressionContent + innerClosingBrace;
                    const commaLeftOffset = portHasCommaLeft ? 2 : 0;
                    const bracePaddingNeeded = Math.max(0, portMaxSignalLen + commaLeftOffset - exprWithInnerBrace.length);
                    const bracePadding = bracePaddingNeeded > 0 ? " ".repeat(bracePaddingNeeded) : "";
                    const positionAfterBrace = continuationIndent.length + exprWithInnerBrace.length + bracePadding.length + outerClosingBraces.length;
                    const parenPaddingNeeded = Math.max(0, portClosingParenCol - positionAfterBrace);
                    const parenPadding = parenPaddingNeeded > 0 ? " ".repeat(parenPaddingNeeded) : "";
                    result.push(continuationIndent + exprWithInnerBrace + bracePadding + outerClosingBraces + parenPadding + ")" + (hasComma ? "," : ""));
                  } else {
                    const bracePaddingNeeded = Math.max(0, portMaxSignalLen - expressionContent.length);
                    const bracePadding = bracePaddingNeeded > 0 ? " ".repeat(bracePaddingNeeded) : "";
                    const positionAfterBrace = continuationIndent.length + expressionContent.length + bracePadding.length + closingBraces.length;
                    const parenPaddingNeeded = Math.max(0, portClosingParenCol - positionAfterBrace);
                    const parenPadding = parenPaddingNeeded > 0 ? " ".repeat(parenPaddingNeeded) : "";
                    result.push(continuationIndent + expressionContent + bracePadding + closingBraces + parenPadding + ")" + (hasComma ? "," : ""));
                  }
                } else {
                  const standaloneClosingMatch = origTrimmed.match(/^(}+)(\s*\))(,?)$/);
                  if (standaloneClosingMatch) {
                    const closingBraces = standaloneClosingMatch[1];
                    const hasComma = standaloneClosingMatch[3] === ",";
                    const commaLeftOffset = portHasCommaLeft ? 2 : 0;
                    const bracePaddingNeeded = Math.max(0, portMaxSignalLen + commaLeftOffset - closingBraces.length);
                    const bracePadding = bracePaddingNeeded > 0 ? " ".repeat(bracePaddingNeeded) : "";
                    const positionAfterBrace = continuationIndent.length + bracePadding.length + closingBraces.length;
                    const parenPaddingNeeded = Math.max(0, portClosingParenCol - positionAfterBrace);
                    const parenPadding = parenPaddingNeeded > 0 ? " ".repeat(parenPaddingNeeded) : "";
                    const closingLine = continuationIndent + bracePadding + closingBraces + parenPadding + ")" + (hasComma ? "," : "");
                    result.push(closingLine);
                  } else {
                    result.push(continuationIndent + origTrimmed);
                  }
                }
              } else {
                const signalMatch = origTrimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+[\da-fA-F_]+)\s*(.*)$/);
                if (signalMatch) {
                  const signalName = signalMatch[1];
                  const remainder = signalMatch[2].trim();
                  let formattedRemainder = remainder;
                  if (remainder.startsWith(",") || remainder.startsWith("}")) {
                    const spacesBeforeComma = portMaxSignalLen - signalName.length;
                    const padding = spacesBeforeComma > 0 ? " ".repeat(spacesBeforeComma) : "";
                    formattedRemainder = padding + remainder;
                  }
                  result.push(continuationIndent + signalName + formattedRemainder);
                } else {
                  const replicationMatch = origTrimmed.match(/^(\{\{?[^}]+\{[^}]+\}\})(.*?)$/);
                  if (replicationMatch) {
                    const replicationExpr = replicationMatch[1];
                    const remainder = replicationMatch[2].trim();
                    let formattedRemainder = remainder;
                    if (remainder.startsWith(",")) {
                      const exprLength = replicationExpr.length;
                      const paddingNeeded = Math.max(0, portMaxSignalLen - exprLength);
                      const padding = paddingNeeded > 0 ? " ".repeat(paddingNeeded) : "";
                      formattedRemainder = padding + remainder;
                    } else if (remainder.startsWith("}")) {
                      const closingBraceMatch = remainder.match(/^(}+)(\s*\))(.*)$/);
                      if (closingBraceMatch) {
                        const closingBraces = closingBraceMatch[1];
                        const rest = closingBraceMatch[3];
                        const exprLength = replicationExpr.length;
                        const paddingNeeded = Math.max(0, portMaxSignalLen - exprLength);
                        const padding = paddingNeeded > 0 ? " ".repeat(paddingNeeded) : "";
                        formattedRemainder = padding + closingBraces + ")" + rest;
                      } else {
                        const exprLength = replicationExpr.length;
                        const paddingNeeded = Math.max(0, portMaxSignalLen - exprLength);
                        const padding = paddingNeeded > 0 ? " ".repeat(paddingNeeded) : "";
                        formattedRemainder = padding + remainder;
                      }
                    }
                    result.push(continuationIndent + replicationExpr + formattedRemainder);
                  } else {
                    const nestedMatch = origTrimmed.match(/^(\{[a-zA-Z_][a-zA-Z0-9_\[\]\-:]*)(.*?)$/);
                    if (nestedMatch) {
                      const signalPart = nestedMatch[1];
                      const remainder = nestedMatch[2].trim();
                      let formattedRemainder = remainder;
                      if (remainder.startsWith(",")) {
                        const exprLength = signalPart.length;
                        const paddingNeeded = Math.max(0, portMaxSignalLen - exprLength);
                        const padding = paddingNeeded > 0 ? " ".repeat(paddingNeeded) : "";
                        formattedRemainder = padding + remainder;
                      }
                      result.push(continuationIndent + signalPart + formattedRemainder);
                    } else {
                      result.push(continuationIndent + origTrimmed);
                    }
                  }
                }
              }
            }
          } else {
            const portPadded = p.port.padEnd(maxPortPort);
            let comma = "";
            let isLast = true;
            let foundDirective = false;
            for (let j = i + 1; j < parsed.length; j++) {
              if (parsed[j].type === "inst_end")
                break;
              if (parsed[j].type === "directive") {
                foundDirective = true;
                continue;
              }
              if (parsed[j].type === "port") {
                if (!foundDirective) {
                  isLast = false;
                }
                break;
              }
            }
            if (foundDirective) {
              comma = p.hadComma ? "," : "";
            } else {
              comma = isLast ? "" : ",";
            }
            const currentPos = portIndent.length + 1 + portPadded.length + 1 + p.conn.length;
            const paddingNeeded = Math.max(0, portClosingParenCol - currentPos);
            const connPadded = p.conn + " ".repeat(paddingNeeded);
            const commentStr = p.comment ? (comma === "" && anyPortComma ? "  " : " ") + p.comment : "";
            result.push(portIndent + "." + portPadded + "(" + connPadded + ")" + comma + commentStr);
          }
        } else if (p.type === "directive") {
          result.push(portIndent + p.content);
        } else if (p.type === "comma") {
          let nextIsIfdef = false;
          for (let j = i + 1; j < parsed.length; j++) {
            if (parsed[j].type === "directive") {
              if (/^`ifdef/.test(parsed[j].content)) {
                nextIsIfdef = true;
              }
              break;
            }
            if (parsed[j].type !== "comma")
              break;
          }
          if (!nextIsIfdef) {
            result.push(portIndent + ",");
          }
          continue;
        }
      }
      result.push(portIndent + ");");
      return result;
    }
  }
});

// dist/formatter/formatting/instantiations.js
var require_instantiations = __commonJS({
  "dist/formatter/formatting/instantiations.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.formatModuleInstantiations = formatModuleInstantiations;
    var singleInstantiation_1 = require_singleInstantiation();
    function formatModuleInstantiations(lines, indentSize) {
      var _a;
      const unit = " ".repeat(indentSize);
      const result = [];
      let i = 0;
      while (i < lines.length) {
        const line = lines[i];
        const instMatch = line.match(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s+#\s*\(/);
        const simpleInstMatch = !instMatch && !line.trim().startsWith("else ") && !line.trim().startsWith("generate ") && line.match(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
        let splitParamMatch = null;
        if (!instMatch && !simpleInstMatch) {
          const moduleHashMatch = line.match(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s+#\s*$/);
          if (moduleHashMatch && i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            if (/^\s*\(/.test(nextLine)) {
              splitParamMatch = moduleHashMatch;
            }
          }
        }
        let splitInstMatch = null;
        if (!instMatch && !simpleInstMatch && !splitParamMatch) {
          const moduleOnlyMatch = line.match(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)$/);
          if (moduleOnlyMatch && i + 1 < lines.length) {
            const moduleName = moduleOnlyMatch[2];
            const keywords = ["begin", "end", "if", "else", "case", "endcase", "for", "while", "repeat", "forever", "initial", "always", "always_ff", "always_comb", "always_latch", "function", "task", "endfunction", "endtask", "module", "endmodule", "input", "output", "inout", "wire", "reg", "logic", "integer", "parameter", "localparam", "generate", "endgenerate"];
            if (!keywords.includes(moduleName.toLowerCase())) {
              const nextLine = lines[i + 1];
              const instOnNext = nextLine.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
              if (instOnNext && !line.trim().startsWith("module")) {
                splitInstMatch = moduleOnlyMatch;
              }
            }
          }
        }
        if ((instMatch || simpleInstMatch || splitInstMatch || splitParamMatch) && !line.trim().startsWith("module ")) {
          const match = instMatch || simpleInstMatch || splitInstMatch || splitParamMatch;
          let baseIndent = match[1];
          for (let lookback = i - 1; lookback >= Math.max(0, i - 10); lookback--) {
            const prevLine = lines[lookback];
            const prevTrimmed = prevLine.trim();
            if (!prevTrimmed || prevTrimmed.startsWith("//"))
              continue;
            const codePart = prevTrimmed.replace(/\/\/.*$/, "").trim();
            if (!codePart)
              continue;
            if (/^(end|endgenerate|endcase|endfunction|endtask|endmodule)\b/.test(codePart)) {
              break;
            }
            const isBlockOpener = /^(begin|always|always_ff|always_comb|always_latch|initial|if|else|for|while|foreach|generate)\b/.test(codePart) || /\bbegin\b(\s*:\s*\w+)?$/.test(codePart);
            if (isBlockOpener) {
              const openerIndent = ((_a = prevLine.match(/^(\s*)/)) == null ? void 0 : _a[1]) || "";
              baseIndent = openerIndent + unit;
              break;
            }
            if (/^(wire|reg|logic|assign|input|output|inout|parameter|localparam)\b/.test(codePart)) {
              baseIndent = ((_a = prevLine.match(/^(\s*)/)) == null ? void 0 : _a[1]) || "";
              break;
            }
          }
          const instLines = [line];
          let braceCount = (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
          let j = i + 1;
          const needsContinuation = splitParamMatch !== null;
          while (j < lines.length && (braceCount > 0 || needsContinuation || !/;\s*$/.test(instLines[instLines.length - 1]))) {
            instLines.push(lines[j]);
            braceCount += (lines[j].match(/\(/g) || []).length - (lines[j].match(/\)/g) || []).length;
            j++;
            if (braceCount === 0 && /;\s*$/.test(instLines[instLines.length - 1])) {
              break;
            }
          }
          const formatted = (0, singleInstantiation_1.formatSingleInstantiation)(instLines, baseIndent, unit);
          formatted.forEach((l) => result.push(l));
          i = j;
        } else {
          result.push(line);
          i++;
        }
      }
      return result;
    }
  }
});

// dist/formatter/indentation/alwaysBlocks.js
var require_alwaysBlocks = __commonJS({
  "dist/formatter/indentation/alwaysBlocks.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.indentAlwaysBlocks = indentAlwaysBlocks;
    function indentAlwaysBlocks(lines, indentSize) {
      var _a, _b;
      const unit = " ".repeat(indentSize);
      const result = [];
      let insideAlways = false;
      let alwaysIndent = "";
      let insideCase = false;
      let beginEndStack = [];
      let funcTaskDepth = 0;
      const funcDirectiveStack = [];
      const mergedLines = [];
      let tempInsideAlways = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (/^\s*always(?:_ff|_comb|_latch)?\b/.test(line)) {
          tempInsideAlways = true;
          mergedLines.push(line);
          continue;
        }
        if (tempInsideAlways && /^\s*end\b/.test(line) && !/\belse\b/.test(line)) {
          let nextElseIndex = -1;
          let hasIfdefBetween = false;
          for (let j = i + 1; j < lines.length; j++) {
            const nextTrimmed = lines[j].trim();
            if (nextTrimmed === "")
              continue;
            if (/^`(ifdef|ifndef|elsif|else|endif)/.test(nextTrimmed)) {
              hasIfdefBetween = true;
              break;
            }
            if (/^\s*else\b/.test(lines[j])) {
              nextElseIndex = j;
            }
            break;
          }
          if (nextElseIndex !== -1 && !hasIfdefBetween) {
            const elseLine = lines[nextElseIndex];
            const elseContent = elseLine.trim();
            const endIndent = ((_a = line.match(/^(\s*)/)) == null ? void 0 : _a[1]) || "";
            mergedLines.push(endIndent + "end " + elseContent);
            i = nextElseIndex;
            continue;
          }
        }
        if (tempInsideAlways && /^\s*end\b/.test(line) && i === lines.length - 1) {
          tempInsideAlways = false;
        }
        mergedLines.push(line);
      }
      function neighborIndentForDirective(idx) {
        for (let j = idx + 1; j < mergedLines.length; j++) {
          const t = mergedLines[j].trim();
          if (t === "" || t.startsWith("`"))
            continue;
          const m = mergedLines[j].match(/^(\s*)/);
          return m ? m[1] : "";
        }
        for (let j = idx - 1; j >= 0; j--) {
          const t = mergedLines[j].trim();
          if (t === "" || t.startsWith("`"))
            continue;
          const m = mergedLines[j].match(/^(\s*)/);
          return m ? m[1] : "";
        }
        return "";
      }
      function directiveIndentInFunc(idx, dirTrimmed) {
        const nextNonBlank = mergedLines.slice(idx + 1).find((l) => l.trim() !== "");
        if (nextNonBlank && /^\s*[\)\}]/.test(nextNonBlank)) {
          return null;
        }
        if (/^`endif/.test(dirTrimmed)) {
          return funcDirectiveStack.length > 0 ? funcDirectiveStack.pop() : neighborIndentForDirective(idx);
        }
        if (/^`(else|elsif)/.test(dirTrimmed)) {
          return funcDirectiveStack.length > 0 ? funcDirectiveStack[funcDirectiveStack.length - 1] : neighborIndentForDirective(idx);
        }
        const ind = neighborIndentForDirective(idx);
        funcDirectiveStack.push(ind);
        return ind;
      }
      function hasInlineBody(t) {
        let s = t.replace(/\/\/.*$/, "").trim();
        s = s.replace(/^end\s+/, "");
        const isElseIf = /^else\s+if\b/.test(s);
        if (/^else\b/.test(s) && !isElseIf) {
          const rest = s.replace(/^else\b\s*/, "");
          return rest !== "" && !/^begin\b/.test(rest);
        }
        const m = s.match(/\b(if|for)\s*\(/);
        if (!m)
          return false;
        const openIdx = s.indexOf("(", m.index);
        let depth = 0;
        let closeIdx = -1;
        for (let k = openIdx; k < s.length; k++) {
          if (s[k] === "(")
            depth++;
          else if (s[k] === ")") {
            depth--;
            if (depth === 0) {
              closeIdx = k;
              break;
            }
          }
        }
        if (closeIdx === -1)
          return false;
        const rest = s.slice(closeIdx + 1).trim();
        return rest !== "" && !/^begin\b/.test(rest);
      }
      function countBeginEnd(t) {
        let s = t.replace(/\/\/.*$/, "");
        s = s.replace(/"(?:\\.|[^"\\])*"/g, '""');
        const b = (s.match(/\bbegin\b/g) || []).length;
        const e = (s.match(/\bend\b/g) || []).length;
        return b - e;
      }
      let expectSingleStatement = false;
      let singleStatementDepth = 0;
      for (let i = 0; i < mergedLines.length; i++) {
        const line = mergedLines[i];
        const trimmed = line.trim();
        if (/^(?:virtual\s+)?(?:automatic\s+|static\s+)?(?:function|task)\b/.test(trimmed)) {
          funcTaskDepth++;
        } else if (/^end(?:function|task)\b/.test(trimmed)) {
          funcTaskDepth = Math.max(0, funcTaskDepth - 1);
          if (funcTaskDepth === 0) {
            funcDirectiveStack.length = 0;
          }
        }
        if (/^`(ifdef|ifndef|elsif|else|endif)/.test(trimmed)) {
          if (insideAlways && !insideCase) {
            let nestingLevel = beginEndStack.length;
            const ifdefIndent = alwaysIndent + unit.repeat(nestingLevel);
            result.push(ifdefIndent + trimmed);
            expectSingleStatement = false;
          } else if (funcTaskDepth > 0 && !insideCase) {
            const dirIndent = directiveIndentInFunc(i, trimmed);
            if (dirIndent === null) {
              result.push(line);
            } else {
              result.push(dirIndent + trimmed);
            }
          } else {
            result.push(line);
          }
          continue;
        }
        if (/^\s*always(?:_ff|_comb|_latch)?\b/.test(line)) {
          alwaysIndent = ((_b = line.match(/^(\s*)/)) == null ? void 0 : _b[1]) || "";
          insideAlways = true;
          beginEndStack = [];
          if (/\bbegin\b/.test(trimmed)) {
            beginEndStack.push("begin");
          } else {
            expectSingleStatement = true;
          }
          result.push(line);
          continue;
        }
        if (insideAlways && !insideCase) {
          let hasEnd = false;
          if (/^\s*end\b/.test(line) || /\bend\b\s+else/.test(line)) {
            if (/\bend\b\s+else\s+begin\b/.test(line)) {
              if (beginEndStack.length > 0) {
                beginEndStack.pop();
                hasEnd = true;
              }
            } else {
              if (beginEndStack.length > 1) {
                beginEndStack.pop();
                hasEnd = true;
              } else if (beginEndStack.length === 1) {
                insideAlways = false;
                result.push(alwaysIndent + trimmed);
                continue;
              } else {
                insideAlways = false;
                result.push(line);
                continue;
              }
            }
          }
          const isElse = /^\s*else\b/.test(line) || /\bend\s+else\b/.test(line);
          const isIf = /^\s*if\s*\(/.test(trimmed) || /\belse\s+if\s*\(/.test(trimmed);
          const isFor = /^\s*for\s*\(/.test(trimmed);
          let nestingLevel = beginEndStack.length + singleStatementDepth;
          if (!expectSingleStatement && singleStatementDepth > 0) {
            singleStatementDepth = 0;
            nestingLevel = beginEndStack.length;
            if (insideAlways && beginEndStack.length === 0) {
              insideAlways = false;
            }
          }
          if (expectSingleStatement && !isElse) {
            nestingLevel++;
            singleStatementDepth++;
            if (!isIf && !isFor) {
              expectSingleStatement = false;
            }
          }
          const currentLineIndent = alwaysIndent + unit.repeat(nestingLevel);
          const hasBegin = /\bbegin\b/.test(trimmed);
          if (hasBegin) {
            if (hasEnd) {
              beginEndStack.push("begin");
            } else {
              const netBegin = countBeginEnd(trimmed);
              for (let bz = 0; bz < netBegin; bz++) {
                beginEndStack.push("begin");
              }
            }
            expectSingleStatement = false;
          } else if (isIf || isElse || isFor) {
            expectSingleStatement = !hasInlineBody(trimmed);
          }
          if (trimmed !== "") {
            let normalizedTrimmed = trimmed;
            if (!/^\s*for\s*\(/.test(trimmed) && !/^\s*assign\b/.test(trimmed)) {
              normalizedTrimmed = __normalizeEqSpacing(normalizedTrimmed);
            }
            const newLine = currentLineIndent + normalizedTrimmed;
            result.push(newLine);
            continue;
          }
        }
        if (insideAlways && /^case[xz]?\b/.test(trimmed)) {
          insideCase = true;
        }
        if (insideCase && /^endcase\b/.test(trimmed)) {
          insideCase = false;
          result.push(line);
          continue;
        }
        if (insideAlways && !insideCase && trimmed !== "") {
          const nestingLevel = beginEndStack.length;
          const newIndent = alwaysIndent + unit.repeat(nestingLevel);
          const newLine = newIndent + trimmed;
          result.push(newLine);
        } else {
          result.push(line);
        }
      }
      return result;
    }
  }
});

// dist/formatter/indentation/caseStatements.js
var require_caseStatements = __commonJS({
  "dist/formatter/indentation/caseStatements.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.indentCaseStatements = indentCaseStatements;
    function indentCaseStatements(lines, indentSize) {
      var _a;
      const unit = " ".repeat(indentSize);
      const result = [];
      const caseStack = [];
      let blockDepth = 0;
      const blockDepthAtCaseStart = [];
      const indentStack = [];
      let inMultiLineIf = false;
      let multiLineIfIndent = "";
      let lastIndentAdjustment = 0;
      let alwaysBlockIndent = "";
      const ifdefStateStack = [];
      function snapshotCaseState() {
        return {
          blockDepth,
          caseStack: caseStack.map((e) => ({ ...e })),
          blockDepthAtCaseStart: blockDepthAtCaseStart.slice(),
          indentStack: indentStack.slice(),
          inMultiLineIf,
          multiLineIfIndent,
          lastIndentAdjustment
        };
      }
      function restoreCaseState(s) {
        blockDepth = s.blockDepth;
        caseStack.length = 0;
        for (const e of s.caseStack)
          caseStack.push({ ...e });
        blockDepthAtCaseStart.length = 0;
        for (const e of s.blockDepthAtCaseStart)
          blockDepthAtCaseStart.push(e);
        indentStack.length = 0;
        for (const e of s.indentStack)
          indentStack.push(e);
        inMultiLineIf = s.inMultiLineIf;
        multiLineIfIndent = s.multiLineIfIndent;
        lastIndentAdjustment = s.lastIndentAdjustment;
      }
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        const currentIndent = ((_a = line.match(/^(\s*)/)) == null ? void 0 : _a[1]) || "";
        if (/^\s*always(?:_ff|_comb|_latch)?\b/.test(line)) {
          alwaysBlockIndent = currentIndent + unit;
        }
        if (alwaysBlockIndent && /^\s*endmodule\b/.test(line)) {
          alwaysBlockIndent = "";
        }
        if (blockDepth < 0)
          blockDepth = 0;
        if (/^\s*`(ifdef|ifndef|elsif|else|endif)\b/.test(trimmed)) {
          let dirIndent;
          if (caseStack.length > 0) {
            const ci = caseStack[caseStack.length - 1];
            dirIndent = indentStack.length > 0 ? indentStack[indentStack.length - 1] : ci.caseIndent + unit + unit;
          } else {
            dirIndent = currentIndent;
          }
          if (/^\s*`(ifdef|ifndef)\b/.test(trimmed)) {
            ifdefStateStack.push(snapshotCaseState());
          } else if (/^\s*`(else|elsif)\b/.test(trimmed)) {
            if (ifdefStateStack.length > 0)
              restoreCaseState(ifdefStateStack[ifdefStateStack.length - 1]);
          } else if (ifdefStateStack.length > 0) {
            restoreCaseState(ifdefStateStack.pop());
          }
          result.push(dirIndent + trimmed);
          lastIndentAdjustment = 0;
          continue;
        }
        if (caseStack.length === 0 && !/^\s*case[xz]?\b/.test(line)) {
          result.push(line);
          lastIndentAdjustment = 0;
          if (/\bend\s+else\s+begin\b/.test(line) && !/\/\/.*\bend\s+else\s+begin\b/.test(line)) {
            // `end else begin` closes one block and opens another: net-zero on
            // block depth. Pop the closed block before pushing the else block so
            // a following top-level case is not over-indented by a stale entry.
            if (indentStack.length > 0) {
              indentStack.pop();
            }
            const elseBlockIndent = currentIndent + unit;
            indentStack.push(elseBlockIndent);
          } else {
            if (/\bbegin\b/.test(line) && !/\/\/.*\bbegin\b/.test(line)) {
              blockDepth++;
              const beginBlockIndent = currentIndent + unit;
              indentStack.push(beginBlockIndent);
            }
            if (/^\s*end\b/.test(line) && !/\/\/.*\bend\b/.test(line)) {
              blockDepth--;
              if (indentStack.length > 0) {
                indentStack.pop();
              }
            }
          }
          continue;
        }
        if (caseStack.length === 0 && blockDepth === 0 && /^\s*(wire|reg|logic|input|output|inout)\b/.test(line)) {
          result.push(line);
          lastIndentAdjustment = 0;
          continue;
        }
        if (caseStack.length === 0 && blockDepth === 0 && lastIndentAdjustment !== 0) {
          if (currentIndent.length > unit.length * 2 && trimmed !== "") {
            const adjustedIndent = " ".repeat(currentIndent.length + lastIndentAdjustment);
            result.push(adjustedIndent + trimmed);
            continue;
          } else {
            lastIndentAdjustment = 0;
          }
        }
        if (/^\s*case[xz]?\b/.test(line)) {
          if (/\bbegin\b/.test(trimmed) && !/\/\/.*\bbegin\b/.test(line)) {
            blockDepth++;
          }
          let properIndent = indentStack.length > 0 ? indentStack[indentStack.length - 1] : currentIndent;
          if (properIndent.length === 0 && caseStack.length === 0) {
            properIndent = currentIndent.length > 0 ? currentIndent : alwaysBlockIndent || currentIndent;
          }
          if (currentIndent.length === 0 && alwaysBlockIndent && caseStack.length === 0 && (indentStack.length === 0 || properIndent.length < alwaysBlockIndent.length)) {
            properIndent = alwaysBlockIndent;
          }
          if (caseStack.length > 0) {
            if (indentStack.length === 0) {
              const parentCase = caseStack[caseStack.length - 1];
              const parentBlockDepth = blockDepthAtCaseStart[blockDepthAtCaseStart.length - 1];
              properIndent = parentCase.caseIndent + unit + unit;
              const extraBlockLevels = blockDepth - parentBlockDepth - 1;
              if (extraBlockLevels > 0) {
                properIndent += unit.repeat(extraBlockLevels);
              }
            }
          }
          caseStack.push({
            caseIndent: properIndent,
            inCaseItem: false,
            caseItemIndent: properIndent + unit
          });
          blockDepthAtCaseStart.push(blockDepth);
          const outputLine = properIndent + trimmed;
          result.push(outputLine);
          continue;
        }
        if (/^\s*endcase\b/.test(line) && caseStack.length > 0) {
          const caseInfo = caseStack.pop();
          blockDepthAtCaseStart.pop();
          result.push(caseInfo.caseIndent + "endcase");
          const alwaysIndent = caseInfo.caseIndent.length >= unit.length ? caseInfo.caseIndent.substring(0, caseInfo.caseIndent.length - unit.length) : "";
          if (indentStack.length > 0) {
            indentStack.length = 0;
          }
          indentStack.push(alwaysIndent);
          if (/^\s*end\b/.test(line) && !/\/\/.*\bend\b/.test(line)) {
            blockDepth--;
          }
          continue;
        }
        if (/^\s*end\b/.test(line) && !/\/\/.*\bend\b/.test(line) && caseStack.length === 0 && indentStack.length > 0) {
          let prevWasEndcase = false;
          for (let j = result.length - 1; j >= 0; j--) {
            const prevLine = result[j].trim();
            if (prevLine === "")
              continue;
            if (/^endcase\b/.test(prevLine)) {
              prevWasEndcase = true;
            }
            break;
          }
          if (prevWasEndcase) {
            blockDepth--;
            const poppedIndent = indentStack.pop();
            let endIndent = poppedIndent || "";
            result.push(endIndent + "end");
            continue;
          }
        }
        if (caseStack.length > 0) {
          const caseInfo = caseStack[caseStack.length - 1];
          const isCaseItemWithBegin = /^\s*(\{[^}]+\}|[\w']+(?:,\s*[\w']+)*)\s*:\s*begin\b/.test(line) || /^\s*default\s*:\s*begin\b/.test(line);
          const isCaseItemSingleLine = /^\s*(\{[^}]+\}|[\w']+(?:,\s*[\w']+)*)\s*:\s*.+$/.test(line) || /^\s*default\s*:\s*.+$/.test(line);
          if (isCaseItemWithBegin || isCaseItemSingleLine) {
            caseInfo.inCaseItem = true;
            let normalizedTrimmed = trimmed;
            if (!/^\s*for\s*\(/.test(trimmed) && !/^\s*assign\b/.test(trimmed)) {
              normalizedTrimmed = __normalizeEqSpacing(normalizedTrimmed);
            }
            result.push(caseInfo.caseItemIndent + normalizedTrimmed);
            if (/\bbegin\b/.test(trimmed) && !/\/\/.*\bbegin\b/.test(line)) {
              blockDepth++;
              const contentIndent = caseInfo.caseIndent + unit + unit;
              indentStack.push(contentIndent);
            }
            continue;
          }
          if (/^\s*end\s*$/.test(line) || /^\s*end\s+[A-Z_]/.test(line) || /^\s*end\s*\/\//.test(line)) {
            let isCaseItemEnd = false;
            for (let j = i + 1; j < lines.length; j++) {
              const nextLine = lines[j].trim();
              if (nextLine === "" || /^\/\//.test(nextLine))
                continue;
              if (/^(\{[^}]+\}|[\w']+)\s*:\s*/.test(nextLine) || /^default\s*:\s*/.test(nextLine) || /^endcase\b/.test(nextLine)) {
                isCaseItemEnd = true;
              }
              break;
            }
            if (isCaseItemEnd) {
              blockDepth--;
              indentStack.pop();
              result.push(caseInfo.caseItemIndent + trimmed);
              continue;
            } else {
              blockDepth--;
              const poppedIndent = indentStack.pop();
              const endIndent = indentStack.length > 0 ? indentStack[indentStack.length - 1] : caseInfo.caseIndent + unit + unit;
              result.push(endIndent + trimmed);
              continue;
            }
          }
          const expectedContentIndent = caseInfo.caseIndent + unit + unit;
          if (/^\s*if\b/.test(line)) {
            const ifIndent = indentStack.length > 0 ? indentStack[indentStack.length - 1] : expectedContentIndent;
            result.push(ifIndent + trimmed);
            if (/\bbegin\b/.test(trimmed) && !/\/\/.*\bbegin\b/.test(line)) {
              blockDepth++;
              indentStack.push(ifIndent + unit);
            }
            continue;
          }
          if (/^\s*end\s+else\b/.test(line) && caseStack.length > 0) {
            blockDepth--;
            const poppedIndent = indentStack.pop();
            const elseIndent = indentStack.length > 0 ? indentStack[indentStack.length - 1] : expectedContentIndent;
            const match = trimmed.match(/^end\s+(else(?:\s+if\b.*)?(?:\s+begin\b.*)?)$/);
            if (match) {
              const elsePart = match[1];
              result.push(elseIndent + "end " + elsePart);
            } else {
              result.push(elseIndent + trimmed);
            }
            if (/\bbegin\b/.test(trimmed) && !/\/\/.*\bbegin\b/.test(line)) {
              blockDepth++;
              indentStack.push(elseIndent + unit);
            }
            continue;
          }
          if (/^\s*else\b/.test(line) && caseStack.length > 0) {
            const elseIndent = indentStack.length > 0 ? indentStack[indentStack.length - 1] : expectedContentIndent;
            result.push(elseIndent + trimmed);
            if (/\bbegin\b/.test(trimmed) && !/\/\/.*\bbegin\b/.test(line)) {
              blockDepth++;
              indentStack.push(elseIndent + unit);
            }
            continue;
          }
          if (/^\s*end\b/.test(line)) {
            let isCaseItemEnd = false;
            for (let j = i + 1; j < lines.length; j++) {
              const nextLine = lines[j].trim();
              if (nextLine === "")
                continue;
              if (/^(\{[^}]+\}|[\w']+)\s*:\s*/.test(nextLine) || /^default\s*:\s*/.test(nextLine) || /^endcase\b/.test(nextLine)) {
                isCaseItemEnd = true;
              }
              break;
            }
            if (!isCaseItemEnd) {
              blockDepth--;
              const poppedIndent = indentStack.pop();
              const endIndent = indentStack.length > 0 ? indentStack[indentStack.length - 1] : expectedContentIndent;
              result.push(endIndent + "end");
              continue;
            }
          }
          if (trimmed !== "") {
            const contentIndent = indentStack.length > 0 ? indentStack[indentStack.length - 1] : expectedContentIndent;
            let normalizedTrimmed = trimmed;
            if (!/^\s*for\s*\(/.test(trimmed) && !/^\s*assign\b/.test(trimmed)) {
              normalizedTrimmed = __normalizeEqSpacing(normalizedTrimmed);
            }
            result.push(contentIndent + normalizedTrimmed);
            if (/\bbegin\b/.test(trimmed) && !/\/\/.*\bbegin\b/.test(line)) {
              blockDepth++;
              indentStack.push(contentIndent + unit);
            }
            continue;
          }
        } else {
          if (/^\s*end\s+else\b/.test(line)) {
            blockDepth--;
            const poppedIndent = indentStack.pop();
            let elseIndent = "";
            if (indentStack.length > 0) {
              elseIndent = indentStack[indentStack.length - 1];
            } else if (poppedIndent) {
              elseIndent = poppedIndent.length >= unit.length ? poppedIndent.substring(0, poppedIndent.length - unit.length) : "";
            }
            const match = trimmed.match(/^end\s+(else(?:\s+if\b.*)?(?:\s+begin\b.*)?)$/);
            if (match) {
              const elsePart = match[1];
              result.push(elseIndent + "end " + elsePart);
            } else {
              result.push(elseIndent + trimmed);
            }
            if (/\bbegin\b/.test(trimmed) && !/\/\/.*\bbegin\b/.test(line)) {
              blockDepth++;
              indentStack.push(elseIndent + unit);
            }
            continue;
          }
          if (/^\s*if\b.*\bbegin\b/.test(line) && caseStack.length > 0) {
            const ifIndent = indentStack.length > 0 ? indentStack[indentStack.length - 1] : currentIndent;
            result.push(ifIndent + trimmed);
            blockDepth++;
            indentStack.push(ifIndent + unit);
            inMultiLineIf = false;
            continue;
          }
          if (/^\s*if\b/.test(line) && !/^\s*`if/.test(line) && !/\bbegin\b/.test(line) && !/\/\/.*\bif\b/.test(line) && caseStack.length > 0) {
            const ifIndent = indentStack.length > 0 ? indentStack[indentStack.length - 1] : currentIndent;
            result.push(ifIndent + trimmed);
            inMultiLineIf = true;
            multiLineIfIndent = ifIndent;
            continue;
          }
          if (inMultiLineIf && /^\s*assign\b/.test(line)) {
            inMultiLineIf = false;
          }
          if (inMultiLineIf && !/^\s*(if|else|begin|end|case|endcase|`)\b/.test(line)) {
            result.push(multiLineIfIndent + trimmed);
            if (/\bbegin\b/.test(trimmed) && !/\/\/.*\bbegin\b/.test(line)) {
              blockDepth++;
              indentStack.push(multiLineIfIndent + unit);
              inMultiLineIf = false;
            }
            continue;
          }
          if (/^\s*else\b.*\bbegin\b/.test(line)) {
            const elseIndent = indentStack.length > 0 ? indentStack[indentStack.length - 1] : currentIndent;
            result.push(elseIndent + trimmed);
            blockDepth++;
            indentStack.push(elseIndent + unit);
            inMultiLineIf = false;
            continue;
          }
          if (/^\s*begin\b/.test(line) && !/\/\/.*\bbegin\b/.test(line)) {
            const beginIndent = indentStack.length > 0 ? indentStack[indentStack.length - 1] : inMultiLineIf ? multiLineIfIndent : currentIndent;
            result.push(beginIndent + "begin");
            blockDepth++;
            indentStack.push(beginIndent + unit);
            inMultiLineIf = false;
            continue;
          }
          if (/^\s*end\b/.test(line) && !/\/\/.*\bend\b/.test(line) && caseStack.length > 0) {
            blockDepth--;
            if (indentStack.length > 0) {
              const poppedIndent = indentStack.pop();
              let endIndent = "";
              if (indentStack.length > 0) {
                endIndent = indentStack[indentStack.length - 1];
              } else if (poppedIndent) {
                endIndent = poppedIndent.length >= unit.length ? poppedIndent.substring(0, poppedIndent.length - unit.length) : "";
              }
              result.push(endIndent + "end");
              continue;
            }
          }
          if (trimmed !== "" && indentStack.length > 0 && caseStack.length > 0) {
            const newIndent = indentStack[indentStack.length - 1];
            if (caseStack.length === 0 && blockDepth === 0) {
              lastIndentAdjustment = newIndent.length - currentIndent.length;
            }
            result.push(newIndent + trimmed);
            continue;
          }
        }
        result.push(line);
        lastIndentAdjustment = 0;
      }
      return result;
    }
  }
});

// dist/formatter/indentation/controlFlow.js
var require_controlFlow = __commonJS({
  "dist/formatter/indentation/controlFlow.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.enforceIfBlocks = enforceIfBlocks;
    exports2.enforceForLoopBlocks = enforceForLoopBlocks;
    function enforceIfBlocks(lines, indentSize) {
      var _a, _b, _c, _d, _e, _f, _g;
      const unit = " ".repeat(indentSize);
      function nextNonBlank(idx) {
        while (idx < lines.length && lines[idx].trim() === "")
          idx++;
        return idx;
      }
      function nextExecutableLine(idx) {
        let current = nextNonBlank(idx);
        while (current < lines.length) {
          const trimmed = lines[current].trim();
          if (trimmed.startsWith("//") || trimmed.startsWith("/*")) {
            current++;
            current = nextNonBlank(current);
            continue;
          }
          if (trimmed.startsWith("`ifdef") || trimmed.startsWith("`ifndef")) {
            let depth = 1;
            current++;
            while (current < lines.length && depth > 0) {
              const t = lines[current].trim();
              if (t.startsWith("`ifdef") || t.startsWith("`ifndef"))
                depth++;
              else if (t.startsWith("`endif"))
                depth--;
              current++;
            }
            current = nextNonBlank(current);
          } else if (trimmed.startsWith("`else") || trimmed.startsWith("`elsif")) {
            current++;
            current = nextNonBlank(current);
          } else if (trimmed.match(/^\s*(if|else|for|while|case|begin|end)\b/)) {
            return -1;
          } else {
            break;
          }
        }
        return current;
      }
      const expanded = [];
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const singleIf = line.match(/^(\s*)if\b(.*\))\s+([^;]+);(\s*\/\/.*)?$/);
        if (singleIf && !/\bbegin\b/.test(line)) {
          const indent = singleIf[1];
          const cond = singleIf[2].trim();
          const stmt = singleIf[3].trim();
          const cmt = singleIf[4] ? " " + singleIf[4].trim() : "";
          expanded.push(indent + "if" + cond + " begin" + cmt);
          expanded.push(indent + unit + stmt + ";");
          expanded.push(indent + "end");
          continue;
        }
        const singleElseIf = line.match(/^(\s*)else\s+if\b(.*\))\s+([^;]+);(\s*\/\/.*)?$/);
        if (singleElseIf && !/\bbegin\b/.test(line)) {
          const indent = singleElseIf[1];
          const cond = singleElseIf[2].trim();
          const stmt = singleElseIf[3].trim();
          const cmt = singleElseIf[4] ? " " + singleElseIf[4].trim() : "";
          expanded.push(indent + "else if" + cond + " begin" + cmt);
          expanded.push(indent + unit + stmt + ";");
          expanded.push(indent + "end");
          continue;
        }
        const singleElse = line.match(/^(\s*)else\b\s+([^;]+);(\s*\/\/.*)?$/);
        if (singleElse && !/\bbegin\b/.test(line)) {
          const indent = singleElse[1];
          const stmt = singleElse[2].trim();
          const cmt = singleElse[3] ? " " + singleElse[3].trim() : "";
          expanded.push(indent + "else begin" + cmt);
          expanded.push(indent + unit + stmt + ";");
          expanded.push(indent + "end");
          continue;
        }
        const endElseIfFor = line.match(/^(\s*)end\s+else\s+if\b(.*\))\s+(for\s*\(.*\).*)$/);
        if (endElseIfFor) {
          const indent = endElseIfFor[1];
          const condition = endElseIfFor[2].trim();
          const forPart = endElseIfFor[3].trim();
          expanded.push(indent + "end else if" + condition + " begin");
          expanded.push(indent + unit + forPart);
          expanded.push(indent + "end");
          continue;
        }
        const headerPatterns = [
          { re: /^(\s*)if\b.*\)(\s*\/\/.*)?$/, rewrite: (m, bc, mc) => m[0].replace(m[2] || "", "").trimEnd() + " begin" + (mc ? " // " + mc : "") },
          { re: /^(\s*)else\s+if\b.*\)(\s*\/\/.*)?$/, rewrite: (m, bc, mc) => m[0].replace(m[2] || "", "").trimEnd() + " begin" + (mc ? " // " + mc : "") },
          { re: /^(\s*)else\b(\s*\/\/.*)?$/, rewrite: (m, bc, mc) => m[1] + "else begin" + (mc ? " // " + mc : "") }
        ];
        let mergedHeader = false;
        for (const hp of headerPatterns) {
          const m = line.match(hp.re);
          if (m && !/\bbegin\b/.test(line)) {
            const headerComment = m[2];
            const nxt = nextNonBlank(i + 1);
            if (nxt < lines.length) {
              const nextLine = lines[nxt];
              const nextTrimmed = nextLine.trim();
              if (/^(&&|\|\||&(?!&)|\|(?!\|))/.test(nextTrimmed)) {
                expanded.push(line);
                mergedHeader = true;
                break;
              }
              let isMultiLineCondition = false;
              if (nextTrimmed.startsWith("`")) {
                const postPreprocIdx = nextExecutableLine(nxt);
                if (postPreprocIdx < lines.length) {
                  const postPreprocLine = lines[postPreprocIdx].trim();
                  if (/^(&&|\|\||&(?!&)|\|(?!\|))/.test(postPreprocLine)) {
                    isMultiLineCondition = true;
                  }
                }
              }
              if (isMultiLineCondition) {
                expanded.push(line);
                mergedHeader = true;
                break;
              }
              let hasCompleteCondition = false;
              if (/\belse\b/.test(line) && !/\bif\b/.test(line)) {
                hasCompleteCondition = true;
              } else if (/\bif\b/.test(line)) {
                const afterIf = line.substring(line.indexOf("if") + 2);
                let parenCount = 0;
                for (let char of afterIf) {
                  if (char === "(")
                    parenCount++;
                  else if (char === ")")
                    parenCount--;
                }
                hasCompleteCondition = parenCount === 0;
              }
              if (!hasCompleteCondition) {
                expanded.push(line);
                mergedHeader = true;
                break;
              }
              let executableLineIdx = nxt;
              if (nextTrimmed.startsWith("`") || nextTrimmed.startsWith("//")) {
                executableLineIdx = nextExecutableLine(nxt);
                if (executableLineIdx === -1) {
                  expanded.push(line);
                  mergedHeader = true;
                  break;
                }
              }
              const execLine = executableLineIdx < lines.length ? lines[executableLineIdx].trim() : "";
              if (/^begin(\s*\/\/.*)?$/.test(execLine)) {
                const beginCommentMatch = execLine.match(/^begin(\s*\/\/.*)?$/);
                const beginComment = beginCommentMatch && beginCommentMatch[1] ? beginCommentMatch[1].trim() : "";
                const comments = [];
                if (headerComment)
                  comments.push(headerComment.replace(/\/\/\s?/, "").trim());
                if (beginComment)
                  comments.push(beginComment.replace(/\/\/\s?/, "").trim());
                const mergedComment = comments.filter(Boolean).join(" ");
                expanded.push(hp.rewrite(m, beginComment, mergedComment));
                i = executableLineIdx;
                mergedHeader = true;
                break;
              } else if (!execLine.startsWith("for ") && !execLine.startsWith("if ") && !execLine.startsWith("else ") && !execLine.startsWith("case") && !execLine.startsWith("begin") && !execLine.startsWith("end")) {
                const indent = m[1];
                expanded.push(hp.rewrite(m, "", ""));
                if (executableLineIdx > nxt) {
                  for (let j = nxt; j < executableLineIdx; j++) {
                    const intermediateLine = lines[j];
                    const intermediateTrimmed = intermediateLine.trim();
                    if (intermediateTrimmed !== "") {
                      expanded.push(indent + unit + intermediateTrimmed);
                    } else {
                      expanded.push(intermediateLine);
                    }
                  }
                }
                expanded.push(indent + unit + execLine);
                expanded.push(indent + "end");
                i = executableLineIdx;
                mergedHeader = true;
                break;
              } else {
                expanded.push(line);
                mergedHeader = true;
                break;
              }
            } else {
              expanded.push(line);
              mergedHeader = true;
              break;
            }
          }
        }
        if (mergedHeader)
          continue;
        expanded.push(line);
      }
      const chained = [];
      for (let i = 0; i < expanded.length; i++) {
        const line = expanded[i];
        const trimmed = line.trim();
        if (/^\s*end\s*$/.test(line) || /^\s*end\s*\/\//.test(line)) {
          let foundElse = false;
          for (let j = i + 1; j < expanded.length; j++) {
            const nextTrimmed = expanded[j].trim();
            if (nextTrimmed === "")
              continue;
            if (/^else\s+if\b.*\bbegin\b/.test(nextTrimmed)) {
              const indent = ((_a = line.match(/^(\s*)/)) == null ? void 0 : _a[1]) || "";
              const endComment = ((_b = line.match(/end\s*(\/\/.*)$/)) == null ? void 0 : _b[1]) || "";
              const normalizedElseIf = nextTrimmed.replace(/^else\s+if\b/, "else if").replace(/\s*\bbegin\b/, " begin");
              chained.push(indent + "end " + normalizedElseIf + (endComment ? " " + endComment : ""));
              i = j;
              foundElse = true;
              break;
            } else if (/^else\b.*\bbegin\b/.test(nextTrimmed)) {
              const indent = ((_c = line.match(/^(\s*)/)) == null ? void 0 : _c[1]) || "";
              const endComment = ((_d = line.match(/end\s*(\/\/.*)$/)) == null ? void 0 : _d[1]) || "";
              const elseMatch = nextTrimmed.match(/^else\b(.*)$/);
              const afterElse = elseMatch ? elseMatch[1].trim() : "begin";
              const space = String.fromCharCode(32);
              const merged = indent + "end" + space + "else" + space + afterElse + (endComment ? space + endComment : "");
              chained.push(merged);
              i = j;
              foundElse = true;
              break;
            } else {
              break;
            }
          }
          if (!foundElse) {
            chained.push(line);
          }
          continue;
        }
        chained.push(line);
      }
      const stack = [];
      const result = [];
      for (let i = 0; i < chained.length; i++) {
        let line = chained[i];
        const generateMatch = line.match(/^(\s*)generate\b.*$/);
        if (generateMatch) {
          const currentIndent = generateMatch[1];
          stack.push({ headerIndent: currentIndent, type: "generate" });
          result.push(line);
          continue;
        }
        if (/^\s*endgenerate\b/.test(line)) {
          while (stack.length > 0 && stack[stack.length - 1].type !== "generate") {
            stack.pop();
          }
          if (stack.length > 0 && stack[stack.length - 1].type === "generate") {
            const generateBlock = stack.pop();
            result.push(generateBlock.headerIndent + "endgenerate");
          } else {
            result.push(line);
          }
          continue;
        }
        const alwaysMatch = line.match(/^(\s*)(?:always|initial)\b.*\bbegin\b.*$/);
        if (alwaysMatch) {
          const currentIndent = alwaysMatch[1];
          stack.push({ headerIndent: currentIndent, type: "always" });
          result.push(line);
          continue;
        }
        if (/^\s*case[xz]?\b/.test(line)) {
          const currentIndent = ((_e = line.match(/^(\s*)/)) == null ? void 0 : _e[1]) || "";
          stack.push({ headerIndent: currentIndent, type: "case" });
          result.push(line);
          continue;
        }
        const forMatch = line.match(/^(\s*)for\s*\(.*\)\s*begin\b/);
        if (forMatch) {
          const currentIndent = forMatch[1];
          let correctIndent = currentIndent;
          if (stack.length > 0) {
            const parent = stack[stack.length - 1];
            correctIndent = parent.headerIndent + unit;
          }
          const rebuilt = correctIndent + line.trim();
          stack.push({ headerIndent: correctIndent, type: "for" });
          result.push(rebuilt);
          continue;
        }
        if (/^\s*(\{[^}]+\}|\S+)\s*:\s*begin\b/.test(line) || /^\s*default\s*:\s*begin\b/.test(line)) {
          const currentIndent = ((_f = line.match(/^(\s*)/)) == null ? void 0 : _f[1]) || "";
          stack.push({ headerIndent: currentIndent, type: "case-item" });
          result.push(line);
          continue;
        }
        if (/^\s*endcase\b/.test(line)) {
          while (stack.length > 0 && stack[stack.length - 1].type !== "case") {
            stack.pop();
          }
          if (stack.length > 0 && stack[stack.length - 1].type === "case") {
            const caseBlock = stack.pop();
            result.push(caseBlock.headerIndent + "endcase");
          } else {
            result.push(line);
          }
          continue;
        }
        const headerMatch = line.match(/^(\s*)(?:if|else\s+if|else)\b.*\bbegin\b.*$/);
        if (headerMatch) {
          const isIf = /^\s*if\b/.test(line.trim());
          const currentIndent = headerMatch[1];
          let correctIndent = currentIndent;
          if (stack.length > 0) {
            const parent = stack[stack.length - 1];
            if (isIf) {
              correctIndent = parent.headerIndent + unit;
            } else {
              correctIndent = parent.headerIndent;
            }
          }
          const rebuilt = correctIndent + line.trim();
          stack.push({ headerIndent: correctIndent, type: "if" });
          result.push(rebuilt);
          continue;
        }
        const endElseMatch = line.match(/^(\s*)end\s+(else(?:\s+if\b.*)?)\s+begin\b.*$/);
        if (endElseMatch) {
          if (stack.length) {
            const closingBlock = stack.pop();
            const closingIndent = closingBlock.headerIndent;
            const elsepart = endElseMatch[2];
            result.push(closingIndent + "end " + elsepart + " begin");
            stack.push({ headerIndent: closingIndent, type: "if" });
          } else {
            result.push(line);
          }
          continue;
        }
        const endMatch = line.match(/^(\s*)end\b.*$/);
        if (endMatch) {
          if (stack.length) {
            const closingBlock = stack.pop();
            const closingIndent = closingBlock.headerIndent;
            const commentPart = ((_g = line.match(/end(.*)$/)) == null ? void 0 : _g[1]) || "";
            const trimmedComment = commentPart.replace(/^\s*/, "");
            const aligned = closingIndent + "end" + (trimmedComment ? " " + trimmedComment : "");
            result.push(aligned);
          } else {
            result.push(line);
          }
          continue;
        }
        if (stack.length && line.trim() !== "") {
          const top = stack[stack.length - 1];
          const existingIndent = (line.match(/^(\s*)/) || ["", ""])[1];
          const isEndLine = /^\s*end\b/.test(line);
          const isCaseKeyword = /^\s*case[xz]?\b/.test(line);
          const isEndCase = /^\s*endcase\b/.test(line);
          const isCaseItem = /^\s*(\{[^}]+\}|\S+)\s*:\s*begin\b/.test(line) || /^\s*default\s*:\s*begin\b/.test(line);
          const isIfElseHeader = /^\s*(?:if|else\s+if|else)\b.*\bbegin\b/.test(line);
          const isForHeader = /^\s*for\s*\(.*\)\s*begin\b/.test(line);
          const isAlwaysHeader = /^\s*(?:always|initial)\b.*\bbegin\b/.test(line);
          const isGenerateHeader = /^\s*generate\b/.test(line);
          const isEndGenerate = /^\s*endgenerate\b/.test(line);
          if (!isEndLine && !isCaseKeyword && !isEndCase && !isCaseItem && !isIfElseHeader && !isForHeader && !isAlwaysHeader && !isGenerateHeader && !isEndGenerate) {
            const expectedIndent = top.headerIndent + unit;
            line = expectedIndent + line.trim();
          }
        }
        result.push(line);
      }
      return result;
    }
    function enforceForLoopBlocks(lines, indentSize) {
      const unit = " ".repeat(indentSize);
      function nextNonBlank(idx) {
        while (idx < lines.length && lines[idx].trim() === "")
          idx++;
        return idx;
      }
      const result = [];
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const trimmed = line.trim();
        const singleFor = line.match(/^(\s*)for\s*\((.*)\)\s+([^;]+);(\s*\/\/.*)?$/);
        if (singleFor && !/\bbegin\b/.test(line)) {
          const indent = singleFor[1];
          const condition = singleFor[2].trim();
          const stmt = singleFor[3].trim();
          const cmt = singleFor[4] ? " " + singleFor[4].trim() : "";
          result.push(indent + "for (" + condition + ") begin" + cmt);
          result.push(indent + unit + stmt + ";");
          result.push(indent + "end");
          continue;
        }
        const forIf = line.match(/^(\s*)for\s*\((.*)\)\s+(if\b.*)$/);
        if (forIf && !/\bbegin\b/.test(line.substring(0, line.indexOf("if")))) {
          const indent = forIf[1];
          const condition = forIf[2].trim();
          const ifPart = forIf[3].trim();
          result.push(indent + "for (" + condition + ") begin");
          result.push(indent + unit + ifPart);
          const ifHasBegin = /\bbegin\b/.test(ifPart);
          let depth = ifHasBegin ? 1 : 0;
          let j = i + 1;
          while (j < lines.length) {
            const nextLine = lines[j];
            const nextTrimmed = nextLine.trim();
            if (/\bbegin\b/.test(nextTrimmed) && !/\/\/.*\bbegin\b/.test(nextLine)) {
              depth++;
            }
            if (/^\s*end\b/.test(nextLine) && !/\/\/.*\bend\b/.test(nextLine)) {
              if (depth === 0) {
                result.push(indent + "end");
                i = j - 1;
                break;
              }
              depth--;
              if (depth === 0) {
                result.push(nextLine);
                result.push(indent + "end");
                i = j;
                break;
              }
            }
            result.push(nextLine);
            j++;
          }
          continue;
        }
        const forHeader = line.match(/^(\s*)for\s*\((.*)\)(\s*\/\/.*)?$/);
        if (forHeader && !/\bbegin\b/.test(line)) {
          const indent = forHeader[1];
          const condition = forHeader[2].trim();
          const headerComment = forHeader[3];
          const nxt = nextNonBlank(i + 1);
          if (nxt < lines.length) {
            const nextLine = lines[nxt];
            const nextTrimmed = nextLine.trim();
            if (/^begin(\s*\/\/.*)?$/.test(nextTrimmed)) {
              const beginCommentMatch = nextTrimmed.match(/^begin(\s*\/\/.*)?$/);
              const beginComment = beginCommentMatch && beginCommentMatch[1] ? beginCommentMatch[1].trim() : "";
              const comments = [];
              if (headerComment)
                comments.push(headerComment.replace(/\/\/\s?/, "").trim());
              if (beginComment)
                comments.push(beginComment.replace(/\/\/\s?/, "").trim());
              const mergedComment = comments.filter(Boolean).join(" ");
              result.push(indent + "for (" + condition + ") begin" + (mergedComment ? " // " + mergedComment : ""));
              i = nxt;
              continue;
            } else if (!nextTrimmed.startsWith("for ") && !nextTrimmed.startsWith("if ") && !nextTrimmed.startsWith("else ") && !nextTrimmed.startsWith("case") && !nextTrimmed.startsWith("begin") && !nextTrimmed.startsWith("end")) {
              result.push(indent + "for (" + condition + ") begin" + (headerComment || ""));
              result.push(indent + unit + nextTrimmed);
              result.push(indent + "end");
              i = nxt;
              continue;
            }
          }
        }
        result.push(line);
      }
      return result;
    }
  }
});

// dist/formatter/indentation/conditions.js
var require_conditions = __commonJS({
  "dist/formatter/indentation/conditions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.alignMultilineConditions = alignMultilineConditions;
    function alignMultilineConditions(lines) {
      const result = [];
      let parenStack = [];
      let parenBalance = 0;
      let insideModuleDecl = false;
      let moduleDepth = 0;
      if (lines.length > 0) {
        let hasModuleKeyword = false;
        let hasClosingParen = false;
        let hasStandardParamIndent = false;
        for (let i = 0; i < Math.min(lines.length, 50); i++) {
          const line = lines[i];
          const trimmed = line.trim();
          if (/^\s*module\s+\w+/.test(line)) {
            hasModuleKeyword = true;
          }
          if (/\)\s*;\s*$/.test(line)) {
            hasClosingParen = true;
          }
          if (!line.startsWith("`") && /^  (parameter|input|output|inout)\b/.test(line) && !line.startsWith("   ")) {
            hasStandardParamIndent = true;
          }
        }
        if (hasStandardParamIndent) {
          insideModuleDecl = true;
          for (let i = 0; i < Math.min(lines.length, 50); i++) {
            const line = lines[i];
            for (let j = 0; j < line.length; j++) {
              if (line[j] === "(")
                moduleDepth++;
              if (line[j] === ")")
                moduleDepth--;
            }
            if (/\)\s*;\s*$/.test(line)) {
              break;
            }
          }
        }
      }
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed === "" || trimmed.startsWith("//") || trimmed.startsWith("`")) {
          result.push(line);
          continue;
        }
        if (/^\s*module\s+\w+/.test(line)) {
          if (/^\s*module\s+\w+\s*;\s*$/.test(line)) {
            result.push(line);
            continue;
          }
          if (!insideModuleDecl) {
            moduleDepth = 0;
          }
          insideModuleDecl = true;
          result.push(line);
          continue;
        }
        if (insideModuleDecl) {
          for (let j = 0; j < line.length; j++) {
            if (line[j] === "(")
              moduleDepth++;
            if (line[j] === ")")
              moduleDepth--;
          }
          if (moduleDepth <= 0 && /\)\s*;\s*$/.test(line)) {
            insideModuleDecl = false;
          }
          result.push(line);
          continue;
        }
        const isControlStatement = /^\s*(if|for|while)\s*\(/.test(line);
        if (isControlStatement) {
          result.push(line);
          const match = line.match(/^(\s*)(if|for|while)\s*\(/);
          if (match) {
            const alignColumn = match[0].length;
            parenStack = [];
            parenBalance = 0;
            let openCount = 0;
            let closeCount = 0;
            for (let j = 0; j < line.length; j++) {
              if (line[j] === "(")
                openCount++;
              if (line[j] === ")")
                closeCount++;
            }
            parenBalance = openCount - closeCount;
            if (parenBalance > 0) {
              parenStack.push(alignColumn);
            }
          }
          continue;
        }
        if (parenStack.length > 0) {
          const alignColumn = parenStack[0];
          let openCount = 0;
          let closeCount = 0;
          for (let j = 0; j < trimmed.length; j++) {
            if (trimmed[j] === "(")
              openCount++;
            if (trimmed[j] === ")")
              closeCount++;
          }
          parenBalance += openCount - closeCount;
          const alignedLine = " ".repeat(alignColumn) + trimmed;
          result.push(alignedLine);
          if (parenBalance <= 0) {
            parenStack = [];
            parenBalance = 0;
          }
          continue;
        }
        result.push(line);
      }
      return result;
    }
  }
});

// dist/formatter/rangeFormatting.js
var require_rangeFormatting = __commonJS({
  "dist/formatter/rangeFormatting.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.formatRange = formatRange;
    var vscode2 = require_vscode_shim();
    var uvmDetection_1 = require_uvmDetection();
    var uvmFormatter_1 = require_uvmFormatter();
    function formatRange(document, range, options, formatDocumentFn) {
      const tempCfg = require_types().getConfig(options);
      if (tempCfg.enableUVMFormatting && (0, uvmDetection_1.isUVMCode)(document.getText())) {
        return (0, uvmFormatter_1.formatUVMRange)(document, range, options);
      }
      const startLine = range.start.line;
      const endLine = range.end.line;
      const selectedLines = [];
      for (let i = startLine; i <= endLine; i++) {
        selectedLines.push(document.lineAt(i).text);
      }
      const wcfg = vscode2.workspace.getConfiguration("verilogFormatter");
      let indentSize;
      const indentInspect = wcfg.inspect("indentSize");
      if (indentInspect && (indentInspect.workspaceValue !== void 0 || indentInspect.globalValue !== void 0 || indentInspect.workspaceFolderValue !== void 0)) {
        indentSize = wcfg.get("indentSize", 2);
      } else {
        indentSize = options.tabSize !== void 0 ? options.tabSize : 2;
      }
      const cfg = {
        indentSize,
        maxBlankLines: wcfg.get("maxBlankLines", 2),
        alignAssignments: wcfg.get("alignAssignments", true),
        alignPortList: wcfg.get("alignPortList", true),
        alignWireDeclSemicolons: wcfg.get("alignWireDeclSemicolons", true),
        alignParameters: wcfg.get("alignParameters", true),
        wrapPortList: wcfg.get("wrapPortList", false),
        lineLength: wcfg.get("lineLength", 120),
        removeTrailingWhitespace: wcfg.get("removeTrailingWhitespace", true),
        commentColumn: wcfg.get("commentColumn", 40),
        formatModuleHeaders: wcfg.get("formatModuleHeaders", true),
        formatModuleInstantiations: wcfg.get("formatModuleInstantiations", true),
        indentAlwaysBlocks: wcfg.get("indentAlwaysBlocks", true),
        enforceBeginEnd: wcfg.get("enforceBeginEnd", true),
        indentCaseStatements: wcfg.get("indentCaseStatements", true),
        annotateIfdefComments: wcfg.get("annotateIfdefComments", true)
      };
      const formattedLines = formatVerilogRange(selectedLines, indentSize, cfg, formatDocumentFn);
      const docText = document.getText();
      const eol = docText.includes("\r\n") ? "\r\n" : "\n";
      const newText = formattedLines.join(eol);
      return [vscode2.TextEdit.replace(range, newText)];
    }
    function formatVerilogRange(lines, indentSize, cfg, formatDocumentFn) {
      var _a, _b;
      const unit = " ".repeat(indentSize);
      let result = [...lines];
      const hasCompleteAlwaysBlock = hasCompleteStructure(result, "always", "begin", "end");
      const hasCompleteInitialBlock = hasCompleteStructure(result, "initial", "begin", "end");
      const hasCompleteGenerateBlock = hasCompleteStructure(result, "generate", "", "endgenerate");
      const hasCompleteForBlock = hasCompleteStructure(result, "for", "begin", "end");
      const hasCompleteCaseBlock = hasCompleteStructure(result, "case|casez|casex", "", "endcase");
      const hasCompleteIfBlock = hasCompleteIfElseStructure(result);
      const firstLine = ((_a = result[0]) == null ? void 0 : _a.trim()) || "";
      const lastLine = ((_b = result[result.length - 1]) == null ? void 0 : _b.trim()) || "";
      const hasCompleteInstantiation = /^[A-Za-z_][A-Za-z0-9_]*\s+([#\s]+\(|[A-Za-z_][A-Za-z0-9_]*\s*\()/.test(firstLine) && /\);?\s*$/.test(lastLine);
      if (hasCompleteAlwaysBlock || hasCompleteInitialBlock || hasCompleteGenerateBlock || hasCompleteForBlock || hasCompleteCaseBlock || hasCompleteIfBlock || hasCompleteInstantiation) {
        const tempText = result.join("\n");
        const formattedText = formatDocumentFn(tempText, indentSize);
        result = formattedText.split(/\r?\n/);
      } else {
        if (cfg.annotateIfdefComments) {
          const globalMacroStack = [];
          const annotateRangeMacro = (line) => {
            var _a2;
            const leading = ((_a2 = line.match(/^\s*/)) == null ? void 0 : _a2[0]) || "";
            const trimmed = line.trim();
            if (/{`(ifdef|ifndef)\s+(\w+)/.test(trimmed)) {
              const m = trimmed.match(/{`(ifdef|ifndef)\s+(\w+)/);
              if (m) {
                globalMacroStack.push(m[2]);
              }
              return line;
            }
            if (/{`(else|elsif)\b/.test(trimmed)) {
              const top = globalMacroStack[globalMacroStack.length - 1];
              if (top && !/{`else\s*\/\//.test(trimmed)) {
                return line.replace(/{`else\b/, `{\`else // ${top}`).replace(/{`elsif\b/, `{\`elsif // ${top}`);
              }
              return line;
            }
            if (/{`endif\b/.test(trimmed)) {
              const top = globalMacroStack.pop();
              if (top && !/{`endif\s*\/\//.test(trimmed)) {
                return line.replace(/{`endif\b/, `{\`endif // ${top}`);
              }
              return line;
            }
            if (!trimmed.startsWith("`"))
              return line;
            const ifdefMatch = trimmed.match(/^`(ifdef|ifndef)\s+(\w+)/);
            if (ifdefMatch) {
              globalMacroStack.push(ifdefMatch[2]);
              return line;
            }
            if (/^`else\b/.test(trimmed)) {
              const top = globalMacroStack[globalMacroStack.length - 1];
              if (top && !/^`else\s*\/\//.test(trimmed)) {
                return leading + "`else // " + top;
              }
              return line;
            }
            if (/^`endif\b/.test(trimmed)) {
              const top = globalMacroStack.pop();
              if (top && !/^`endif\s*\/\//.test(trimmed)) {
                return leading + "`endif // " + top;
              }
              return line;
            }
            return line;
          };
          result = result.map(annotateRangeMacro);
        }
        if (cfg.removeTrailingWhitespace) {
          result = result.map((line) => line.trimEnd());
        }
        if (cfg.maxBlankLines < 100) {
          const compressed = [];
          let blankCount = 0;
          for (const line of result) {
            if (line.trim() === "") {
              blankCount++;
              if (blankCount <= cfg.maxBlankLines) {
                compressed.push(line);
              }
            } else {
              blankCount = 0;
              compressed.push(line);
            }
          }
          result = compressed;
        }
        let hasModuleHeader = false;
        let hasCompleteModuleHeader = false;
        for (let i = 0; i < result.length; i++) {
          if (/^\s*module\s+\w+/.test(result[i])) {
            hasModuleHeader = true;
            break;
          }
        }
        if (hasModuleHeader && result.some((l) => /\)\s*;\s*$/.test(l))) {
          hasCompleteModuleHeader = true;
        }
        let hasModuleInst = false;
        let hasOnlyConnections = true;
        for (let i = 0; i < result.length; i++) {
          const line = result[i];
          if (/^\s*[A-Za-z_][A-Za-z0-9_]*\s+#?\s*\(/.test(line) || /^\s*[A-Za-z_][A-Za-z0-9_]*\s+[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(line)) {
            if (!/^\s*module\s+/.test(line)) {
              hasModuleInst = true;
            }
          }
          if (/^\s*\w+\s+#\s*\(/.test(line) || /^\s*\)\s+\w+\s*\(/.test(line)) {
            hasOnlyConnections = false;
          }
        }
        result = alignMultilineConditions(result);
        if (cfg.formatModuleHeaders && hasCompleteModuleHeader) {
          try {
            result = (0, moduleHeader_1.formatModuleHeader)(result, cfg);
          } catch (e) {
            console.error("Range formatting: module header error", e);
          }
        }
        if (cfg.alignAssignments) {
          result = alignAssignmentsInRange(result);
        }
        if (cfg.alignWireDeclSemicolons) {
          result = alignWireDeclarationsInRange(result, cfg);
        }
        if (cfg.alignParameters && !hasCompleteModuleHeader) {
          result = alignParametersInRange(result);
        }
        const hasPortDeclarations = result.some((l) => /^\s*(input|output|inout)\s+/.test(l));
        if (cfg.alignPortList && (hasPortDeclarations && !hasCompleteModuleHeader)) {
          result = alignPortDeclarationsInRange(result);
        }
        const shouldFormatInst = cfg.formatModuleInstantiations && hasModuleInst && !hasModuleHeader && !hasOnlyConnections;
        if (shouldFormatInst) {
          try {
            result = (0, instantiations_1.formatModuleInstantiations)(result, indentSize);
          } catch (e) {
            console.error("Range formatting: module instantiation error", e);
          }
        }
      }
      return result;
    }
    function hasCompleteStructure(lines, startKeyword, beginKeyword, endKeyword) {
      let hasStart = false;
      let depth = 0;
      for (const line of lines) {
        const trimmed = line.trim();
        const startRegex = new RegExp(`^(${startKeyword})\\b`);
        const hasStartOnThisLine = startRegex.test(trimmed);
        if (hasStartOnThisLine) {
          hasStart = true;
        }
        if (beginKeyword && /\bbegin\b/.test(trimmed)) {
          depth++;
        }
        if (endKeyword) {
          if (new RegExp(`\\b${endKeyword}\\b`).test(trimmed)) {
            depth--;
          }
        }
      }
      return hasStart && depth === 0;
    }
    function hasCompleteIfElseStructure(lines) {
      let hasIf = false;
      let depth = 0;
      let inIfElse = false;
      for (const line of lines) {
        const trimmed = line.trim();
        if (/^\s*if\s*\(/.test(line)) {
          hasIf = true;
          inIfElse = true;
        }
        if (/\bbegin\b/.test(trimmed) && inIfElse) {
          depth++;
        }
        if (/\bend\b/.test(trimmed) && inIfElse) {
          depth--;
          if (depth === 0) {
            if (!/\belse\b/.test(trimmed)) {
              inIfElse = false;
            }
          }
        }
        if (/\belse\b/.test(trimmed)) {
          inIfElse = true;
        }
      }
      return hasIf && depth === 0;
    }
    var moduleHeader_1 = require_moduleHeader();
    var instantiations_1 = require_instantiations();
    function alignMultilineConditions(lines) {
      const { alignMultilineConditions: alignFn } = require_conditions();
      return alignFn(lines);
    }
    function alignAssignmentsInRange(lines) {
      var _a;
      const assignLines = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (!trimmed.startsWith("assign ") && trimmed.startsWith("(")) {
          continue;
        }
        const match = trimmed.match(/^(.+?)\s*(<=|=)(?!=)\s*(.+?)\s*;\s*(\/\/.*)?$/);
        if (match) {
          const indent = ((_a = line.match(/^(\s*)/)) == null ? void 0 : _a[1]) || "";
          const lhs = match[1].trim();
          const op = match[2];
          const rhs = match[3].trim();
          const comment = match[4] || "";
          assignLines.push({ index: i, indent, lhs, op, rhs, comment });
        }
      }
      if (assignLines.length === 0)
        return lines;
      const maxLhs = Math.max(...assignLines.map((a) => a.lhs.length));
      const maxRhs = Math.max(...assignLines.map((a) => a.rhs.length));
      const result = [...lines];
      for (const assign of assignLines) {
        const lhsPadded = assign.lhs.padEnd(maxLhs);
        const rhsPadded = assign.rhs.padEnd(maxRhs);
        result[assign.index] = `${assign.indent}${lhsPadded} ${assign.op} ${rhsPadded};${assign.comment ? " " + assign.comment : ""}`;
      }
      return result;
    }
    function alignWireDeclarationsInRange(lines, cfg) {
      const { alignWireDeclGroup } = require_wires();
      const groups = [];
      const passThroughGroups = new Set();
      let currentGroup = [];
      let currentGroupHasInit = null;
      let currentGroupIsIO = null;
      let currentGroupVarKind = null;
      let parenBalance = 0;
      for (const line of lines) {
        const trimmed = line.trim();
        const parenDepthBefore = parenBalance;
        {
          const __noCmtStr = line.replace(/\/\/.*$/, "").replace(/"(?:\\.|[^"\\])*"/g, '""');
          parenBalance += (__noCmtStr.match(/\(/g) || []).length - (__noCmtStr.match(/\)/g) || []).length;
          if (parenBalance < 0)
            parenBalance = 0;
        }
        const isDecl = parenDepthBefore === 0 && /^\s*(wire|reg|logic|input|output|inout|integer|genvar)\b/.test(line);
        const isComment = /^\s*\/\//.test(line);
        const isMacro = /^\s*`(ifn?def|else|endif)\b/.test(line);
        const isBlank = trimmed === "";
        if (isDecl) {
          const lineWithoutComment = line.replace(/\/\/.*$/, "");
          const hasInit = /=/.test(lineWithoutComment);
          const isIO = /^\s*(input|output|inout)\b/.test(line);
          const varKind = __declVarKind(line);
          if (currentGroup.length > 0 && (currentGroupHasInit !== null && currentGroupHasInit !== hasInit || currentGroupIsIO !== null && currentGroupIsIO !== isIO || currentGroupVarKind !== null && currentGroupVarKind !== varKind)) {
            groups.push(currentGroup);
            currentGroup = [line];
            currentGroupHasInit = hasInit;
            currentGroupIsIO = isIO;
            currentGroupVarKind = varKind;
          } else {
            currentGroup.push(line);
            if (currentGroupHasInit === null)
              currentGroupHasInit = hasInit;
            if (currentGroupIsIO === null)
              currentGroupIsIO = isIO;
            if (currentGroupVarKind === null)
              currentGroupVarKind = varKind;
          }
        } else if (currentGroup.length > 0 && (isComment || isMacro || isBlank)) {
          currentGroup.push(line);
        } else {
          if (currentGroup.length > 0) {
            groups.push(currentGroup);
            currentGroup = [];
            currentGroupHasInit = null;
            currentGroupIsIO = null;
            currentGroupVarKind = null;
          }
          const passthroughGroup = [line];
          groups.push(passthroughGroup);
          if (parenDepthBefore > 0)
            passThroughGroups.add(passthroughGroup);
        }
      }
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }
      const result = [];
      for (const group of groups) {
        const firstTrimmed = group[0].trim();
        if (!passThroughGroups.has(group) && /^\s*(wire|reg|logic|input|output|inout|integer|genvar)\b/.test(group[0])) {
          const aligned = alignWireDeclGroup(group, cfg);
          result.push(...aligned);
        } else {
          result.push(...group);
        }
      }
      return result;
    }
    function alignParametersInRange(lines) {
      var _a;
      const paramLines = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        const match = trimmed.match(/^(parameter|localparam)\s+(\[[^\]]+\]|\w+)?\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?)\s*([,;])\s*(\/\/.*)?$/);
        if (match) {
          const indent = ((_a = line.match(/^(\s*)/)) == null ? void 0 : _a[1]) || "";
          const keyword = match[1];
          const typeSpec = match[2] || "";
          const name = match[3];
          const value = match[4].trim();
          const delimiter = match[5];
          const comment = match[6] || "";
          paramLines.push({ index: i, indent, keyword, typeSpec, name, value, delimiter, comment });
        }
      }
      if (paramLines.length === 0)
        return lines;
      const maxKeyword = Math.max(...paramLines.map((p) => p.keyword.length));
      const maxType = Math.max(...paramLines.map((p) => p.typeSpec.length));
      const maxName = Math.max(...paramLines.map((p) => p.name.length));
      const maxValue = Math.max(...paramLines.map((p) => p.value.length));
      const result = [...lines];
      for (const param of paramLines) {
        const keywordPadded = param.keyword.padEnd(maxKeyword);
        const typePadded = param.typeSpec ? param.typeSpec.padEnd(maxType) + " " : "".padEnd(maxType + 1);
        const namePadded = param.name.padEnd(maxName);
        const valuePadded = param.value.padEnd(maxValue);
        result[param.index] = `${param.indent}${keywordPadded} ${typePadded}${namePadded} = ${valuePadded}${param.delimiter}${param.comment ? " " + param.comment : ""}`;
      }
      return result;
    }
    function alignPortDeclarationsInRange(lines) {
      var _a;
      const portLines = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        const match = trimmed.match(/^(input|output|inout)\s+(wire|reg|logic|bit)?\s*(\[[^\]]+\])?\s*([A-Za-z_][A-Za-z0-9_]*)\s*([,;])\s*(\/\/.*)?$/);
        if (match) {
          const indent = ((_a = line.match(/^(\s*)/)) == null ? void 0 : _a[1]) || "";
          const dir = match[1];
          const type = match[2] || "";
          const range = match[3] || "";
          const name = match[4];
          const delimiter = match[5];
          const comment = match[6] || "";
          portLines.push({ index: i, indent, dir, type, range, name, delimiter, comment });
        }
      }
      if (portLines.length === 0)
        return lines;
      const maxDir = Math.max(...portLines.map((p) => p.dir.length));
      const maxType = Math.max(...portLines.map((p) => p.type.length));
      const maxRange = Math.max(...portLines.map((p) => p.range.length));
      const maxName = Math.max(...portLines.map((p) => p.name.length));
      const result = [...lines];
      for (const port of portLines) {
        const dirPadded = port.dir.padEnd(maxDir);
        const typePadded = port.type ? port.type.padEnd(maxType) + " " : "".padEnd(maxType + 1);
        const rangePadded = port.range ? port.range.padStart(maxRange) + " " : "".padEnd(maxRange + 1);
        const namePadded = port.name.padEnd(maxName);
        result[port.index] = `${port.indent}${dirPadded} ${typePadded}${rangePadded}${namePadded}${port.delimiter}${port.comment ? " " + port.comment : ""}`;
      }
      return result;
    }
  }
});

// dist/formatter/index.js
var require_formatter = __commonJS({
  "dist/formatter/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.formatDocument = formatDocument;
    exports2.formatRange = formatRange;
    exports2.formatVerilogText = formatVerilogText2;
    var vscode2 = require_vscode_shim();
    var types_1 = require_types();
    var comments_1 = require_comments();
    var uvmDetection_1 = require_uvmDetection();
    var uvmFormatter_1 = require_uvmFormatter();
    var assignments_1 = require_assignments();
    var wires_1 = require_wires();
    var parameters_1 = require_parameters();
    var ports_1 = require_ports();
    var blockAssignments_1 = require_blockAssignments();
    var moduleHeader_1 = require_moduleHeader();
    var instantiations_1 = require_instantiations();
    var alwaysBlocks_1 = require_alwaysBlocks();
    var caseStatements_1 = require_caseStatements();
    var controlFlow_1 = require_controlFlow();
    var conditions_1 = require_conditions();
    function moveBeginToSameLine(lines) {
      const result = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed === "begin" && result.length > 0) {
          let targetIdx = result.length - 1;
          while (targetIdx >= 0 && result[targetIdx].trim() === "") {
            targetIdx--;
          }
          if (targetIdx >= 0) {
            const targetLine = result[targetIdx];
            const targetTrimmed = targetLine.trim();
            if (/\)\s*(?:\/\/.*)?$/.test(targetTrimmed)) {
              result[targetIdx] = targetLine.replace(/\s*(?:\/\/.*)?$/, " begin");
              while (result.length > targetIdx + 1) {
                result.pop();
              }
              continue;
            }
          }
        }
        result.push(line);
      }
      return result;
    }
    function fixEndIfPattern(lines) {
      var _a;
      const result = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        const match = trimmed.match(/^end\s+(if\s*\(.*)/);
        if (match && !/^end\s+else\s+if/.test(trimmed)) {
          const indent = ((_a = line.match(/^(\s*)/)) == null ? void 0 : _a[1]) || "";
          const ifPart = match[1];
          result.push(indent + "end");
          result.push(indent + ifPart);
        } else {
          result.push(line);
        }
      }
      return result;
    }
    function fixModuleLevelIndentation(lines, indentSize) {
      const unit = " ".repeat(indentSize);
      const result = [];
      let insideModule = false;
      let insideModuleHeader = false;
      let insideAlwaysOrInitial = false;
      let blockDepth = 0;
      let funcTaskDepth = 0;
      const countModuleBeginEnd = (t) => {
        let s = t.replace(/\/\/.*$/, "");
        s = s.replace(/"(?:\\.|[^"\\])*"/g, '""');
        const b = (s.match(/\bbegin\b/g) || []).length;
        const e = (s.match(/\bend\b/g) || []).length;
        return b - e;
      };
      for (const line of lines) {
        const trimmed = line.trim();
        if (/^module\s+\w+/.test(trimmed)) {
          insideModule = true;
          insideModuleHeader = true;
          result.push(line);
          continue;
        }
        if (insideModuleHeader && /^\);/.test(trimmed)) {
          insideModuleHeader = false;
          result.push(line);
          continue;
        }
        if (/^endmodule\b/.test(trimmed)) {
          insideModule = false;
          result.push(line);
          continue;
        }
        if (/^always\b|^initial\b/.test(trimmed)) {
          insideAlwaysOrInitial = true;
          blockDepth += countModuleBeginEnd(trimmed);
          if (blockDepth < 0)
            blockDepth = 0;
          result.push(line);
          continue;
        }
        if (/^(?:virtual\s+|automatic\s+|static\s+|protected\s+|local\s+|extern\s+|pure\s+)*(?:function|task)\b/.test(trimmed)) {
          funcTaskDepth++;
          result.push(line);
          continue;
        }
        if (/^(?:endfunction|endtask)\b/.test(trimmed)) {
          if (funcTaskDepth > 0)
            funcTaskDepth--;
          result.push(line);
          continue;
        }
        if (/\bbegin\b/.test(trimmed) && !/\/\/.*\bbegin\b/.test(line)) {
          blockDepth += countModuleBeginEnd(trimmed);
          if (blockDepth < 0)
            blockDepth = 0;
          if (blockDepth === 0 && /^end\b/.test(trimmed)) {
            insideAlwaysOrInitial = false;
          }
          result.push(line);
          continue;
        }
        if (/^end\b/.test(trimmed) && !/^endmodule\b|^endcase\b|^endgenerate\b/.test(trimmed)) {
          blockDepth--;
          if (blockDepth < 0)
            blockDepth = 0;
          if (blockDepth === 0) {
            insideAlwaysOrInitial = false;
          }
          result.push(line);
          continue;
        }
        if (/^endcase\b/.test(trimmed)) {
          result.push(line);
          continue;
        }
        if (insideModule && !insideModuleHeader && !insideAlwaysOrInitial && funcTaskDepth === 0 && blockDepth === 0) {
          if (/^(wire|reg|logic|input|output|inout|assign)\b/.test(trimmed) || /^`(ifdef|ifndef|elsif|else|endif)\b/.test(trimmed) || /^\/\//.test(trimmed)) {
            result.push(unit + trimmed);
            continue;
          }
        }
        result.push(line);
      }
      return result;
    }
    function normalizeIfdefIndentation(lines) {
      var _a, _b, _c;
      const result = [];
      const ifdefStack = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed.startsWith("`ifdef") || trimmed.startsWith("`ifndef") || trimmed.startsWith("`elsif") || trimmed.startsWith("`else") || trimmed.startsWith("`endif")) {
          const nextNonBlank = lines.slice(i + 1).find((l) => l.trim() !== "");
          if (nextNonBlank && /^\s*[\)\}]/.test(nextNonBlank)) {
            result.push(line);
            continue;
          }
          if (trimmed.startsWith("`endif")) {
            if (ifdefStack.length > 0) {
              const matchingIfdef = ifdefStack.pop();
              result.push(matchingIfdef.indent + trimmed);
            } else {
              result.push(line);
            }
            continue;
          }
          if (trimmed.startsWith("`else") || trimmed.startsWith("`elsif")) {
            if (ifdefStack.length > 0) {
              const matchingIfdef = ifdefStack[ifdefStack.length - 1];
              result.push(matchingIfdef.indent + trimmed);
            } else {
              result.push(line);
            }
            continue;
          }
          let targetIndent = null;
          for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j];
            const nextTrimmed = nextLine.trim();
            if (!nextTrimmed || nextTrimmed.startsWith("`")) {
              continue;
            }
            const indent = ((_a = nextLine.match(/^(\s*)/)) == null ? void 0 : _a[1]) || "";
            targetIndent = indent;
            break;
          }
          if (targetIndent === null) {
            for (let j = i - 1; j >= 0; j--) {
              const prevLine = lines[j];
              const prevTrimmed = prevLine.trim();
              if (!prevTrimmed || prevTrimmed.startsWith("`")) {
                continue;
              }
              const indent = ((_b = prevLine.match(/^(\s*)/)) == null ? void 0 : _b[1]) || "";
              targetIndent = indent;
              break;
            }
          }
          if (targetIndent !== null) {
            result.push(targetIndent + trimmed);
            ifdefStack.push({ indent: targetIndent, lineIndex: i });
          } else {
            result.push(line);
            const currentIndent = ((_c = line.match(/^(\s*)/)) == null ? void 0 : _c[1]) || "";
            ifdefStack.push({ indent: currentIndent, lineIndex: i });
          }
        } else {
          result.push(line);
        }
      }
      return result;
    }
    function alignIfdefBranches(lines) {
      const result = [];
      const stack = [];
      const leadingOf = (l) => {
        const m = l.match(/^(\s*)/);
        return m ? m[1] : "";
      };
      for (const line of lines) {
        const trimmed = line.trim();
        if (/^`(ifdef|ifndef)\b/.test(trimmed)) {
          stack.push(leadingOf(line));
          result.push(line);
        } else if (/^`(else|elsif)\b/.test(trimmed)) {
          const indent = stack.length ? stack[stack.length - 1] : leadingOf(line);
          result.push(indent + trimmed);
        } else if (/^`endif\b/.test(trimmed)) {
          const indent = stack.length ? stack.pop() : leadingOf(line);
          result.push(indent + trimmed);
        } else {
          result.push(line);
        }
      }
      return result;
    }
    function formatDocument(document, options) {
      const cfg = (0, types_1.getConfig)(options);
      const original = document.getText();
      if (cfg.enableUVMFormatting && (0, uvmDetection_1.isUVMCode)(original)) {
        return (0, uvmFormatter_1.formatUVMDocument)(document, options);
      }
      const anyFeatureEnabled = cfg.removeTrailingWhitespace || cfg.maxBlankLines < 100 || cfg.alignAssignments || cfg.alignWireDeclSemicolons || cfg.alignParameters || cfg.alignPortList || cfg.formatModuleHeaders || cfg.formatModuleInstantiations || cfg.indentAlwaysBlocks || cfg.enforceBeginEnd || cfg.indentCaseStatements || cfg.annotateIfdefComments || cfg.commentColumn > 0;
      if (!anyFeatureEnabled) {
        return [];
      }
      const lines = original.split(/\r?\n/);
      const processed = [];
      let blankCount = 0;
      let inModuleHeader = false;
      let moduleHeaderLines = [];
      let pendingAssignments = [];
      let pendingWireDecls = [];
      let pendingParams = [];
      let pendingPorts = [];
      let inAssignmentContinuation = false;
      let inWireContinuation = false;
      let inParamContinuation = false;
      let inPortContinuation = false;
      let wireGroupNonDeclCount = 0;
      const globalMacroStack = [];
      function annotateMacro(line) {
        var _a;
        if (!cfg.annotateIfdefComments)
          return line;
        const leading = ((_a = line.match(/^\s*/)) == null ? void 0 : _a[0]) || "";
        const trimmed = line.trim();
        const midLineMatch = trimmed.match(/^(.+?)(`ifn?def\s+(\w+)|`else\b|`endif\b.*)$/);
        if (midLineMatch && !trimmed.startsWith("`")) {
          const beforeDirective = midLineMatch[1];
          const directivePart = midLineMatch[2];
          const ifdefMatch = directivePart.match(/^`ifn?def\s+(\w+)/);
          if (ifdefMatch) {
            globalMacroStack.push(ifdefMatch[1]);
            return leading + beforeDirective + directivePart;
          }
          if (/^`else\b/.test(directivePart)) {
            const current = globalMacroStack[globalMacroStack.length - 1];
            if (current) {
              return leading + beforeDirective + "`else // " + current;
            }
            return leading + trimmed;
          }
          if (/^`endif\b/.test(directivePart)) {
            const popped = globalMacroStack.pop();
            if (popped) {
              const afterEndif = directivePart.replace(/^`endif\s*/, "");
              return leading + beforeDirective + "`endif // " + popped + (afterEndif ? " " + afterEndif : "");
            }
            return leading + trimmed;
          }
        }
        const ifdefM = trimmed.match(/^`ifn?def\s+(\w+)/);
        if (ifdefM) {
          const name = ifdefM[1];
          globalMacroStack.push(name);
          return leading + trimmed;
        }
        if (/^`else\b/.test(trimmed)) {
          const current = globalMacroStack[globalMacroStack.length - 1];
          if (current) {
            if (/\/\//.test(trimmed)) {
              if (!new RegExp(`//\\s*${current}$`).test(trimmed)) {
                return leading + "`else // " + current;
              }
              return leading + trimmed.replace(/`else.*?(\/\/\s*.*)$/, "`else // " + current);
            }
            return leading + "`else // " + current;
          }
          return leading + trimmed;
        }
        if (/^`endif\b/.test(trimmed)) {
          const popped = globalMacroStack.pop();
          if (popped) {
            const afterEndif = trimmed.replace(/^`endif\s*/, "");
            const hasExistingComment = /\/\//.test(afterEndif);
            if (hasExistingComment) {
              const parts = afterEndif.split("//");
              const beforeComment = parts[0].trim();
              const afterComment = parts.slice(1).join("//").trim();
              return leading + "`endif " + (beforeComment ? beforeComment + " " : "") + "// " + popped;
            } else {
              return leading + "`endif // " + popped + (afterEndif ? " " + afterEndif : "");
            }
          }
          return leading + "`endif";
        }
        return line;
      }
      function flushAssignments() {
        if (!pendingAssignments.length)
          return;
        const formatted = cfg.alignAssignments ? (0, assignments_1.alignAssignmentGroup)(pendingAssignments.map((a) => a.text)) : pendingAssignments.map((a) => a.text);
        formatted.forEach((l) => processed.push((0, comments_1.applyCommentColumn)(l, cfg)));
        pendingAssignments = [];
      }
      function flushWireDecls() {
        if (!pendingWireDecls.length)
          return;
        const formatted = cfg.alignWireDeclSemicolons ? (0, wires_1.alignWireDeclGroup)(pendingWireDecls.map((w) => w.text), cfg) : pendingWireDecls.map((w) => w.text);
        formatted.forEach((l) => processed.push((0, comments_1.applyCommentColumn)(l, cfg)));
        pendingWireDecls = [];
      }
      function flushParams() {
        if (!pendingParams.length)
          return;
        const formatted = cfg.alignParameters ? (0, parameters_1.alignParameterLines)(pendingParams.map((p) => p.text)) : pendingParams.map((p) => p.text);
        formatted.forEach((l) => processed.push((0, comments_1.applyCommentColumn)(l, cfg)));
        pendingParams = [];
      }
      function flushPorts() {
        if (!pendingPorts.length)
          return;
        const formatted = cfg.alignPortList ? (0, ports_1.alignPortDeclLines)(pendingPorts.map((p) => p.text)) : pendingPorts.map((p) => p.text);
        formatted.forEach((l) => processed.push((0, comments_1.applyCommentColumn)(l, cfg)));
        pendingPorts = [];
      }
      let moduleBodyActive = false;
      let functionDepth = 0;
      let alwaysDepth = 0;
      let parenBalance = 0;
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (cfg.removeTrailingWhitespace) {
          line = line.replace(/\s+$/, "");
        }
        if (cfg.annotateIfdefComments && /`(ifn?def|else|endif)\b/.test(line)) {
          line = annotateMacro(line);
        }
        const parenDepthBefore = parenBalance;
        {
          const __noCmtStr = line.replace(/\/\/.*$/, "").replace(/"(?:\\.|[^"\\])*"/g, '""');
          parenBalance += (__noCmtStr.match(/\(/g) || []).length - (__noCmtStr.match(/\)/g) || []).length;
          if (parenBalance < 0)
            parenBalance = 0;
        }
        if (cfg.formatModuleHeaders) {
          if (!inModuleHeader && /^\s*module\b/.test(line)) {
            flushAssignments();
            flushWireDecls();
            inModuleHeader = true;
            moduleHeaderLines = [];
          }
          if (inModuleHeader) {
            moduleHeaderLines.push(line);
            if (/;\s*(\/\/.*)?$/.test(line)) {
              const formattedHeader = (0, moduleHeader_1.formatModuleHeader)(moduleHeaderLines, cfg);
              formattedHeader.forEach((h) => processed.push(h));
              processed.push("");
              blankCount = 1;
              inModuleHeader = false;
              moduleBodyActive = true;
            }
            continue;
          }
        }
        const shouldCompressBlankLines = cfg.maxBlankLines < 100;
        if (line.trim() === "") {
          if (pendingAssignments.length && !inAssignmentContinuation) {
            blankCount++;
            if (shouldCompressBlankLines && blankCount > cfg.maxBlankLines)
              continue;
            pendingAssignments.push({ idx: i, text: line });
            continue;
          } else {
            flushAssignments();
          }
          if (pendingParams.length && !inParamContinuation) {
            blankCount++;
            if (shouldCompressBlankLines && blankCount > cfg.maxBlankLines)
              continue;
            pendingParams.push({ idx: i, text: line });
            continue;
          } else {
            flushParams();
          }
          if (pendingWireDecls.length && !inWireContinuation) {
            const firstPendingIsIO = /^\s*(input|output|inout)\b/.test(pendingWireDecls[0].text);
            wireGroupNonDeclCount++;
            if (firstPendingIsIO && wireGroupNonDeclCount > 3) {
              flushWireDecls();
              wireGroupNonDeclCount = 0;
            } else {
              blankCount++;
              if (shouldCompressBlankLines && blankCount > cfg.maxBlankLines)
                continue;
              pendingWireDecls.push({ idx: i, text: line });
              continue;
            }
          } else {
            flushWireDecls();
          }
          blankCount++;
          if (shouldCompressBlankLines && blankCount > cfg.maxBlankLines)
            continue;
          processed.push("");
          continue;
        } else {
          blankCount = 0;
        }
        if (/^\s*\b(function|task)\b/.test(line)) {
          functionDepth++;
        }
        if (/^\s*\b(endfunction|endtask)\b/.test(line)) {
          flushWireDecls();
          functionDepth--;
          if (functionDepth < 0)
            functionDepth = 0;
        }
        if (/^\s*\b(always|initial)\b/.test(line)) {
          alwaysDepth++;
        }
        if (alwaysDepth > 0) {
          const beginCount = (line.match(/\bbegin\b/g) || []).length;
          const endCount = (line.match(/\bend\b/g) || []).length;
          alwaysDepth += beginCount - endCount;
          if (alwaysDepth < 0)
            alwaysDepth = 0;
        }
        if (inWireContinuation) {
          pendingWireDecls.push({ idx: i, text: line });
          if (/;\s*(\/\/.*)?$/.test(line)) {
            inWireContinuation = false;
          }
          continue;
        }
        if (cfg.alignWireDeclSemicolons && parenDepthBefore === 0 && !/\bbegin\b/.test(line) && /^\s*(wire|reg|logic|input|output|inout|integer|genvar)\b/.test(line)) {
          const lineWithoutComment = line.replace(/\/\/.*$/, "");
          const hasEqualSign = /=/.test(lineWithoutComment);
          const isIODecl = /^\s*(input|output|inout)\b/.test(line);
          if (pendingWireDecls.length && !inWireContinuation && functionDepth === 0) {
            const firstPendingWithoutComment = pendingWireDecls[0].text.replace(/\/\/.*$/, "");
            const firstPendingHasEqual = /=/.test(firstPendingWithoutComment);
            const firstPendingIsIO = /^\s*(input|output|inout)\b/.test(pendingWireDecls[0].text);
            if (firstPendingIsIO !== isIODecl || firstPendingHasEqual !== hasEqualSign || __declVarKind(pendingWireDecls[0].text) !== __declVarKind(line)) {
              flushWireDecls();
              wireGroupNonDeclCount = 0;
            }
          }
          if (!pendingWireDecls.length) {
            flushAssignments();
            flushParams();
            flushPorts();
          }
          pendingWireDecls.push({ idx: i, text: line });
          wireGroupNonDeclCount = 0;
          if (!/;\s*(\/\/.*)?$/.test(line)) {
            inWireContinuation = true;
          }
          continue;
        } else if (pendingWireDecls.length && !inWireContinuation) {
          const firstPendingIsIO = /^\s*(input|output|inout)\b/.test(pendingWireDecls[0].text);
          if (/^\s*\/\//.test(line) || /^\s*`(ifn?def|else|endif)\b/.test(line)) {
            pendingWireDecls.push({ idx: i, text: line });
            continue;
          } else {
            const isParam = /^\s*(parameter|localparam)\b/.test(line);
            if (!firstPendingIsIO || isParam) {
              flushWireDecls();
              wireGroupNonDeclCount = 0;
            } else {
              wireGroupNonDeclCount++;
              pendingWireDecls.push({ idx: i, text: line });
              continue;
            }
          }
        }
        if (inParamContinuation) {
          pendingParams.push({ idx: i, text: line });
          if (/;\s*(\/\/.*)?$/.test(line)) {
            inParamContinuation = false;
          }
          continue;
        }
        if (cfg.alignParameters && /^\s*(parameter|localparam)\b/.test(line)) {
          if (!pendingParams.length) {
            flushWireDecls();
            flushAssignments();
            flushPorts();
          }
          let paramLine = line;
          if (!/^\s\s/.test(line) && /^(parameter|localparam)\b/.test(line.trimStart())) {
            paramLine = "  " + line.trimStart();
          }
          pendingParams.push({ idx: i, text: paramLine });
          if (!/;\s*(\/\/.*)?$/.test(line)) {
            inParamContinuation = true;
          }
          continue;
        } else if (pendingParams.length && inParamContinuation) {
          pendingParams.push({ idx: i, text: line });
          if (/;\s*(\/\/.*)?$/.test(line)) {
            inParamContinuation = false;
          }
          continue;
        } else if (pendingParams.length && !inParamContinuation) {
          if (/^\s*\/\//.test(line) || /^\s*`(ifn?def|else|endif)\b/.test(line) || /^\s*$/.test(line)) {
            pendingParams.push({ idx: i, text: line });
            continue;
          } else {
            flushParams();
          }
        }
        if (inPortContinuation) {
          pendingPorts.push({ idx: i, text: line });
          if (/;\s*(\/\/.*)?$/.test(line)) {
            inPortContinuation = false;
          }
          continue;
        }
        if (inAssignmentContinuation) {
          pendingAssignments.push({ idx: i, text: line });
          if (/;\s*(\/\/.*)?$/.test(line)) {
            inAssignmentContinuation = false;
          }
          continue;
        }
        if (cfg.alignAssignments && /^\s*assign\b/.test(line)) {
          pendingAssignments.push({ idx: i, text: line });
          if (!/;\s*(\/\/.*)?$/.test(line)) {
            inAssignmentContinuation = true;
          }
          continue;
        }
        const genericAssignStart = cfg.alignAssignments && alwaysDepth === 0 && /;\s*(\/\/.*)?$/.test(line) && __splitTopLevelAssign(line) !== null && !/^\s*(wire|reg|logic|input|output|inout)\b/.test(line);
        if (genericAssignStart) {
          pendingAssignments.push({ idx: i, text: line });
          continue;
        }
        if (pendingAssignments.length && !inAssignmentContinuation) {
          if (/^\s*\/\//.test(line) || /^\s*`(ifn?def|else|endif)\b/.test(line)) {
            pendingAssignments.push({ idx: i, text: line });
            continue;
          } else if (!/^\s*assign\b/.test(line)) {
            flushAssignments();
          }
        }
        line = (0, comments_1.applyCommentColumn)(line, cfg);
        if (/^\s*\/\//.test(line) && line.length > cfg.lineLength) {
          line = (0, comments_1.wrapComment)(line, cfg.lineLength);
        }
        processed.push(line);
      }
      flushAssignments();
      flushWireDecls();
      flushParams();
      flushPorts();
      const withBeginMoved = cfg.enforceBeginEnd ? moveBeginToSameLine(processed) : processed;
      const withFixedEndIf = cfg.enforceBeginEnd ? fixEndIfPattern(withBeginMoved) : withBeginMoved;
      const hasAlwaysBlocks = withFixedEndIf.some((line) => /^\s*(always|initial)\b/.test(line));
      const hasFuncTaskBlocks = withFixedEndIf.some((line) => /^\s*(?:virtual\s+)?(?:automatic\s+|static\s+)?(?:function|task)\b/.test(line));
      const withAlways = cfg.indentAlwaysBlocks && (hasAlwaysBlocks || hasFuncTaskBlocks) ? (0, alwaysBlocks_1.indentAlwaysBlocks)(withFixedEndIf, cfg.indentSize) : withFixedEndIf;
      const withAlignedConditions = (0, conditions_1.alignMultilineConditions)(withAlways);
      const withFixedIndent = cfg.indentAlwaysBlocks ? fixModuleLevelIndentation(withAlignedConditions, cfg.indentSize) : withAlignedConditions;
      let controlBlocks = withFixedIndent;
      if (cfg.enforceBeginEnd && !cfg.indentAlwaysBlocks) {
        let prevLength = 0;
        let iterations = 0;
        const maxIterations = 10;
        while (iterations < maxIterations) {
          prevLength = controlBlocks.length;
          controlBlocks = (0, controlFlow_1.enforceIfBlocks)(controlBlocks, cfg.indentSize);
          controlBlocks = (0, controlFlow_1.enforceForLoopBlocks)(controlBlocks, cfg.indentSize);
          if (controlBlocks.length === prevLength) {
            break;
          }
          iterations++;
        }
      }
      const withInstantiations = cfg.formatModuleInstantiations ? (0, instantiations_1.formatModuleInstantiations)(controlBlocks, cfg.indentSize) : controlBlocks;
      const withCaseIndent = cfg.indentCaseStatements ? (0, caseStatements_1.indentCaseStatements)(withInstantiations, cfg.indentSize) : withInstantiations;
      const withBlockAlignment = cfg.indentCaseStatements || cfg.indentAlwaysBlocks ? (0, blockAssignments_1.alignBlockAssignments)(withCaseIndent, cfg) : withCaseIndent;
      let finalLines = cfg.indentAlwaysBlocks ? withBlockAlignment : normalizeIfdefIndentation(withBlockAlignment);
      if (cfg.annotateIfdefComments) {
        finalLines = alignIfdefBranches(finalLines);
      }
      if (cfg.removeTrailingWhitespace) {
        for (let i = 0; i < finalLines.length; i++) {
          finalLines[i] = finalLines[i].replace(/\s+$/, "");
        }
      }
      while (finalLines.length > 0 && finalLines[finalLines.length - 1].trim() === "") {
        finalLines.pop();
      }
      const newText = finalLines.join("\n") + (original.endsWith("\n") ? "\n" : "");
      if (newText === original) {
        return [];
      }
      const fullRange = new vscode2.Range(document.positionAt(0), document.positionAt(original.length));
      return [vscode2.TextEdit.replace(fullRange, newText)];
    }
    function formatRange(document, range, options) {
      const { formatRange: modularFormatRange } = require_rangeFormatting();
      return modularFormatRange(document, range, options, formatVerilogText2);
    }
    function formatVerilogText2(text, indentSize = 2) {
      const mockDoc = {
        getText: () => text,
        positionAt: (offset) => {
          let line = 0, char = 0;
          for (let i = 0; i < offset; i++) {
            if (text[i] === "\n") {
              line++;
              char = 0;
            } else {
              char++;
            }
          }
          return { line, character: char };
        }
      };
      const mockOptions = {
        insertSpaces: true,
        tabSize: indentSize
      };
      const edits = formatDocument(mockDoc, mockOptions);
      if (edits && edits.length > 0) {
        return edits[0].newText;
      }
      return text;
    }
  }
});

// package.json
var require_package = __commonJS({
  "package.json"(exports2, module2) {
    module2.exports = {
      name: "verigood-verilog-formatter",
      displayName: "VeriGood - SystemVerilog/Verilog Formatter",
      description: "Verilog/SystemVerilog formatter with granular control over formatting features and UVM testbench support.",
      version: "1.8.3",
      publisher: "FabioOliveira",
      icon: "icon.png",
      author: {
        name: "fabiodao"
      },
      homepage: "https://github.com/fabiodao/VeriGood-verilog_formatter#readme",
      repository: {
        type: "git",
        url: "https://github.com/fabiodao/VeriGood-verilog_formatter.git"
      },
      bugs: {
        url: "https://github.com/fabiodao/VeriGood-verilog_formatter/issues"
      },
      license: "MIT",
      keywords: [
        "verilog",
        "systemverilog",
        "formatter",
        "beautifier",
        "hdl",
        "hardware",
        "rtl",
        "fpga",
        "asic",
        "code-formatter",
        "verilog-formatter",
        "systemverilog-formatter"
      ],
      engines: {
        vscode: "^1.105.0"
      },
      categories: [
        "Formatters",
        "Programming Languages"
      ],
      activationEvents: [
        "onLanguage:verilog",
        "onLanguage:systemverilog"
      ],
      main: "./dist/extension.js",
      bin: {
        "verigood-fmt": "./bin/verigood-fmt.js"
      },
      contributes: {
        languages: [
          {
            id: "verilog",
            extensions: [
              ".v",
              ".vh"
            ],
            aliases: [
              "Verilog"
            ]
          },
          {
            id: "systemverilog",
            extensions: [
              ".sv",
              ".svh"
            ],
            aliases: [
              "SystemVerilog"
            ]
          }
        ],
        configuration: {
          title: "Verilog Formatter",
          properties: {
            "verilogFormatter.indentSize": {
              type: "number",
              default: 2,
              description: "Number of spaces per indentation level. When not explicitly set, the formatter inherits the editor's Tab Size (editor.tabSize)."
            },
            "verilogFormatter.maxBlankLines": {
              type: "number",
              default: 1,
              description: "Maximum number of consecutive blank lines to keep. Additional blank lines are collapsed."
            },
            "verilogFormatter.alignPortList": {
              type: "boolean",
              default: true,
              description: "Align the direction, type, range, and name columns of ports in module headers."
            },
            "verilogFormatter.alignParameters": {
              type: "boolean",
              default: true,
              description: "Align parameters and localparams in module headers on their '=' sign."
            },
            "verilogFormatter.wrapPortList": {
              type: "boolean",
              default: true,
              description: "Wrap port lists onto multiple lines when they exceed the configured line length."
            },
            "verilogFormatter.lineLength": {
              type: "number",
              default: 160,
              description: "Maximum line length used as a wrapping guideline."
            },
            "verilogFormatter.removeTrailingWhitespace": {
              type: "boolean",
              default: true,
              description: "Remove trailing whitespace and ensure blank lines contain no spaces."
            },
            "verilogFormatter.alignAssignments": {
              type: "boolean",
              default: true,
              description: "Align the '='/'<=' operators of consecutive assign and procedural assignments. Semicolons stay tight to the right-hand side."
            },
            "verilogFormatter.alignWireDeclSemicolons": {
              type: "boolean",
              default: true,
              description: "Align the trailing semicolons of consecutive wire/reg/logic declarations."
            },
            "verilogFormatter.commentColumn": {
              type: "number",
              default: 0,
              description: "Column at which to align trailing '//' comments. Set to 0 to disable comment-column alignment."
            },
            "verilogFormatter.formatModuleInstantiations": {
              type: "boolean",
              default: true,
              description: "Format module instantiations, aligning port and parameter connections."
            },
            "verilogFormatter.formatModuleHeaders": {
              type: "boolean",
              default: true,
              description: "Format module headers with aligned ports and parameters."
            },
            "verilogFormatter.indentAlwaysBlocks": {
              type: "boolean",
              default: true,
              description: "Indent the contents of always, initial, and other procedural blocks."
            },
            "verilogFormatter.enforceBeginEnd": {
              type: "boolean",
              default: true,
              description: "Add begin/end blocks around single-statement if/else/for bodies."
            },
            "verilogFormatter.indentCaseStatements": {
              type: "boolean",
              default: true,
              description: "Indent case statements and their case items."
            },
            "verilogFormatter.annotateIfdefComments": {
              type: "boolean",
              default: true,
              description: "Annotate `else and `endif directives with the originating macro name as a trailing comment."
            },
            "verilogFormatter.enableUVMFormatting": {
              type: "boolean",
              default: true,
              description: "Automatically detect UVM/SystemVerilog testbenches and format them with UVM conventions, independent of RTL formatting (no module-level alignment, editor-controlled indentation)."
            },
            "verilogFormatter.uvmLineLength": {
              type: "number",
              default: 100,
              description: "Maximum line length for UVM testbench code (industry standard is 100 characters)."
            }
          }
        }
      },
      scripts: {
        "vscode:prepublish": "npm run compile",
        clean: `node -e "require('fs').rmSync('dist', { recursive: true, force: true })"`,
        compile: "npm run clean && tsc -p .",
        watch: "tsc -w -p .",
        "test:generate": "npm run compile && node tests/generate_expected.js",
        test: "npm run compile && node tests/run_tests.js",
        format: "node bin/verigood-fmt.js",
        "format:check": "node bin/verigood-fmt.js --check",
        "build:cli": "npm run compile && node esbuild.config.js",
        prepackage: "npm test",
        package: "vsce package",
        prepublish: "npm test",
        publish: "vsce publish"
      },
      devDependencies: {
        "@types/node": "^20.11.30",
        "@types/vscode": "^1.105.0",
        esbuild: "^0.28.1",
        typescript: "^5.4.0"
      }
    };
  }
});

// cli/runner.js
var require_runner = __commonJS({
  "cli/runner.js"(exports2, module2) {
    "use strict";
    var fs = require("fs");
    var path = require("path");
    var BOOLEAN_DEFAULTS = {
      alignPortList: true,
      alignParameters: true,
      wrapPortList: true,
      removeTrailingWhitespace: true,
      alignAssignments: true,
      alignWireDeclSemicolons: true,
      formatModuleInstantiations: true,
      formatModuleHeaders: true,
      indentAlwaysBlocks: true,
      enforceBeginEnd: true,
      indentCaseStatements: true,
      annotateIfdefComments: true,
      enableUVMFormatting: true
    };
    var NUMBER_DEFAULTS = {
      indentSize: 2,
      maxBlankLines: 1,
      lineLength: 160,
      commentColumn: 0,
      uvmLineLength: 100
    };
    var ALIASES = {
      uvm: "enableUVMFormatting"
    };
    var VERILOG_EXTENSIONS = /* @__PURE__ */ new Set([".v", ".vh", ".sv", ".svh"]);
    function camelToKebab(name) {
      return name.replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2").replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
    }
    var FLAG_TO_KEY = {};
    for (const key of [...Object.keys(BOOLEAN_DEFAULTS), ...Object.keys(NUMBER_DEFAULTS)]) {
      FLAG_TO_KEY[camelToKebab(key)] = key;
    }
    for (const [alias, key] of Object.entries(ALIASES)) {
      FLAG_TO_KEY[alias] = key;
    }
    function isBooleanKey(key) {
      return Object.prototype.hasOwnProperty.call(BOOLEAN_DEFAULTS, key);
    }
    function isNumberKey(key) {
      return Object.prototype.hasOwnProperty.call(NUMBER_DEFAULTS, key);
    }
    function fail(message) {
      process.stderr.write(`error: ${message}
`);
      process.exit(2);
    }
    function parseBool(raw) {
      const v = String(raw).toLowerCase();
      if (["true", "1", "yes", "y", "on"].includes(v)) return true;
      if (["false", "0", "no", "n", "off"].includes(v)) return false;
      fail(`expected a boolean value, got: ${raw}`);
    }
    function parseNumber(flag, raw) {
      if (raw === void 0) fail(`--${flag} expects a value`);
      const n = Number(raw);
      if (!Number.isFinite(n)) fail(`--${flag} expects a number, got: ${raw}`);
      return n;
    }
    function parseArgs(argv) {
      const opts = {
        overrides: {},
        // camelCase key -> value (booleans + numbers, excluding indentSize)
        indentSize: NUMBER_DEFAULTS.indentSize,
        files: [],
        write: false,
        check: false,
        help: false,
        version: false
      };
      let noMoreFlags = false;
      for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (noMoreFlags || arg === "-" || !arg.startsWith("-")) {
          opts.files.push(arg);
          continue;
        }
        if (arg === "--") {
          noMoreFlags = true;
          continue;
        }
        if (arg === "-h" || arg === "--help") {
          opts.help = true;
          continue;
        }
        if (arg === "-v" || arg === "--version") {
          opts.version = true;
          continue;
        }
        if (arg === "-w" || arg === "--write") {
          opts.write = true;
          continue;
        }
        if (arg === "-c" || arg === "--check") {
          opts.check = true;
          continue;
        }
        let rawName = arg;
        let inlineValue;
        const eq = arg.indexOf("=");
        if (eq !== -1) {
          rawName = arg.slice(0, eq);
          inlineValue = arg.slice(eq + 1);
        }
        let flagName = rawName.replace(/^--?/, "");
        let negated = false;
        if (flagName.startsWith("no-")) {
          negated = true;
          flagName = flagName.slice(3);
        }
        const key = FLAG_TO_KEY[flagName];
        if (!key) fail(`unknown option: ${rawName}`);
        if (negated && !isBooleanKey(key)) {
          fail(`the "no-" prefix is only valid for boolean options: ${rawName}`);
        }
        if (key === "indentSize") {
          const value = inlineValue !== void 0 ? inlineValue : argv[++i];
          opts.indentSize = parseNumber("indent-size", value);
          continue;
        }
        if (isBooleanKey(key)) {
          opts.overrides[key] = inlineValue !== void 0 ? parseBool(inlineValue) : !negated;
          continue;
        }
        if (isNumberKey(key)) {
          const value = inlineValue !== void 0 ? inlineValue : argv[++i];
          opts.overrides[key] = parseNumber(flagName, value);
          continue;
        }
        fail(`unknown option: ${rawName}`);
      }
      return opts;
    }
    function collectFromDirectory(dir, out) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") continue;
          collectFromDirectory(path.join(dir, entry.name), out);
        } else if (VERILOG_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
          out.push(path.join(dir, entry.name));
        }
      }
    }
    function resolveTargets(files) {
      const targets = [];
      for (const file of files) {
        let stat;
        try {
          stat = fs.statSync(file);
        } catch (err) {
          fail(`cannot access "${file}": ${err.message}`);
        }
        if (stat.isDirectory()) {
          collectFromDirectory(file, targets);
        } else {
          targets.push(file);
        }
      }
      return targets;
    }
    function readStdin() {
      try {
        return fs.readFileSync(0, "utf8");
      } catch (err) {
        fail(`could not read from stdin: ${err.message}`);
      }
    }
    function printVersion() {
      try {
        const pkg = require_package();
        process.stdout.write(`${pkg.name} ${pkg.version}
`);
      } catch {
        process.stdout.write("unknown\n");
      }
    }
    function printHelp() {
      const lines = [];
      lines.push("VeriGood - Verilog/SystemVerilog formatter (CLI)");
      lines.push("");
      lines.push("Usage:");
      lines.push("  verigood-fmt [options] [file|dir ...]");
      lines.push("  cat file.v | verigood-fmt [options]");
      lines.push("");
      lines.push("The full default configuration is always loaded; the options below");
      lines.push("override individual settings for this run only.");
      lines.push("");
      lines.push("Modes:");
      lines.push("  (default)            Print the formatted result to stdout (single file or stdin).");
      lines.push("  -w, --write          Rewrite the given files in place.");
      lines.push("  -c, --check          Do not write; exit 1 if any file is not already formatted.");
      lines.push("");
      lines.push("Info:");
      lines.push("  -h, --help           Show this help.");
      lines.push("  -v, --version        Show the version.");
      lines.push("");
      lines.push("Numeric options:");
      for (const key of Object.keys(NUMBER_DEFAULTS)) {
        const flag = `--${camelToKebab(key)} <n>`;
        lines.push(`  ${flag.padEnd(28)} default: ${NUMBER_DEFAULTS[key]}`);
      }
      lines.push("");
      lines.push("Boolean options (enable with --flag, disable with --no-flag):");
      for (const key of Object.keys(BOOLEAN_DEFAULTS)) {
        const flag = `--[no-]${camelToKebab(key)}`;
        lines.push(`  ${flag.padEnd(38)} default: ${BOOLEAN_DEFAULTS[key]}`);
      }
      lines.push("  --[no-]uvm                             alias for --[no-]enable-uvm-formatting");
      lines.push("");
      lines.push("Examples:");
      lines.push("  verigood-fmt design.v");
      lines.push("  verigood-fmt -w rtl/");
      lines.push("  verigood-fmt -c rtl/ generated/top.v");
      lines.push("  verigood-fmt -w --indent-size 4 --no-indent-always-blocks a.v");
      process.stdout.write(lines.join("\n") + "\n");
    }
    function run2(argv, makeFormatter2) {
      const opts = parseArgs(argv);
      if (opts.help) {
        printHelp();
        return 0;
      }
      if (opts.version) {
        printVersion();
        return 0;
      }
      if (opts.write && opts.check) {
        fail("choose either --write or --check, not both.");
      }
      const format = makeFormatter2(opts.overrides, opts.indentSize);
      const hasStdinToken = opts.files.includes("-");
      const useStdin = opts.files.length === 0 || opts.files.length === 1 && hasStdinToken;
      if (useStdin) {
        const input = readStdin();
        process.stdout.write(format(input));
        return 0;
      }
      if (hasStdinToken) {
        fail('stdin ("-") cannot be combined with file arguments.');
      }
      const targets = resolveTargets(opts.files);
      if (targets.length === 0) {
        fail("no Verilog/SystemVerilog files found.");
      }
      if (opts.check) {
        const unformatted = [];
        for (const file of targets) {
          const input = fs.readFileSync(file, "utf8");
          if (format(input) !== input) unformatted.push(file);
        }
        if (unformatted.length > 0) {
          process.stderr.write("Not formatted:\n");
          unformatted.forEach((f) => process.stderr.write(`  ${f}
`));
          return 1;
        }
        process.stdout.write(`All ${targets.length} file(s) already formatted.
`);
        return 0;
      }
      if (opts.write) {
        let changed = 0;
        for (const file of targets) {
          const input = fs.readFileSync(file, "utf8");
          const output = format(input);
          if (output !== input) {
            fs.writeFileSync(file, output, "utf8");
            changed++;
            process.stderr.write(`formatted ${file}
`);
          }
        }
        process.stderr.write(`Done: ${changed} of ${targets.length} file(s) changed.
`);
        return 0;
      }
      if (targets.length > 1) {
        fail("multiple files given; use --write to format in place or --check to verify.");
      }
      process.stdout.write(format(fs.readFileSync(targets[0], "utf8")));
      return 0;
    }
    module2.exports = { run: run2 };
  }
});

// cli/standalone.js
var vscode = require_vscode_shim();
var { formatVerilogText } = require_formatter();
var { run } = require_runner();
function makeFormatter(overrides, indentSize) {
  vscode.__setOverrides(overrides);
  return (text) => formatVerilogText(text, indentSize);
}
process.exit(run(process.argv.slice(2), makeFormatter));
