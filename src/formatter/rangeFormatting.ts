/**
 * Range formatting module - handles formatting of selected text ranges
 * Extracted from original formatter.ts for modular architecture
 */

import * as vscode from 'vscode';
import { Config } from './types';

/**
 * Format only a specific range of lines from a document
 * Calculates alignment values based only on the selected range
 */
export function formatRange(
  document: vscode.TextDocument,
  range: vscode.Range,
  options: vscode.FormattingOptions,
  formatDocumentFn: (text: string, indentSize: number) => string
): vscode.TextEdit[] {
  const startLine = range.start.line;
  const endLine = range.end.line;

  // Extract just the selected lines
  const selectedLines: string[] = [];
  for (let i = startLine; i <= endLine; i++) {
    selectedLines.push(document.lineAt(i).text);
  }

  // Use tabSize from FormattingOptions (reflects current editor setting from bottom bar)
  const workspaceTabSize = options.tabSize || 2;

  // Get configuration
  const wcfg = vscode.workspace.getConfiguration('verilogFormatter');
  // Check if user has explicitly set indentSize (not just using default)
  const indentInspect = wcfg.inspect<number>('indentSize');
  let indentSize = workspaceTabSize;

  // Use explicitly set value (workspace, workspace folder, or global)
  if (indentInspect?.workspaceFolderValue !== undefined) {
    indentSize = indentInspect.workspaceFolderValue;
  } else if (indentInspect?.workspaceValue !== undefined) {
    indentSize = indentInspect.workspaceValue;
  } else if (indentInspect?.globalValue !== undefined) {
    indentSize = indentInspect.globalValue;
  }
  // Otherwise use workspace tabSize (already set above)

  const cfg: Config = {
    indentSize: indentSize,
    maxBlankLines: wcfg.get<number>('maxBlankLines', 2),
    alignAssignments: wcfg.get<boolean>('alignAssignments', true),
    alignPortList: wcfg.get<boolean>('alignPortList', true),
    alignWireDeclSemicolons: wcfg.get<boolean>('alignWireDeclSemicolons', true),
    alignParameters: wcfg.get<boolean>('alignParameters', true),
    wrapPortList: wcfg.get<boolean>('wrapPortList', false),
    lineLength: wcfg.get<number>('lineLength', 120),
    removeTrailingWhitespace: wcfg.get<boolean>('removeTrailingWhitespace', true),
    commentColumn: wcfg.get<number>('commentColumn', 40),
    formatModuleHeaders: wcfg.get<boolean>('formatModuleHeaders', true),
    formatModuleInstantiations: wcfg.get<boolean>('formatModuleInstantiations', true),
    indentAlwaysBlocks: wcfg.get<boolean>('indentAlwaysBlocks', true),
    enforceBeginEnd: wcfg.get<boolean>('enforceBeginEnd', true),
    indentCaseStatements: wcfg.get<boolean>('indentCaseStatements', true),
    annotateIfdefComments: wcfg.get<boolean>('annotateIfdefComments', true),
  };

  // Format the selected lines
  const formattedLines = formatVerilogRange(selectedLines, indentSize, cfg, formatDocumentFn);

  // Detect the line ending used in the document
  const docText = document.getText();
  const eol = docText.includes('\r\n') ? '\r\n' : '\n';

  // Create the edit using the document's line ending
  const newText = formattedLines.join(eol);

  return [vscode.TextEdit.replace(range, newText)];
}

/**
 * Format a range of Verilog lines with alignment based only on those lines
 */
