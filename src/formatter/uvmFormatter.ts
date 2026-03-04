/**
 * UVM Testbench Formatter
 * 
 * Completely independent formatter for UVM/SystemVerilog testbench code.
 * Does NOT share code with the RTL formatter to avoid conflicts.
 * 
 * Key differences from RTL formatting:
 * - Uses editor's tab size for indentation (not forced to 4 spaces)
 * - No assignment alignment
 * - No wire/reg alignment
 * - Basic indentation for classes, functions, tasks, and control flow
 */

import * as vscode from 'vscode';

interface UVMConfig {
  indentSize: number;
  lineLength: number;
  removeTrailingWhitespace: boolean;
}

/**
 * Main entry point for UVM formatting
 */
export function formatUVMDocument(document: vscode.TextDocument, options: vscode.FormattingOptions): vscode.TextEdit[] {
  const cfg = getUVMConfig(options);
  const original = document.getText();
  const lines = original.split(/\r?\n/);
  
  // Detect original line ending
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  
  const formatted = formatUVMLines(lines, cfg);
  const newText = formatted.join(eol) + (original.endsWith('\n') || original.endsWith('\r\n') ? eol : '');
  
  if (newText === original) {
    return [];
  }
  
  const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(original.length));
  return [vscode.TextEdit.replace(fullRange, newText)];
}

/**
 * Get UVM-specific configuration
 */
function getUVMConfig(options?: vscode.FormattingOptions): UVMConfig {
  const wcfg = vscode.workspace.getConfiguration('verilogFormatter');
  
  // Use editor's tab size for indentation
  const indentSize = options?.tabSize !== undefined ? options.tabSize : 4;
  
  return {
    indentSize,
    lineLength: wcfg.get<number>('uvmLineLength', 100),
    removeTrailingWhitespace: wcfg.get<boolean>('removeTrailingWhitespace', true)
  };
}

/**
 * Format UVM lines with proper indentation and alignment
 */
function formatUVMLines(lines: string[], cfg: UVMConfig): string[] {
  // First pass: Apply indentation
  const indented = applyUVMIndentation(lines, cfg);
  
  // Second pass: Align assignments within functions/tasks and constraints
  const aligned = alignUVMAssignments(indented, cfg);
  
  // Third pass: Normalize spacing (operators, semicolons, parentheses)
  const normalized = normalizeUVMSpacing(aligned);
  
  return normalized;
}

/**
 * Normalize spacing for operators, semicolons, and parentheses
 */
/**
 * Normalize spacing for operators, semicolons, and parentheses
 * This runs AFTER alignment, so we need to be careful not to break aligned assignments
 */
function normalizeUVMSpacing(lines: string[]): string[] {
  return lines.map(line => {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('//')) {
      return line; // Preserve blank lines and comments as-is
    }
    
    const indent = line.match(/^(\s*)/)?.[1] || '';
    
    // Check if this is an assignment line (has = or <= operator at top level)
    const isAssignment = /^[^(]*\s*(<=|=)(?!=)\s+/.test(trimmed) && 
                         !/^(if|for|while|foreach|repeat|wait)\s*\(/.test(trimmed);
    
    if (isAssignment) {
      // For assignments, preserve the alignment padding but normalize operators in RHS
      // Split by quotes to avoid modifying string contents
      const parts = trimmed.split(/("[^"]*"|'[^']*')/);
      let normalized = '';
      
      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
          // Non-string part
          let part = parts[i];
          
          // Don't remove spaces before semicolons (preserve alignment)
          // But normalize operators
          part = normalizeOperators(part);
          
          normalized += part;
        } else {
          // String literal - preserve as-is
          normalized += parts[i];
        }
      }
      
      return indent + normalized;
    } else {
      // For non-assignments, normalize everything
      // Split by quotes to avoid modifying string contents
      const parts = trimmed.split(/("[^"]*"|'[^']*')/);
      let normalized = '';
      
      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
          // Non-string part - normalize it
          let part = parts[i];
          
          // Remove extra spaces before semicolons
          part = part.replace(/\s+;/g, ';');
          
          // Normalize parentheses spacing
          part = normalizeParentheses(part);
          
          // Add spaces around operators
          part = normalizeOperators(part);
          
          normalized += part;
        } else {
          // String literal - preserve as-is
          normalized += parts[i];
        }
      }
      
      return indent + normalized;
    }
  });
}

