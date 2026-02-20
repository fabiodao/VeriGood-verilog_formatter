/**
 * Main formatter module - orchestrates all formatting operations
 *
 * This is a modular refactoring of the original monolithic formatter.ts
 * All functionality is preserved while improving maintainability
 */

import * as vscode from 'vscode';
import { Config, getConfig, hasAnyFeatureEnabled } from './types';
import { applyCommentColumn, wrapComment } from './utils/comments';
import { MacroAnnotator } from './utils/macros';

// Import alignment modules
import { alignAssignmentGroup } from './alignment/assignments';
import { alignWireDeclGroup } from './alignment/wires';
import { alignParameterLines } from './alignment/parameters';
import { alignPortDeclLines } from './alignment/ports';
import { alignBlockAssignments } from './alignment/blockAssignments';

// Import formatting modules
import { formatModuleHeader } from './formatting/moduleHeader';
import { formatModuleInstantiations } from './formatting/instantiations';

// Import indentation modules
import { indentAlwaysBlocks } from './indentation/alwaysBlocks';
import { indentCaseStatements } from './indentation/caseStatements';
import { enforceIfBlocks, enforceForLoopBlocks } from './indentation/controlFlow';
import { alignMultilineConditions } from './indentation/conditions';

/**
 * Helper function: Move standalone "begin" to the previous line if it ends with ")"
 */
function moveBeginToSameLine(lines: string[]): string[] {
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if this is a standalone "begin" keyword
    if (trimmed === 'begin' && result.length > 0) {
      // Look backwards to find the most recent non-blank line
      let targetIdx = result.length - 1;
      while (targetIdx >= 0 && result[targetIdx].trim() === '') {
        targetIdx--;
      }

      if (targetIdx >= 0) {
        const targetLine = result[targetIdx];
        const targetTrimmed = targetLine.trim();

        // Match lines ending with ) or ) followed by comment
        if (/\)\s*(?:\/\/.*)?$/.test(targetTrimmed)) {
          // Move begin to the target line
          result[targetIdx] = targetLine.replace(/\s*(?:\/\/.*)?$/, ' begin');
          // Remove any blank lines between ) and begin
          while (result.length > targetIdx + 1) {
            result.pop();
          }
          // Skip adding the current standalone begin line
          continue;
        }
      }
    }

    result.push(line);
  }

  return result;
}

/**
 * Helper function: Fix invalid "end if" syntax by splitting into two lines
 */
function fixEndIfPattern(lines: string[]): string[] {
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect "end if" pattern (not "end else if" which is valid)
    const match = trimmed.match(/^end\s+(if\s*\(.*)/);
    if (match && !/^end\s+else\s+if/.test(trimmed)) {
      // Extract the indentation and the if part
      const indent = line.match(/^(\s*)/)?.[1] || '';
      const ifPart = match[1];

      // Split into two lines: "end" and "if (...) begin"
      result.push(indent + 'end');
      result.push(indent + ifPart);
    } else {
      result.push(line);
    }
  }

  return result;
}

/**
 * Helper function: Fix module-level declaration indentation
 */
function fixModuleLevelIndentation(lines: string[], indentSize: number): string[] {
  const unit = ' '.repeat(indentSize);
  const result: string[] = [];
  let insideModule = false;
  let insideModuleHeader = false;
  let insideAlwaysOrInitial = false;
  let blockDepth = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Track module boundaries
    if (/^module\s+\w+/.test(trimmed)) {
      insideModule = true;
      insideModuleHeader = true;
      result.push(line);
      continue;
    }

    // Module header ends with closing );
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

    // Track always/initial blocks
    if (/^always\b|^initial\b/.test(trimmed)) {
      insideAlwaysOrInitial = true;
      result.push(line);
      continue;
    }

    // Track begin/end depth
    if (/\bbegin\b/.test(trimmed) && !/\/\/.*\bbegin\b/.test(line)) {
      blockDepth++;
      result.push(line);
      continue;
    }
    if (/^end\b/.test(trimmed) && !/^endmodule\b|^endcase\b|^endgenerate\b/.test(trimmed)) {
      blockDepth--;
      if (blockDepth < 0) blockDepth = 0;
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

    // Fix indentation for module-level declarations
    if (insideModule && !insideModuleHeader && !insideAlwaysOrInitial && blockDepth === 0) {
      if (/^(wire|reg|logic|input|output|inout)\b/.test(trimmed)) {
        result.push(unit + trimmed);
        continue;
      }
    }

    result.push(line);
  }

  return result;
}