function formatVerilogRange(
  lines: string[],
  indentSize: number,
  cfg: Config,
  formatDocumentFn: (text: string, indentSize: number) => string
): string[] {
  const unit = ' '.repeat(indentSize);
  let result = [...lines];

  // Check if we have complete structures that can be safely re-indented
  const hasCompleteAlwaysBlock = hasCompleteStructure(result, 'always', 'begin', 'end');
  const hasCompleteInitialBlock = hasCompleteStructure(result, 'initial', 'begin', 'end');
  const hasCompleteGenerateBlock = hasCompleteStructure(result, 'generate', '', 'endgenerate');
  const hasCompleteForBlock = hasCompleteStructure(result, 'for', 'begin', 'end');
  const hasCompleteCaseBlock = hasCompleteStructure(result, 'case|casez|casex', '', 'endcase');
  const hasCompleteIfBlock = hasCompleteIfElseStructure(result);

  // If we have complete structural blocks, apply full formatting including indentation
  if (hasCompleteAlwaysBlock || hasCompleteInitialBlock || hasCompleteGenerateBlock ||
      hasCompleteForBlock || hasCompleteCaseBlock || hasCompleteIfBlock) {
    // Create a minimal document with just these lines to pass through full formatter
    const tempText = result.join('\n');
    const formattedText = formatDocumentFn(tempText, indentSize);
    result = formattedText.split(/\r?\n/);
  } else {
    // Apply only alignment-based formatting (no indentation changes)

    // 0. Annotate macro directives if enabled
    if (cfg.annotateIfdefComments) {
      const globalMacroStack: string[] = [];
      const annotateRangeMacro = (line: string): string => {
        const leading = line.match(/^\s*/)?.[0] || '';
        const trimmed = line.trim();

        // Check if directive appears mid-line (like "{`ifdef SYMBOL")
        if (/{`(ifdef|ifndef)\s+(\w+)/.test(trimmed)) {
          const m = trimmed.match(/{`(ifdef|ifndef)\s+(\w+)/);
          if (m) {
            globalMacroStack.push(m[2]);
          }
          return line;
        }

        if (/{`(else|elsif)\b/.test(trimmed)) {
          // Handle `else or `elsif inside braces
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

        if (!trimmed.startsWith('`')) return line;

        const ifdefMatch = trimmed.match(/^`(ifdef|ifndef)\s+(\w+)/);
        if (ifdefMatch) {
          globalMacroStack.push(ifdefMatch[2]);
          return line;
        }

        if (/^`else\b/.test(trimmed)) {
          const top = globalMacroStack[globalMacroStack.length - 1];
          if (top && !/^`else\s*\/\//.test(trimmed)) {
            return leading + '`else // ' + top;
          }
          return line;
        }

        if (/^`endif\b/.test(trimmed)) {
          const top = globalMacroStack.pop();
          if (top && !/^`endif\s*\/\//.test(trimmed)) {
            return leading + '`endif // ' + top;
          }
          return line;
        }

        return line;
      };
      result = result.map(annotateRangeMacro);
    }

    // 1. Remove trailing whitespace if requested
    if (cfg.removeTrailingWhitespace) {
      result = result.map(line => line.trimEnd());
    }

    // 2. Compress blank lines
    if (cfg.maxBlankLines < 100) {
      const compressed: string[] = [];
      let blankCount = 0;
      for (const line of result) {
        if (line.trim() === '') {
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

    // 3. Detect module header
    let hasModuleHeader = false;
    for (let i = 0; i < result.length; i++) {
      if (/^\s*module\s+\w+/.test(result[i])) {
        hasModuleHeader = true;
        break;
      }
    }

    // 4. Detect module instantiation without module header
    let hasModuleInst = false;
    let hasOnlyConnections = true;
    for (let i = 0; i < result.length; i++) {
      const line = result[i];
      if (/^\s*[A-Za-z_][A-Za-z0-9_]*\s+#?\s*\(/.test(line) || /^\s*[A-Za-z_][A-Za-z0-9_]*\s+[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(line)) {
        if (!/^\s*module\s+/.test(line)) {
          hasModuleInst = true;
        }
      }
      // Check if we have any actual module structure (not just port connections)
      if (/^\s*\w+\s+#\s*\(/.test(line) || /^\s*\)\s+\w+\s*\(/.test(line)) {
        hasOnlyConnections = false;
      }
    }

    // 5. Align multiline conditions
    result = alignMultilineConditions(result);

    // 6. Format module header if detected
    if (cfg.formatModuleHeaders && hasModuleHeader) {
      try {
        result = formatModuleHeader(result, cfg);
      } catch (e) {
        console.error('Range formatting: module header error', e);
      }
    }

    // 7. Align assignments if requested
    if (cfg.alignAssignments) {
      result = alignAssignmentsInRange(result);
    }

    // 8. Align wire/reg declarations if requested
    if (cfg.alignWireDeclSemicolons) {
      result = alignWireDeclarationsInRange(result);
    }

    // 9. Align parameters if requested (only if not inside module header)
    if (cfg.alignParameters && !hasModuleHeader) {
      result = alignParametersInRange(result);
    }

    // 10. Align input/output port declarations if requested (only if not inside module header)
    if (cfg.alignPortList && !hasModuleHeader) {
      result = alignPortDeclarationsInRange(result);
    }

    // 11. Format module instantiations if requested (only if not module header and has actual instantiation structure)
    if (cfg.formatModuleInstantiations && hasModuleInst && !hasModuleHeader && !hasOnlyConnections) {
      try {
        result = formatModuleInstantiations(result, indentSize);
      } catch (e) {
        console.error('Range formatting: module instantiation error', e);
      }
    }
  }

  return result;
}

// Helper functions

function hasCompleteStructure(lines: string[], startKeyword: string, beginKeyword: string, endKeyword: string): boolean {
  let hasStart = false;
  let depth = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for start keyword (e.g., always, for, case)
    const startRegex = new RegExp(`^(${startKeyword})\\b`);
    if (startRegex.test(trimmed)) {
      hasStart = true;
      if (beginKeyword && trimmed.includes(beginKeyword)) {
        depth++;
      }
    }

    // Check for begin
    if (beginKeyword && /\bbegin\b/.test(trimmed)) {
      depth++;
    }

    // Check for end
    if (endKeyword) {
      if (new RegExp(`\\b${endKeyword}\\b`).test(trimmed)) {
        depth--;
      }
    }
  }

  return hasStart && depth === 0;
}

function hasCompleteIfElseStructure(lines: string[]): boolean {
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
        // Check if there's an else on the same line or next line
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

// Import from existing modules
import { formatModuleHeader } from './formatting/moduleHeader';
import { formatModuleInstantiations } from './formatting/instantiations';

// Alignment functions for range formatting
function alignMultilineConditions(lines: string[]): string[] {
  // Import from indentation/conditions
  const { alignMultilineConditions: alignFn } = require('./indentation/conditions');
  return alignFn(lines);
}

function alignAssignmentsInRange(lines: string[]): string[] {
  const assignLines: { index: number; indent: string; lhs: string; rhs: string; comment: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Match assign statements: lhs = rhs ; //comment
    const match = trimmed.match(/^(.+?)\s*(<=|=)(?!=)\s*(.+?)\s*;\s*(\/\/.*)?$/);
    if (match) {
      const indent = line.match(/^(\s*)/)?.[1] || '';
      const lhs = match[1].trim();
      const rhs = match[3].trim();
      const comment = match[4] || '';
      assignLines.push({ index: i, indent, lhs, rhs, comment });
    }
  }

  if (assignLines.length === 0) return lines;

  // Calculate max lengths
  const maxLhs = Math.max(...assignLines.map(a => a.lhs.length));
  const maxRhs = Math.max(...assignLines.map(a => a.rhs.length));

  // Format
  const result = [...lines];
  for (const assign of assignLines) {
    const lhsPadded = assign.lhs.padEnd(maxLhs);
    const rhsPadded = assign.rhs.padEnd(maxRhs);
    result[assign.index] = `${assign.indent}${lhsPadded} = ${rhsPadded};${assign.comment ? ' ' + assign.comment : ''}`;
  }

  return result;
}

function alignWireDeclarationsInRange(lines: string[]): string[] {
  const declLines: {
    index: number;
    indent: string;
    type: string;
    range: string;
    name: string;
    arrayDim: string;
    init: string;
    comment: string;
    continuationComments?: number[]
  }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Match wire/reg/logic declarations
    const match = trimmed.match(/^(wire|reg|logic|bit|int|integer|real|time)\s+(\[[^\]]+\])?\s*([A-Za-z_][A-Za-z0-9_]*)\s*(\[[^\]]+\])?\s*(=\s*.+?)?\s*;\s*(\/\/.*)?$/);
    if (match) {
      const indent = line.match(/^(\s*)/)?.[1] || '';
      const type = match[1];
      const range = match[2] || '';
      const name = match[3];
      const arrayDim = match[4] || '';
      const init = match[5] || '';
      const comment = match[6] || '';
      declLines.push({ index: i, indent, type, range, name, arrayDim, init, comment });
    }
  }

  if (declLines.length === 0) return lines;

  // Calculate max lengths
  const maxType = Math.max(...declLines.map(d => d.type.length));
  const maxRange = Math.max(...declLines.map(d => d.range.length));
  const maxName = Math.max(...declLines.map(d => d.name.length));

  // Format
  const result = [...lines];
  for (const decl of declLines) {
    const typePadded = decl.type.padEnd(maxType);
    const rangePadded = decl.range ? decl.range.padEnd(maxRange) + ' ' : ''.padEnd(maxRange + 1);
    const namePadded = decl.name.padEnd(maxName);
    result[decl.index] = `${decl.indent}${typePadded} ${rangePadded}${namePadded}${decl.arrayDim}${decl.init};${decl.comment ? ' ' + decl.comment : ''}`;
  }

  return result;
}

function alignParametersInRange(lines: string[]): string[] {
  const paramLines: {
    index: number;
    indent: string;
    keyword: string;
    typeSpec: string;
    name: string;
    value: string;
    delimiter: string;
    comment: string;
  }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Match parameter declarations
    const match = trimmed.match(/^(parameter|localparam)\s+(\[[^\]]+\]|\w+)?\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?)\s*([,;])\s*(\/\/.*)?$/);
    if (match) {
      const indent = line.match(/^(\s*)/)?.[1] || '';
      const keyword = match[1];
      const typeSpec = match[2] || '';
      const name = match[3];
      const value = match[4].trim();
      const delimiter = match[5];
      const comment = match[6] || '';
      paramLines.push({ index: i, indent, keyword, typeSpec, name, value, delimiter, comment });
    }
  }

  if (paramLines.length === 0) return lines;

  // Calculate max lengths
  const maxKeyword = Math.max(...paramLines.map(p => p.keyword.length));
  const maxType = Math.max(...paramLines.map(p => p.typeSpec.length));
  const maxName = Math.max(...paramLines.map(p => p.name.length));
  const maxValue = Math.max(...paramLines.map(p => p.value.length));

  // Format
  const result = [...lines];
  for (const param of paramLines) {
    const keywordPadded = param.keyword.padEnd(maxKeyword);
    const typePadded = param.typeSpec ? param.typeSpec.padEnd(maxType) + ' ' : ''.padEnd(maxType + 1);
    const namePadded = param.name.padEnd(maxName);
    const valuePadded = param.value.padEnd(maxValue);
    result[param.index] = `${param.indent}${keywordPadded} ${typePadded}${namePadded} = ${valuePadded}${param.delimiter}${param.comment ? ' ' + param.comment : ''}`;
  }

  return result;
}