/**
 * Normalize spacing around operators
 */
function normalizeOperators(text: string): string {
  let result = text;
  
  // Two-char operators (process first to avoid conflicts)
  const twoCharOps = ['==', '!=', '<=', '>=', '&&', '||', '<<', '>>', '<<<', '>>>'];
  for (const op of twoCharOps) {
    const escapedOp = op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(\\S)${escapedOp}(\\S)`, 'g');
    result = result.replace(regex, `$1 ${op} $2`);
  }
  
  // Single-char operators: +, -, *, /, %, <, >
  const singleOps = ['+', '-', '*', '/', '%', '<', '>'];
  for (const op of singleOps) {
    const escapedOp = op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(\\w|\\))${escapedOp}(\\w|\\()`, 'g');
    result = result.replace(regex, `$1 ${op} $2`);
  }
  
  return result;
}

/**
 * Normalize spacing around parentheses
 */
function normalizeParentheses(text: string): string {
  let result = text;
  
  // Remove extra spaces between identifiers/keywords and opening parentheses
  result = result.replace(/(\w)\s+\(/g, '$1(');
  
  return result;
}

/**
 * Apply UVM indentation and add closing annotations
 */
function applyUVMIndentation(lines: string[], cfg: UVMConfig): string[] {
  const result: string[] = [];
  let indentLevel = 0;
  let singleStatementDepth = 0;
  const indent = ' '.repeat(cfg.indentSize);
  
  // Stack to track class/function/task names for annotations
  const nameStack: Array<{type: string, name: string}> = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();
    
    if (trimmed === '') {
      result.push('');
      continue;
    }
    
    if (cfg.removeTrailingWhitespace) {
      line = line.replace(/\s+$/, '');
    }
    
    if (singleStatementDepth > 0) {
      if (!/^(if|else|for|while|foreach|repeat)\b/.test(trimmed)) {
        indentLevel = Math.max(0, indentLevel - singleStatementDepth);
        singleStatementDepth = 0;
      }
    }
    
    // Decrease indent for closing keywords and add annotations
    if (/^endclass\b/.test(trimmed)) {
      indentLevel = Math.max(0, indentLevel - 1);
      const info = nameStack.pop();
      const annotated = info && info.type === 'class' ? `endclass : ${info.name}` : trimmed;
      result.push(indent.repeat(indentLevel) + annotated);
      continue;
    } else if (/^endfunction\b/.test(trimmed)) {
      indentLevel = Math.max(0, indentLevel - 1);
      const info = nameStack.pop();
      const annotated = info && info.type === 'function' ? `endfunction : ${info.name}` : trimmed;
      result.push(indent.repeat(indentLevel) + annotated);
      continue;
    } else if (/^endtask\b/.test(trimmed)) {
      indentLevel = Math.max(0, indentLevel - 1);
      const info = nameStack.pop();
      const annotated = info && info.type === 'task' ? `endtask : ${info.name}` : trimmed;
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
    
    // Increase indent for opening keywords and track names
    if (/^class\b/.test(trimmed)) {
      const match = trimmed.match(/^class\s+(\w+)/);
      if (match) {
        nameStack.push({type: 'class', name: match[1]});
      }
      indentLevel++;
    } else if (/^(virtual\s+)?function\b/.test(trimmed)) {
      const match = trimmed.match(/^(?:virtual\s+)?function\s+(?:\w+\s+)?(\w+)\s*\(/);
      if (match) {
        nameStack.push({type: 'function', name: match[1]});
      }
      indentLevel++;
    } else if (/^(virtual\s+)?task\b/.test(trimmed)) {
      const match = trimmed.match(/^(?:virtual\s+)?task\s+(\w+)\s*\(/);
      if (match) {
        nameStack.push({type: 'task', name: match[1]});
      }
      indentLevel++;
    } else if (/^constraint\b/.test(trimmed) && /\{\s*$/.test(trimmed)) {
      indentLevel++;
    } else if (/\bbegin\b/.test(trimmed) && !trimmed.startsWith('//')) {
      indentLevel++;
    } else if (/^(if|else|for|while|foreach|repeat)\b/.test(trimmed) && !/\bbegin\b/.test(trimmed) && !/;\s*$/.test(trimmed)) {
      indentLevel++;
      singleStatementDepth++;
    }
  }
  
  return result;
}

/**
 * Align assignments within functions/tasks and constraint blocks
 */
function alignUVMAssignments(lines: string[], cfg: UVMConfig): string[] {
  const result: string[] = [];
  let inFunction = false;
  let inTask = false;
  let inConstraint = false;
  let pendingAssignments: { idx: number; line: string }[] = [];
  
  function flushAssignments() {
    if (pendingAssignments.length === 0) return;
    
    // Always align semicolons in all assignment groups
    const alignSemicolons = true;
    
    // Find max LHS width and max RHS width (for semicolon alignment)
    let maxLhsWidth = 0;
    let maxRhsWidth = 0;
    
    for (const item of pendingAssignments) {
      const trimmed = item.line.trim();
      if (/^\/\//.test(trimmed)) continue;
      
      // Match operators: ==, >=, <=, = (longest first to avoid partial matches)
      const match = trimmed.match(/^(.+?)\s*(==|>=|<=|=)(?!=)\s*(.+?)\s*(;?)\s*$/);
      if (match) {
        const lhs = match[1].trim().replace(/\s+/g, ' '); // Normalize multiple spaces to single space
        const rhs = match[3].trim();
        maxLhsWidth = Math.max(maxLhsWidth, lhs.length);
        if (alignSemicolons) {
          maxRhsWidth = Math.max(maxRhsWidth, rhs.length);
        }
      }
    }
    
    // Apply alignment - align LHS, operators, and optionally semicolons
    for (const item of pendingAssignments) {
      const trimmed = item.line.trim();
      const lineIndent = item.line.match(/^\s*/)?.[0] || '';
      
      if (/^\/\//.test(trimmed)) {
        result.push(item.line);
        continue;
      }
      
      // Match assignment operators: ==, >=, <=, = (longest first)
      const match = trimmed.match(/^(.+?)\s*(==|>=|<=|=)(?!=)\s*(.+?)\s*(;?)\s*$/);
      if (match) {
        const lhs = match[1].trim().replace(/\s+/g, ' '); // Normalize multiple spaces to single space
        const op = match[2];
        const rhs = match[3].trim();
        const semi = match[4];
        
        const paddedLhs = lhs.padEnd(maxLhsWidth);
        
        if (alignSemicolons) {
          const paddedRhs = rhs.padEnd(maxRhsWidth);
          const aligned = `${lineIndent}${paddedLhs} ${op} ${paddedRhs}${semi}`;
          result.push(aligned);
        } else {
          // Don't align semicolons for small groups
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
    
    // Track function/task/constraint scope
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
    
    // Collect assignments within functions/tasks/constraints
    if ((inFunction || inTask || inConstraint) && /\s*(<=|=|==)\s*/.test(trimmed) && !/^\/\//.test(trimmed)) {
      // Skip certain lines that shouldn't be aligned
      if (/^(if|else|for|while|foreach|repeat|return|wait)\b/.test(trimmed)) {
        flushAssignments();
        // Normalize spacing for skipped lines (remove extra spaces before semicolon)
        const lineIndent = line.match(/^\s*/)?.[0] || '';
        const normalized = lineIndent + trimmed.replace(/\s+;/g, ';');
        result.push(normalized);
        continue;
      }
      
      pendingAssignments.push({ idx: i, line });
      continue;
    } else if (pendingAssignments.length > 0) {
      // Check if this line breaks the assignment group
      if (trimmed === '' || /^\/\//.test(trimmed)) {
        // Blank lines and comments don't break the group
        pendingAssignments.push({ idx: i, line });
        continue;
      } else {
        // Non-assignment line breaks the group
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

/**
 * Format UVM range (selection)
 */
export function formatUVMRange(
  document: vscode.TextDocument,
  range: vscode.Range,
  options: vscode.FormattingOptions
): vscode.TextEdit[] {
  const cfg = getUVMConfig(options);
  const fullText = document.getText();
  const lines = fullText.split(/\r?\n/);
  
  const startLine = range.start.line;
  const endLine = range.end.line;
  const selectedLines = lines.slice(startLine, endLine + 1);
  
  // Detect original line ending
  const eol = fullText.includes('\r\n') ? '\r\n' : '\n';
  
  // Check if selection includes a function/task/class declaration
  const includesDeclaration = selectedLines.some(line => {
    const trimmed = line.trim();
    return /^(class|(virtual\s+)?(function|task)|module|package|interface)\b/.test(trimmed);
  });
  
  // For range formatting, we need to:
  // 1. If selection includes declaration: use context-based indentation
  // 2. If selection is only inside a scope: normalize to minimum indent in selection
  // 3. Track class/function/task names from before the selection for annotations
  // 4. Track scope state (inFunction, inTask, inConstraint) from before selection
  
  let startIndentLevel = 0;
  const nameStack: Array<{type: string, name: string}> = [];
  let inFunction = false;
  let inTask = false;
  let inConstraint = false;
  
  if (!includesDeclaration) {
    // Selection is inside a scope - find minimum indent and normalize to it
    const minIndent = Math.min(...selectedLines
      .filter(line => line.trim() !== '')
      .map(line => line.match(/^(\s*)/)?.[1].length || 0)
    );
    
    // Normalize selected lines to start from indent level 0
    const normalizedLines = selectedLines.map(line => {
      if (line.trim() === '') return '';
      const currentIndent = line.match(/^(\s*)/)?.[1].length || 0;
      const relativeIndent = Math.max(0, currentIndent - minIndent);
      return ' '.repeat(relativeIndent) + line.trim();
    });
    
    // Format with indent level 0, then restore minimum indent
    const formatted = formatUVMLines(normalizedLines, cfg);
    const restoredIndent = formatted.map(line => {
      if (line.trim() === '') return '';
      return ' '.repeat(minIndent) + line;
    });
    
    const newText = restoredIndent.join(eol);
    const originalText = selectedLines.join(eol);
    
    if (newText === originalText) {
      return [];
    }
    
    const rangeStart = new vscode.Position(startLine, 0);
    const rangeEnd = new vscode.Position(endLine, lines[endLine].length);
    const editRange = new vscode.Range(rangeStart, rangeEnd);
    
    return [vscode.TextEdit.replace(editRange, newText)];
  }
  
  for (let i = 0; i < startLine; i++) {
    const trimmed = lines[i].trim();
    
    // Track indent level
    if (/^(class|(virtual\s+)?(function|task)|module|package|interface)\b/.test(trimmed)) {
      startIndentLevel++;
      
      // Track names for annotations
      if (/^class\b/.test(trimmed)) {
        const match = trimmed.match(/^class\s+(\w+)/);
        if (match) nameStack.push({type: 'class', name: match[1]});
      } else if (/^(virtual\s+)?function\b/.test(trimmed)) {
        const match = trimmed.match(/^(?:virtual\s+)?function\s+(?:\w+\s+)?(\w+)\s*\(/);
        if (match) nameStack.push({type: 'function', name: match[1]});
        inFunction = true;
      } else if (/^(virtual\s+)?task\b/.test(trimmed)) {
        const match = trimmed.match(/^(?:virtual\s+)?task\s+(\w+)\s*\(/);
        if (match) nameStack.push({type: 'task', name: match[1]});
        inTask = true;
      }
    } else if (/^constraint\b/.test(trimmed) && /\{\s*$/.test(trimmed)) {
      startIndentLevel++;
      inConstraint = true;
    } else if (/\bbegin\b/.test(trimmed) && !trimmed.startsWith('//')) {
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
  
  const rangeStart = new vscode.Position(startLine, 0);
  const rangeEnd = new vscode.Position(endLine, lines[endLine].length);
  const editRange = new vscode.Range(rangeStart, rangeEnd);
  
  return [vscode.TextEdit.replace(editRange, newText)];
}

/**
 * Format UVM lines starting at a specific indent level
 * Used for range/selection formatting
 */
function formatUVMLinesWithStartIndent(
  lines: string[], 
  cfg: UVMConfig, 
  startIndentLevel: number,
  nameStack: Array<{type: string, name: string}> = [],
  initialInFunction: boolean = false,
  initialInTask: boolean = false,
  initialInConstraint: boolean = false
): string[] {
  // First pass: Apply indentation with annotations
  const indented = applyUVMIndentationWithContext(lines, cfg, startIndentLevel, [...nameStack]);
  
  // Second pass: Align assignments (only within the selected lines)
  const aligned = alignUVMAssignmentsForRange(indented, cfg, initialInFunction, initialInTask, initialInConstraint);
  
  // Third pass: Normalize spacing
  const normalized = normalizeUVMSpacing(aligned);
  
  return normalized;
}

/**
 * Apply indentation with context from before the selection
 */
function applyUVMIndentationWithContext(
  lines: string[], 
  cfg: UVMConfig, 
  startIndentLevel: number,
  nameStack: Array<{type: string, name: string}>
): string[] {
  const result: string[] = [];
  let indentLevel = startIndentLevel;
  let singleStatementDepth = 0;
  const indent = ' '.repeat(cfg.indentSize);
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();
    
    if (trimmed === '') {
      result.push('');
      continue;
    }
    
    if (cfg.removeTrailingWhitespace) {
      line = line.replace(/\s+$/, '');
    }
    
    if (singleStatementDepth > 0) {
      if (!/^(if|else|for|while|foreach|repeat)\b/.test(trimmed)) {
        indentLevel = Math.max(0, indentLevel - singleStatementDepth);
        singleStatementDepth = 0;
      }
    }
    
    // Decrease indent for closing keywords and add annotations
    if (/^endclass\b/.test(trimmed)) {
      indentLevel = Math.max(0, indentLevel - 1);
      const info = nameStack.pop();
      const annotated = info && info.type === 'class' ? `endclass : ${info.name}` : trimmed;
      result.push(indent.repeat(indentLevel) + annotated);
      continue;
    } else if (/^endfunction\b/.test(trimmed)) {
      indentLevel = Math.max(0, indentLevel - 1);
      const info = nameStack.pop();
      const annotated = info && info.type === 'function' ? `endfunction : ${info.name}` : trimmed;
      result.push(indent.repeat(indentLevel) + annotated);
      continue;
    } else if (/^endtask\b/.test(trimmed)) {
      indentLevel = Math.max(0, indentLevel - 1);
      const info = nameStack.pop();
      const annotated = info && info.type === 'task' ? `endtask : ${info.name}` : trimmed;
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
    
    // Increase indent for opening keywords and track names
    if (/^class\b/.test(trimmed)) {
      const match = trimmed.match(/^class\s+(\w+)/);
      if (match) {
        nameStack.push({type: 'class', name: match[1]});
      }
      indentLevel++;
    } else if (/^(virtual\s+)?function\b/.test(trimmed)) {
      const match = trimmed.match(/^(?:virtual\s+)?function\s+(?:\w+\s+)?(\w+)\s*\(/);
      if (match) {
        nameStack.push({type: 'function', name: match[1]});
      }
      indentLevel++;
    } else if (/^(virtual\s+)?task\b/.test(trimmed)) {
      const match = trimmed.match(/^(?:virtual\s+)?task\s+(\w+)\s*\(/);
      if (match) {
        nameStack.push({type: 'task', name: match[1]});
      }
      indentLevel++;
    } else if (/^constraint\b/.test(trimmed) && /\{\s*$/.test(trimmed)) {
      indentLevel++;
    } else if (/\bbegin\b/.test(trimmed) && !trimmed.startsWith('//')) {
      indentLevel++;
    } else if (/^(if|else|for|while|foreach|repeat)\b/.test(trimmed) && !/\bbegin\b/.test(trimmed) && !/;\s*$/.test(trimmed)) {
      indentLevel++;
      singleStatementDepth++;
    }
  }
  
  return result;
}

/**
 * Align assignments for range formatting (only within selected lines)
 */
function alignUVMAssignmentsForRange(
  lines: string[], 
  cfg: UVMConfig,
  initialInFunction: boolean,
  initialInTask: boolean,
  initialInConstraint: boolean
): string[] {
  const result: string[] = [];
  let inFunction = initialInFunction;
  let inTask = initialInTask;
  let inConstraint = initialInConstraint;
  let pendingAssignments: Array<{idx: number, line: string}> = [];
  
  function flushAssignments() {
    if (pendingAssignments.length === 0) return;
    
    // Always align semicolons in all assignment groups
    const alignSemicolons = true;
    
    // Find max LHS width and max RHS width (for semicolon alignment)
    let maxLhsWidth = 0;
    let maxRhsWidth = 0;
    
    for (const item of pendingAssignments) {
      const trimmed = item.line.trim();
      if (/^\/\//.test(trimmed)) continue;
      
      // Match operators: ==, >=, <=, = (longest first to avoid partial matches)
      const match = trimmed.match(/^(.+?)\s*(==|>=|<=|=)(?!=)\s*(.+?)\s*(;?)\s*$/);
      if (match) {
        const lhs = match[1].trim().replace(/\s+/g, ' '); // Normalize multiple spaces to single space
        const rhs = match[3].trim();
        maxLhsWidth = Math.max(maxLhsWidth, lhs.length);
        if (alignSemicolons) {
          maxRhsWidth = Math.max(maxRhsWidth, rhs.length);
        }
      }
    }
    
    // Apply alignment - align LHS, operators, and optionally semicolons
    for (const item of pendingAssignments) {
      const trimmed = item.line.trim();
      const lineIndent = item.line.match(/^\s*/)?.[0] || '';
      
      if (/^\/\//.test(trimmed)) {
        result.push(item.line);
        continue;
      }
      
      // Match assignment operators: ==, >=, <=, = (longest first)
      const match = trimmed.match(/^(.+?)\s*(==|>=|<=|=)(?!=)\s*(.+?)\s*(;?)\s*$/);
      if (match) {
        const lhs = match[1].trim().replace(/\s+/g, ' '); // Normalize multiple spaces to single space
        const op = match[2];
        const rhs = match[3].trim();
        const semi = match[4];
        
        const paddedLhs = lhs.padEnd(maxLhsWidth);
        
        if (alignSemicolons) {
          const paddedRhs = rhs.padEnd(maxRhsWidth);
          const aligned = `${lineIndent}${paddedLhs} ${op} ${paddedRhs}${semi}`;
          result.push(aligned);
        } else {
          // Don't align semicolons for small groups
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
    
    // Track function/task/constraint scope
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
    
    // Collect assignments within functions/tasks/constraints
    if ((inFunction || inTask || inConstraint) && /\s*(<=|=|==)\s*/.test(trimmed) && !/^\/\//.test(trimmed)) {
      // Skip certain lines that shouldn't be aligned
      if (/^(if|else|for|while|foreach|repeat|return|wait)\b/.test(trimmed)) {
        flushAssignments();
        // Normalize spacing for skipped lines (remove extra spaces before semicolon)
        const lineIndent = line.match(/^\s*/)?.[0] || '';
        const normalized = lineIndent + trimmed.replace(/\s+;/g, ';');
        result.push(normalized);
        continue;
      }
      
      pendingAssignments.push({ idx: i, line });
      continue;
    } else if (pendingAssignments.length > 0) {
      // Check if this line breaks the assignment group
      if (trimmed === '' || /^\/\//.test(trimmed)) {
        // Blank lines and comments don't break the group
        pendingAssignments.push({ idx: i, line });
        continue;
      } else {
        // Non-assignment line breaks the group
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
