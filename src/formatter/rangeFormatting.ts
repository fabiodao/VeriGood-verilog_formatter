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

  // Get configuration
  const wcfg = vscode.workspace.getConfiguration('verilogFormatter');

  // Get indentSize: use configured value if explicitly set, otherwise use editor's tabSize from status bar
  let indentSize: number;
  const indentInspect = wcfg.inspect<number>('indentSize');
  if (indentInspect && (indentInspect.workspaceValue !== undefined ||
      indentInspect.globalValue !== undefined ||
      indentInspect.workspaceFolderValue !== undefined)) {
    // User has explicitly set indentSize, use it
    indentSize = wcfg.get<number>('indentSize', 2);
  } else {
    // Not explicitly set, use editor's tabSize from status bar
    indentSize = options.tabSize !== undefined ? options.tabSize : 2;
  }

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
  
  // Check if we have a complete module instantiation (starts with module_name instance_name( and ends with );)
  const firstLine = result[0]?.trim() || '';
  const lastLine = result[result.length - 1]?.trim() || '';
  const hasCompleteInstantiation = /^[A-Za-z_][A-Za-z0-9_]*\s+([#\s]+\(|[A-Za-z_][A-Za-z0-9_]*\s*\()/.test(firstLine) && 
                                   /\);?\s*$/.test(lastLine);

  // If we have complete structural blocks OR complete instantiation, apply full formatting including indentation
  if (hasCompleteAlwaysBlock || hasCompleteInitialBlock || hasCompleteGenerateBlock ||
      hasCompleteForBlock || hasCompleteCaseBlock || hasCompleteIfBlock || hasCompleteInstantiation) {
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

    // 3. Detect module header (must have both module keyword and closing ); to be complete)
    let hasModuleHeader = false;
    let hasCompleteModuleHeader = false;
    for (let i = 0; i < result.length; i++) {
      if (/^\s*module\s+\w+/.test(result[i])) {
        hasModuleHeader = true;
        break;
      }
    }
    if (hasModuleHeader && result.some(l => /\)\s*;\s*$/.test(l))) {
      hasCompleteModuleHeader = true;
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

    // 6. Format module header only if complete (has closing );)
    if (cfg.formatModuleHeaders && hasCompleteModuleHeader) {
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
      result = alignWireDeclarationsInRange(result, cfg);
    }

    // 9. Align parameters if requested (only when not inside complete module header)
    if (cfg.alignParameters && !hasCompleteModuleHeader) {
      result = alignParametersInRange(result);
    }

    // 10. Align input/output port declarations - run when we have port lines but NOT a complete
    //     module header (formatModuleHeader handles those). Enables formatting partial port lists.
    const hasPortDeclarations = result.some(l => /^\s*(input|output|inout)\s+/.test(l));
    if (cfg.alignPortList && (hasPortDeclarations && !hasCompleteModuleHeader)) {
      result = alignPortDeclarationsInRange(result);
    }

    // 11. Format module instantiations if requested (only if not module header and has actual instantiation structure)
    // Check if the selection actually has always blocks
    const hasAlwaysInRange = result.some(line => /^\s*(always|initial)\b/.test(line));
    const shouldFormatInst = cfg.formatModuleInstantiations && hasModuleInst && !hasModuleHeader && !hasOnlyConnections && !(cfg.indentAlwaysBlocks && hasAlwaysInRange);
    
    if (shouldFormatInst) {
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
    const hasStartOnThisLine = startRegex.test(trimmed);

    if (hasStartOnThisLine) {
      hasStart = true;
    }

    // Check for begin (count it only once per line, even if combined with start keyword)
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

function alignWireDeclarationsInRange(lines: string[], cfg: Config): string[] {
  // Import the proper alignment function from wires.ts
  const { alignWireDeclGroup } = require('./alignment/wires');
  
  // Group consecutive wire/reg/logic declarations together
  // Groups are broken by:
  // 1. Non-declaration lines (except comments, macros, blank lines)
  // 2. Switching between declarations with/without initialization
  // 3. Switching between IO declarations (input/output/inout) and regular declarations
  const groups: string[][] = [];
  let currentGroup: string[] = [];
  let currentGroupHasInit: boolean | null = null;
  let currentGroupIsIO: boolean | null = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check if this is a wire/reg/logic declaration
    const isDecl = /^\s*(wire|reg|logic|input|output|inout|integer)\b/.test(line);
    const isComment = /^\s*\/\//.test(line);
    const isMacro = /^\s*`(ifn?def|else|endif)\b/.test(line);
    const isBlank = trimmed === '';
    
    if (isDecl) {
      // Check if this declaration has initialization
      const lineWithoutComment = line.replace(/\/\/.*$/, '');
      const hasInit = /=/.test(lineWithoutComment);
      const isIO = /^\s*(input|output|inout)\b/.test(line);
      
      // Check if we need to break the group
      if (currentGroup.length > 0 && 
          (currentGroupHasInit !== null && currentGroupHasInit !== hasInit ||
           currentGroupIsIO !== null && currentGroupIsIO !== isIO)) {
        // Different type of declaration - flush current group and start new one
        groups.push(currentGroup);
        currentGroup = [line];
        currentGroupHasInit = hasInit;
        currentGroupIsIO = isIO;
      } else {
        // Same type - add to current group
        currentGroup.push(line);
        if (currentGroupHasInit === null) currentGroupHasInit = hasInit;
        if (currentGroupIsIO === null) currentGroupIsIO = isIO;
      }
    } else if (currentGroup.length > 0 && (isComment || isMacro || isBlank)) {
      // Comments, macros, and blank lines don't break groups
      currentGroup.push(line);
    } else {
      // Non-declaration, non-comment/macro/blank line - flush group
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [];
        currentGroupHasInit = null;
        currentGroupIsIO = null;
      }
      groups.push([line]); // Non-declaration line as its own group
    }
  }
  
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }
  
  // Process each group
  const result: string[] = [];
  for (const group of groups) {
    const firstTrimmed = group[0].trim();
    if (/^\s*(wire|reg|logic|input|output|inout|integer)\b/.test(group[0])) {
      // This is a declaration group - use the proper alignment function
      const aligned = alignWireDeclGroup(group, cfg);
      result.push(...aligned);
    } else {
      // Not a declaration group - pass through unchanged
      result.push(...group);
    }
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

  // Format (match module header: ranges use padStart so ] aligns)
  const result = [...lines];
  for (const port of portLines) {
    const dirPadded = port.dir.padEnd(maxDir);
    const typePadded = port.type ? port.type.padEnd(maxType) + ' ' : ''.padEnd(maxType + 1);
    const rangePadded = port.range ? port.range.padStart(maxRange) + ' ' : ''.padEnd(maxRange + 1);
    const namePadded = port.name.padEnd(maxName);
    result[port.index] = `${port.indent}${dirPadded} ${typePadded}${rangePadded}${namePadded}${port.delimiter}${port.comment ? ' ' + port.comment : ''}`;
  }

  return result;
}