function alignPortDeclarationsInRange(lines: string[]): string[] {
  const portLines: {
    index: number;
    indent: string;
    dir: string;
    type: string;
    range: string;
    name: string;
    delimiter: string;
    comment: string
  }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Match port declarations
    const match = trimmed.match(/^(input|output|inout)\s+(wire|reg|logic|bit)?\s*(\[[^\]]+\])?\s*([A-Za-z_][A-Za-z0-9_]*)\s*([,;])\s*(\/\/.*)?$/);
    if (match) {
      const indent = line.match(/^(\s*)/)?.[1] || '';
      const dir = match[1];
      const type = match[2] || '';
      const range = match[3] || '';
      const name = match[4];
      const delimiter = match[5];
      const comment = match[6] || '';
      portLines.push({ index: i, indent, dir, type, range, name, delimiter, comment });
    }
  }

  if (portLines.length === 0) return lines;

  // Calculate max lengths
  const maxDir = Math.max(...portLines.map(p => p.dir.length));
  const maxType = Math.max(...portLines.map(p => p.type.length));
  const maxRange = Math.max(...portLines.map(p => p.range.length));
  const maxName = Math.max(...portLines.map(p => p.name.length));

  // Format
  const result = [...lines];
  for (const port of portLines) {
    const dirPadded = port.dir.padEnd(maxDir);
    const typePadded = port.type ? port.type.padEnd(maxType) + ' ' : ''.padEnd(maxType + 1);
    const rangePadded = port.range ? port.range.padEnd(maxRange) + ' ' : ''.padEnd(maxRange + 1);
    const namePadded = port.name.padEnd(maxName);
    result[port.index] = `${port.indent}${dirPadded} ${typePadded}${rangePadded}${namePadded}${port.delimiter}${port.comment ? ' ' + port.comment : ''}`;
  }

  return result;
}