/**
 * Helper function: Normalize ifdef directive indentation
 */
function normalizeIfdefIndentation(lines: string[]): string[] {
  const result: string[] = [];

  interface IfdefBlock {
    indent: string;
    lineIndex: number;
  }
  const ifdefStack: IfdefBlock[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if this is an ifdef-related directive
    if (trimmed.startsWith('`ifdef') || trimmed.startsWith('`ifndef') ||
        trimmed.startsWith('`elsif') || trimmed.startsWith('`else') ||
        trimmed.startsWith('`endif')) {

      // Skip normalization if this directive is part of a multiline parameter/port block
      const nextNonBlank = lines.slice(i + 1).find(l => l.trim() !== '');
      if (nextNonBlank && /^\s*[\)\}]/.test(nextNonBlank)) {
        result.push(line);
        continue;
      }

      // Handle endif - align with its matching ifdef
      if (trimmed.startsWith('`endif')) {
        if (ifdefStack.length > 0) {
          const matchingIfdef = ifdefStack.pop()!;
          result.push(matchingIfdef.indent + trimmed);
        } else {
          result.push(line);
        }
        continue;
      }

      // Handle else/elsif - align with its matching ifdef
      if (trimmed.startsWith('`else') || trimmed.startsWith('`elsif')) {
        if (ifdefStack.length > 0) {
          const matchingIfdef = ifdefStack[ifdefStack.length - 1];
          result.push(matchingIfdef.indent + trimmed);
        } else {
          result.push(line);
        }
        continue;
      }

      // Handle ifdef/ifndef - find indentation from next code line
      let targetIndent: string | null = null;

      // Look ahead for the first actual code line
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j];
        const nextTrimmed = nextLine.trim();

        if (!nextTrimmed || nextTrimmed.startsWith('`')) {
          continue;
        }

        const indent = nextLine.match(/^(\s*)/)?.[1] || '';
        targetIndent = indent;
        break;
      }

      // If no code found after, look backward
      if (targetIndent === null) {
        for (let j = i - 1; j >= 0; j--) {
          const prevLine = lines[j];
          const prevTrimmed = prevLine.trim();

          if (!prevTrimmed || prevTrimmed.startsWith('`')) {
            continue;
          }

          const indent = prevLine.match(/^(\s*)/)?.[1] || '';
          targetIndent = indent;
          break;
        }
      }

      // Apply the target indentation and push to stack
      if (targetIndent !== null) {
        result.push(targetIndent + trimmed);
        ifdefStack.push({ indent: targetIndent, lineIndex: i });
      } else {
        result.push(line);
        const currentIndent = line.match(/^(\s*)/)?.[1] || '';
        ifdefStack.push({ indent: currentIndent, lineIndex: i });
      }
    } else {
      result.push(line);
    }
  }

  return result;
}

/**
 * Formats a Verilog/SystemVerilog document
 */
export function formatDocument(document: vscode.TextDocument, options: vscode.FormattingOptions): vscode.TextEdit[] {
  const cfg = getConfig(options);  // Pass options to get editor's tabSize
  const original = document.getText();

  // Check if any formatting feature is enabled
  const anyFeatureEnabled = cfg.removeTrailingWhitespace || cfg.maxBlankLines < 100 ||
    cfg.alignAssignments || cfg.alignWireDeclSemicolons || cfg.alignParameters ||
    cfg.alignPortList || cfg.formatModuleHeaders || cfg.formatModuleInstantiations ||
    cfg.indentAlwaysBlocks || cfg.enforceBeginEnd || cfg.indentCaseStatements ||
    cfg.annotateIfdefComments || cfg.commentColumn > 0;

  if (!anyFeatureEnabled) {
    return [];
  }

  const lines = original.split(/\r?\n/);

  const processed: string[] = [];
  let blankCount = 0;

  let inModuleHeader = false;
  let moduleHeaderLines: string[] = [];

  // State for grouping consecutive assignment lines and wire decl blocks
  let pendingAssignments: { idx: number; text: string }[] = [];
  let pendingWireDecls: { idx: number; text: string }[] = [];
  let pendingParams: { idx: number; text: string }[] = [];
  let pendingPorts: { idx: number; text: string }[] = [];
  let inAssignmentContinuation = false;
  let inWireContinuation = false;
  let inParamContinuation = false;
  let inPortContinuation = false;
  let wireGroupNonDeclCount = 0;

  // Global macro stack
  const globalMacroStack: string[] = [];
  function annotateMacro(line: string): string {
    if (!cfg.annotateIfdefComments) return line;

    const leading = line.match(/^\s*/)?.[0] || '';
    const trimmed = line.trim();

    // Check if directive appears mid-line
    const midLineMatch = trimmed.match(/^(.+?)(`ifn?def\s+(\w+)|`else\b|`endif\b.*)$/);
    if (midLineMatch && !trimmed.startsWith('`')) {
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
          return leading + beforeDirective + '`else // ' + current;
        }
        return leading + trimmed;
      }

      if (/^`endif\b/.test(directivePart)) {
        const popped = globalMacroStack.pop();
        if (popped) {
          const afterEndif = directivePart.replace(/^`endif\s*/, '');
          return leading + beforeDirective + '`endif // ' + popped + (afterEndif ? ' ' + afterEndif : '');
        }
        return leading + trimmed;
      }
    }

    // ifdef / ifndef at start of line
    const ifdefM = trimmed.match(/^`ifn?def\s+(\w+)/);
    if (ifdefM) {
      const name = ifdefM[1];
      globalMacroStack.push(name);
      return leading + trimmed;
    }
    // else
    if (/^`else\b/.test(trimmed)) {
      const current = globalMacroStack[globalMacroStack.length - 1];
      if (current) {
        if (/\/\//.test(trimmed)) {
          if (!new RegExp(`//\\s*${current}$`).test(trimmed)) {
            return leading + '`else // ' + current;
          }
          return leading + trimmed.replace(/`else.*?(\/\/\s*.*)$/,'`else // ' + current);
        }
        return leading + '`else // ' + current;
      }
      return leading + trimmed;
    }
    // endif
    if (/^`endif\b/.test(trimmed)) {
      const popped = globalMacroStack.pop();
      if (popped) {
        const afterEndif = trimmed.replace(/^`endif\s*/, '');
        const hasExistingComment = /\/\//.test(afterEndif);

        if (hasExistingComment) {
          const parts = afterEndif.split('//');
          const beforeComment = parts[0].trim();
          const afterComment = parts.slice(1).join('//').trim();
          return leading + '`endif ' + (beforeComment ? beforeComment + ' ' : '') + '// ' + popped;
        } else {
          return leading + '`endif // ' + popped + (afterEndif ? ' ' + afterEndif : '');
        }
      }
      return leading + '`endif';
    }
    return line;
  }

  function flushAssignments() {
    if (!pendingAssignments.length) return;
    const formatted = cfg.alignAssignments ? alignAssignmentGroup(pendingAssignments.map(a => a.text)) : pendingAssignments.map(a => a.text);
    formatted.forEach((l: string) => processed.push(applyCommentColumn(l, cfg)));
    pendingAssignments = [];
  }
  function flushWireDecls() {
    if (!pendingWireDecls.length) return;
    const formatted = cfg.alignWireDeclSemicolons ? alignWireDeclGroup(pendingWireDecls.map(w => w.text), cfg) : pendingWireDecls.map(w => w.text);
    formatted.forEach((l: string) => processed.push(applyCommentColumn(l, cfg)));
    pendingWireDecls = [];
  }
  function flushParams() {
    if (!pendingParams.length) return;
    const formatted = cfg.alignParameters ? alignParameterLines(pendingParams.map(p => p.text)) : pendingParams.map(p => p.text);
    formatted.forEach((l: string) => processed.push(applyCommentColumn(l, cfg)));
    pendingParams = [];
  }
  function flushPorts() {
    if (!pendingPorts.length) return;
    const formatted = cfg.alignPortList ? alignPortDeclLines(pendingPorts.map(p => p.text)) : pendingPorts.map(p => p.text);
    formatted.forEach((l: string) => processed.push(applyCommentColumn(l, cfg)));
    pendingPorts = [];
  }

  let moduleBodyActive = false;
  let functionDepth = 0;
  let alwaysDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Only trim trailing whitespace if enabled
    if (cfg.removeTrailingWhitespace) {
      line = line.replace(/\s+$/,'');
    }

    // Annotate macro directives globally (only if enabled)
    if (cfg.annotateIfdefComments && /`(ifn?def|else|endif)\b/.test(line)) {
      line = annotateMacro(line);
    }

    // Module header accumulation (only if formatModuleHeaders enabled)
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
          const formattedHeader = formatModuleHeader(moduleHeaderLines, cfg);
          formattedHeader.forEach(h => processed.push(h));
          processed.push('');
          inModuleHeader = false;
          moduleBodyActive = true;
        }
        continue;
      }
    }

    // Blank line compression
    const shouldCompressBlankLines = cfg.maxBlankLines < 100;
    if (line.trim() === '') {
      if (pendingAssignments.length && !inAssignmentContinuation) {
        blankCount++;
        if (shouldCompressBlankLines && blankCount > cfg.maxBlankLines) continue;
        pendingAssignments.push({ idx: i, text: line });
        continue;
      } else {
        flushAssignments();
      }
      if (pendingParams.length && !inParamContinuation) {
        blankCount++;
        if (shouldCompressBlankLines && blankCount > cfg.maxBlankLines) continue;
        pendingParams.push({ idx: i, text: line });
        continue;
      } else {
        flushParams();
      }
      if (pendingWireDecls.length && !inWireContinuation) {
        // Blank lines and comments don't break wire declaration groups
        // Only flush for IO declarations after many non-decl lines
        const firstPendingIsIO = /^\s*(input|output|inout)\b/.test(pendingWireDecls[0].text);
        wireGroupNonDeclCount++;
        if (firstPendingIsIO && wireGroupNonDeclCount > 3) {
          flushWireDecls();
          wireGroupNonDeclCount = 0;
        } else {
          blankCount++;
          if (shouldCompressBlankLines && blankCount > cfg.maxBlankLines) continue;
          pendingWireDecls.push({ idx: i, text: line });
          continue;
        }
      } else {
        flushWireDecls();
      }
      blankCount++;
      if (shouldCompressBlankLines && blankCount > cfg.maxBlankLines) continue;
      processed.push('');
      continue;
    } else {
      blankCount = 0;
    }

    // Track function/task depth
    if (/^\s*\b(function|task)\b/.test(line)) {
      functionDepth++;
    }
    if (/^\s*\b(endfunction|endtask)\b/.test(line)) {
      flushWireDecls();
      functionDepth--;
      if (functionDepth < 0) functionDepth = 0;
    }
    
    // Track always/initial block depth
    if (/^\s*\b(always|initial)\b/.test(line)) {
      alwaysDepth++;
    }
    // Track begin/end for always blocks
    if (alwaysDepth > 0) {
      const beginCount = (line.match(/\bbegin\b/g) || []).length;
      const endCount = (line.match(/\bend\b/g) || []).length;
      alwaysDepth += beginCount - endCount;
      if (alwaysDepth < 0) alwaysDepth = 0;
    }

    // Handle multi-line wire/reg/logic declaration continuation
    if (inWireContinuation) {
      pendingWireDecls.push({ idx: i, text: line });
      if (/;\s*(\/\/.*)?$/.test(line)) {
        inWireContinuation = false;
      }
      continue;
    }

    // Detect wire/reg/logic/input/output/inout declarations group
    if (cfg.alignWireDeclSemicolons && /^\s*(wire|reg|logic|input|output|inout|integer)\b/.test(line)) {
      const lineWithoutComment = line.replace(/\/\/.*$/, '');
      const hasEqualSign = /=/.test(lineWithoutComment);
      const isIODecl = /^\s*(input|output|inout)\b/.test(line);
      if (pendingWireDecls.length && !inWireContinuation && functionDepth === 0) {
        const firstPendingWithoutComment = pendingWireDecls[0].text.replace(/\/\/.*$/, '');
        const firstPendingHasEqual = /=/.test(firstPendingWithoutComment);
        const firstPendingIsIO = /^\s*(input|output|inout)\b/.test(pendingWireDecls[0].text);
        if (firstPendingIsIO !== isIODecl || firstPendingHasEqual !== hasEqualSign) {
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
        // Comments and macros don't break the group, just include them
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

    // Handle multi-line parameter/localparam continuation
    if (inParamContinuation) {
      pendingParams.push({ idx: i, text: line });
      if (/;\s*(\/\/.*)?$/.test(line)) {
        inParamContinuation = false;
      }
      continue;
    }

    // Detect parameter/localparam declarations
    if (cfg.alignParameters && /^\s*(parameter|localparam)\b/.test(line)) {
      if (!pendingParams.length) {
        flushWireDecls();
        flushAssignments();
        flushPorts();
      }
      let paramLine = line;
      if (!/^\s\s/.test(line) && /^(parameter|localparam)\b/.test(line.trimStart())) {
        paramLine = '  ' + line.trimStart();
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

    // Handle multi-line port declaration continuation
    if (inPortContinuation) {
      pendingPorts.push({ idx: i, text: line });
      if (/;\s*(\/\/.*)?$/.test(line)) {
        inPortContinuation = false;
      }
      continue;
    }

    // Multi-line assignment continuation handling
    if (inAssignmentContinuation) {
      pendingAssignments.push({ idx: i, text: line });
      if (/;\s*(\/\/.*)?$/.test(line)) {
        inAssignmentContinuation = false;
      }
      continue;
    }

    // Explicit 'assign' start
    if (cfg.alignAssignments && /^\s*assign\b/.test(line)) {
      pendingAssignments.push({ idx: i, text: line });
      if (!/;\s*(\/\/.*)?$/.test(line)) {
        inAssignmentContinuation = true;
      }
      continue;
    }

    // Generic non-blocking/blocking assignments
    const genericAssignStart = cfg.alignAssignments && alwaysDepth === 0 && /^(.*?)\s*(<=|=)(?![=]).*;\s*(\/\/.*)?$/.test(line) && !/^\s*(wire|reg|logic|input|output|inout)\b/.test(line);
    if (genericAssignStart) {
      pendingAssignments.push({ idx: i, text: line });
      continue;
    }

    // Keep comments/ifdefs inside the assignment group
    if (pendingAssignments.length && !inAssignmentContinuation) {
      if (/^\s*\/\//.test(line) || /^\s*`(ifn?def|else|endif)\b/.test(line)) {
        pendingAssignments.push({ idx: i, text: line });
        continue;
      } else if (!/^\s*assign\b/.test(line)) {
        // Not a comment, not an assign → flush
        flushAssignments();
      }
      // If it's an assign, don't flush - let it be added to the group below
    }

    // Apply comment column alignment
    line = applyCommentColumn(line, cfg);

    // Enforce max line length for comments
    if (/^\s*\/\//.test(line) && line.length > cfg.lineLength) {
      line = wrapComment(line, cfg.lineLength);
    }

    processed.push(line);
  }

  flushAssignments();
  flushWireDecls();
  flushParams();
  flushPorts();

  // Move standalone "begin" to previous line if it ends with ")"
  const withBeginMoved = cfg.enforceBeginEnd ? moveBeginToSameLine(processed) : processed;

  // Fix invalid "end if" patterns
  const withFixedEndIf = cfg.enforceBeginEnd ? fixEndIfPattern(withBeginMoved) : withBeginMoved;

  // Detect if file has always/initial blocks
  const hasAlwaysBlocks = withFixedEndIf.some(line => 
    /^\s*(always|initial)\b/.test(line)
  );

  // Indent always blocks (conditional) - must run BEFORE alignMultilineConditions
  const withAlways = cfg.indentAlwaysBlocks && hasAlwaysBlocks
    ? indentAlwaysBlocks(withFixedEndIf, cfg.indentSize)
    : withFixedEndIf;

  // Align multiline if/for/while conditions - runs after indentAlwaysBlocks to preserve alignment
  const withAlignedConditions = alignMultilineConditions(withAlways);

  // Fix module-level declaration indentation (only if indentAlwaysBlocks enabled)
  const withFixedIndent = cfg.indentAlwaysBlocks
    ? fixModuleLevelIndentation(withAlignedConditions, cfg.indentSize)
    : withAlignedConditions;

  // Enforce if and for blocks begin/end iteratively until stable (conditional)
  let controlBlocks = withFixedIndent;
  if (cfg.enforceBeginEnd && !cfg.indentAlwaysBlocks) {
    let prevLength = 0;
    let iterations = 0;
    const maxIterations = 10;

    while (iterations < maxIterations) {
      prevLength = controlBlocks.length;
      controlBlocks = enforceIfBlocks(controlBlocks, cfg.indentSize);
      controlBlocks = enforceForLoopBlocks(controlBlocks, cfg.indentSize);

      if (controlBlocks.length === prevLength) {
        break;
      }
      iterations++;
    }
  }

  // Format module instantiations (conditional)
  // Only skip if both: cfg.indentAlwaysBlocks is enabled AND file actually has always blocks
  const withInstantiations = (cfg.formatModuleInstantiations && !(cfg.indentAlwaysBlocks && hasAlwaysBlocks))
    ? formatModuleInstantiations(controlBlocks, cfg.indentSize)
    : controlBlocks;

  // Indent case statements (conditional)
  const withCaseIndent = cfg.indentCaseStatements
    ? indentCaseStatements(withInstantiations, cfg.indentSize)
    : withInstantiations;

  // Align assignments within case items and blocks (conditional)
  const withBlockAlignment = (cfg.indentCaseStatements || cfg.indentAlwaysBlocks)
    ? alignBlockAssignments(withCaseIndent, cfg)
    : withCaseIndent;

  // Normalize ifdef directive indentation
  const finalLines = cfg.indentAlwaysBlocks
    ? withBlockAlignment
    : normalizeIfdefIndentation(withBlockAlignment);

  // Remove trailing blank lines while preserving original end-of-file newline behavior
  while (finalLines.length > 0 && finalLines[finalLines.length - 1].trim() === '') {
    finalLines.pop();
  }

  const newText = finalLines.join('\n') + (original.endsWith('\n') ? '\n' : '');
  if (newText === original) {
    return [];
  }
  const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(original.length));
  return [vscode.TextEdit.replace(fullRange, newText)];
}

/**
 * Formats a selected range of a Verilog/SystemVerilog document
 */
export function formatRange(document: vscode.TextDocument, range: vscode.Range, options: vscode.FormattingOptions): vscode.TextEdit[] {
  // Use modular range formatting
  const { formatRange: modularFormatRange } = require('./rangeFormatting');
  return modularFormatRange(document, range, options, formatVerilogText);
}

/**
 * Export for testing - formats Verilog text without VS Code document
 */
export function formatVerilogText(text: string, indentSize: number = 2): string {
  // Create a mock document
  const mockDoc = {
    getText: () => text,
    positionAt: (offset: number) => {
      let line = 0, char = 0;
      for (let i = 0; i < offset; i++) {
        if (text[i] === '\n') {
          line++;
          char = 0;
        } else {
          char++;
        }
      }
      return { line, character: char };
    }
  } as vscode.TextDocument;

  const mockOptions: vscode.FormattingOptions = {
    insertSpaces: true,
    tabSize: indentSize
  };

  // Call the actual formatDocument function
  const edits = formatDocument(mockDoc, mockOptions);

  if (edits && edits.length > 0) {
    return edits[0].newText;
  }

  return text;
}
