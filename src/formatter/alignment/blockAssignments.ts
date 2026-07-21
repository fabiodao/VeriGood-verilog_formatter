/**
 * Block assignment alignment module
 * 
 * Aligns assignments within case items and always/if blocks
 */

import { Config } from '../types';
import { splitTopLevelAssign } from '../utils/assignments';

interface CaseItemAssignment {
  indent: string;
  label: string;
  lhs: string;
  op: string;
  rhs: string;
  comment: string;
}

interface BlockAssignment {
  indent: string;
  lhs: string;
  op: string;
  rhs: string;
  comment: string;
}

/**
 * Aligns assignments within case items
 * Processes lines and aligns single-line case item assignments
 */
function alignCaseItemAssignments(lines: string[]): string[] {
  const result: string[] = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Check if we're at a case statement
    if (/^\s*case\b/.test(line)) {
      result.push(line);
      i++;
      
      // Collect consecutive single-line case items with assignments
      const caseItemGroups: CaseItemAssignment[][] = [];
      let currentGroup: CaseItemAssignment[] = [];
      
      while (i < lines.length && !/^\s*endcase\b/.test(lines[i])) {
        const itemLine = lines[i];
        const itemTrimmed = itemLine.trim();
        
        // Check for single-line case item with assignment: LABEL: lhs = rhs;
        const caseItemMatch = itemTrimmed.match(/^([\w']+|default)\s*:\s*(.+)$/);
        if (caseItemMatch && !itemTrimmed.includes('begin')) {
          const label = caseItemMatch[1];
          const assignment = caseItemMatch[2];
          const indent = itemLine.match(/^(\s*)/)?.[1] || '';
          
          // Parse the assignment
          const assignMatch = splitTopLevelAssign(assignment);
          if (assignMatch) {
            const lhs = assignMatch[1].trim();
            const op = assignMatch[2];
            const rhsWithSemi = assignMatch[3];
            const commentMatch = rhsWithSemi.match(/(.*?)(\/\/.*)$/);
            const rhs = commentMatch ? commentMatch[1].trim().replace(/;\s*$/, '') : rhsWithSemi.trim().replace(/;\s*$/, '');
            const comment = commentMatch ? commentMatch[2].trim() : '';
            
            currentGroup.push({ indent, label, lhs, op, rhs, comment });
            i++;
            continue;
          }
        }
        
        // Not a case item assignment - flush current group and add this line
        if (currentGroup.length > 0) {
          caseItemGroups.push(currentGroup);
          currentGroup = [];
        }
        result.push(itemLine);
        i++;
      }
      
      // Flush any remaining group
      if (currentGroup.length > 0) {
        caseItemGroups.push(currentGroup);
      }
      
      // Align each group
      caseItemGroups.forEach(group => {
        // Pad the label to align colons and the lhs to align operators, but keep
        // ';' tight to the RHS. Trailing comments are aligned after the ';'.
        const maxLabelLen = Math.max(...group.map(item => item.label.length));
        const maxLhsLen = Math.max(...group.map(item => item.lhs.length));
        const codes = group.map(item => `${item.indent}${item.label.padEnd(maxLabelLen)}: ${item.lhs.padEnd(maxLhsLen)} ${item.op} ${item.rhs};`);
        const maxCodeLen = Math.max(...codes.map(c => c.length));
        group.forEach((item, idx) => {
          result.push(item.comment ? codes[idx].padEnd(maxCodeLen) + ' ' + item.comment : codes[idx]);
        });
      });
      
      // Add endcase
      if (i < lines.length) {
        result.push(lines[i]);
        i++;
      }
      continue;
    }
    
    // Default: pass through
    result.push(line);
    i++;
  }
  
  return result;
}

/**
 * Aligns consecutive assignments within blocks (always, if, etc.)
 * Also handles assignments across if/else/else-if branches
 */
function alignBlockLevelAssignments(lines: string[]): string[] {
  const result: string[] = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Check if this is an if statement - handle if/else structures specially
    if (/^\s*if\s*\(/.test(trimmed)) {
      const ifElseResult = handleIfElseAlignment(lines, i);
      ifElseResult.lines.forEach(l => result.push(l));
      i = ifElseResult.endIdx + 1;
      continue;
    }
    
    // Check if this line is an assignment (not a case item, not a declaration, not a for loop)
    const isAssignment = /^\s*([\w\[\]]+)\s*(<=|=)\s*(.*)$/.test(trimmed) && 
                        !trimmed.includes(':') && 
                        !/^\s*assign\b/.test(trimmed) &&
                        !/^\s*(wire|reg|logic|input|output|inout)\b/.test(trimmed) &&
                        !/^\s*for\s*\(/.test(trimmed);
    
    if (isAssignment) {
      // Collect consecutive assignments at the same indentation level
      const indent = line.match(/^(\s*)/)?.[1] || '';
      const assignmentGroup: BlockAssignment[] = [];
      
      while (i < lines.length) {
        const assignLine = lines[i];
        const assignTrimmed = assignLine.trim();
        const assignIndent = assignLine.match(/^(\s*)/)?.[1] || '';
        
        // Stop if indentation changes or we hit a non-assignment
        if (assignIndent !== indent) break;
        
        // Stop at block boundaries (end, case labels, etc.)
        if (/^\s*(end|endcase|endmodule)\b/.test(assignTrimmed) || 
            /^\s*\w+\s*:/.test(assignTrimmed)) {
          break;
        }
        
        // Check if this is an assignment (not a for loop)
        const assignMatch = assignTrimmed.match(/^([\w\[\]]+)\s*(<=|=)\s*(.*)$/);
        if (assignMatch && !assignTrimmed.includes(':') && 
            !/^\s*assign\b/.test(assignTrimmed) &&
            !/^\s*(wire|reg|logic|input|output|inout)\b/.test(assignTrimmed) &&
            !/^\s*for\s*\(/.test(assignTrimmed)) {
          const lhs = assignMatch[1].trim();
          const op = assignMatch[2];
          const rhsWithSemi = assignMatch[3];
          const commentMatch = rhsWithSemi.match(/(.*?)(\/\/.*)$/);
          const rhs = commentMatch ? commentMatch[1].trim().replace(/;\s*$/, '') : rhsWithSemi.trim().replace(/;\s*$/, '');
          const comment = commentMatch ? commentMatch[2].trim() : '';
          
          assignmentGroup.push({ indent, lhs, op, rhs, comment });
          i++;
        } else {
          break;
        }
      }
      
      // Align the group if we have multiple assignments
      if (assignmentGroup.length > 1) {
        // Pad LHS to align operators, but keep ';' tight to the RHS. Trailing
        // comments are aligned after the ';'.
        const maxLhsLen = Math.max(...assignmentGroup.map(item => item.lhs.length));
        const codes = assignmentGroup.map(item => `${item.indent}${item.lhs.padEnd(maxLhsLen)} ${item.op} ${item.rhs};`);
        const maxCodeLen = Math.max(...codes.map(c => c.length));
        assignmentGroup.forEach((item, idx) => {
          result.push(item.comment ? codes[idx].padEnd(maxCodeLen) + ' ' + item.comment : codes[idx]);
        });
      } else if (assignmentGroup.length === 1) {
        // Single assignment - no padding, just pass through
        result.push(lines[i - 1]);
      }
      
      continue;
    }
    
    // Default: pass through
    result.push(line);
    i++;
  }
  
  return result;
}

/**
 * Handles alignment of assignments within if/else/else-if structures
 * Collects all assignments from all branches and aligns them if there are multiple
 */
function handleIfElseAlignment(lines: string[], startIdx: number): { lines: string[], endIdx: number } {
  const collectedLines: string[] = [];
  const assignments: Array<{ lineIdx: number, indent: string, lhs: string, op: string, rhs: string, comment: string }> = [];
  
  let i = startIdx;
  let depth = 0;
  let inIfElse = true;
  
  // Collect the entire if/else structure
  while (i < lines.length && inIfElse) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Stop at case labels (these are boundaries between case items)
    if (/^\s*\w+\s*:/.test(trimmed) && !/^\s*(default|if|else|for|while)\s*:/.test(trimmed)) {
      break;
    }
    
    // Track begin/end depth
    if (/\bbegin\b/.test(trimmed) && !/\/\/.*\bbegin\b/.test(line)) {
      depth++;
    }
    
    collectedLines.push(line);
    
    // Check if this is an assignment line
    const assignMatch = trimmed.match(/^([\w\[\]]+)\s*(<=|=)\s*(.*)$/);
    if (assignMatch && !trimmed.includes(':') && 
        !/^\s*assign\b/.test(trimmed) &&
        !/^\s*(wire|reg|logic|input|output|inout)\b/.test(trimmed) &&
        !/^\s*for\s*\(/.test(trimmed)) {
      const indent = line.match(/^(\s*)/)?.[1] || '';
      const lhs = assignMatch[1].trim();
      const op = assignMatch[2];
      const rhsWithSemi = assignMatch[3];
      const commentMatch = rhsWithSemi.match(/(.*?)(\/\/.*)$/);
      const rhs = commentMatch ? commentMatch[1].trim().replace(/;\s*$/, '') : rhsWithSemi.trim().replace(/;\s*$/, '');
      const comment = commentMatch ? commentMatch[2].trim() : '';
      
      assignments.push({ lineIdx: collectedLines.length - 1, indent, lhs, op, rhs, comment });
    }
    
    i++;
    
    if (/\bend\b/.test(trimmed) && !/\/\/.*\bend\b/.test(line)) {
      depth--;
      
      // Check if next line is else or else if
      if (depth === 0) {
        // Check if this line has "end else" or if next line starts with "else"
        if (/\bend\s+else\b/.test(trimmed)) {
          // "end else begin" on same line - continue collecting
          continue;
        } else if (i < lines.length) {
          const nextTrimmed = lines[i].trim();
          if (/^else\b/.test(nextTrimmed)) {
            // Next line is "else" - continue collecting
            continue;
          } else {
            // End of if/else structure
            inIfElse = false;
          }
        } else {
          // End of file
          inIfElse = false;
        }
      }
    }
  }
  
  // If we have multiple assignments, align them
  if (assignments.length > 1) {
    // Pad LHS to max length + extra spaces for visual separation
    // The extra spaces depend on the max LHS length:
    // - If maxLhs <= 5: add 2 spaces (total 7, operator at column 8)
    // - If maxLhs == 6: add 0 spaces (total 6, operator at column 7)
    // - If maxLhs >= 7: just align (operator at column maxLhs+1)
    const maxLhsLen = Math.max(...assignments.map(a => a.lhs.length));
    const targetLen = maxLhsLen <= 5 ? 7 : (maxLhsLen == 6 ? 6 : maxLhsLen);
    
    // Replace assignment lines with aligned versions (no RHS padding for if/else)
    assignments.forEach(a => {
      const paddedLhs = a.lhs.padEnd(targetLen);
      const alignedLine = `${a.indent}${paddedLhs} ${a.op} ${a.rhs};${a.comment ? ' ' + a.comment : ''}`;
      collectedLines[a.lineIdx] = alignedLine;
    });
  }
  
  return { lines: collectedLines, endIdx: i - 1 };
}

// Matches a simple procedural assignment target: an identifier with optional
// part-selects/bit-selects and hierarchical (dot) references. Anything more
// exotic is left untouched so we never mangle unusual left-hand sides.
const BLOCK_LVALUE = /^[A-Za-z_][A-Za-z0-9_$]*(?:\s*\[[^\]]*\]|\.[A-Za-z_$][A-Za-z0-9_$]*)*$/;

interface ParsedBlockAssignment {
  indent: string;
  lhs: string;
  op: string;
  rhs: string;
  gap: string;
  comment: string;
}

function parseBlockAssignment(rawLine: string): ParsedBlockAssignment | null {
  const indent = rawLine.match(/^(\s*)/)?.[1] || '';
  const m = splitTopLevelAssign(rawLine.trim());
  if (!m) return null;
  const lhs = m[1].trim();
  if (!BLOCK_LVALUE.test(lhs)) return null;
  // Require exactly one statement: no ';' before the terminator, then only
  // an optional trailing comment. This skips multi-statement lines like
  // "a = 0; b = 0;" which must not be column-aligned on just their first '='.
  const cm = m[3].match(/^([^;]*);(\s*)(\/\/.*)?$/);
  if (!cm) return null;
  const rhs = cm[1].trim();
  if (rhs === '') return null;
  // Preserve the original spacing between ';' and any trailing comment so the
  // realignment only shifts the LHS, keeping the author's comment layout.
  return { indent, lhs, op: m[2], rhs, gap: cm[3] ? cm[2] : '', comment: cm[3] || '' };
}

function scanBlockAssignRhs(s: string, depth: number): { depth: number; stop: string | null } {
  // Advance bracket depth over one RHS fragment (strings and // comments
  // respected). Stops early at a top-level ';' (statement end) or ',' (which
  // means this is a list body such as a typedef enum, not a single-expression
  // assignment). Returns { depth, stop } where stop is ";", "," or null.
  let inStr = false;
  for (let k = 0; k < s.length; k++) {
    const ch = s[k];
    if (inStr) {
      if (ch === '\\') { k++; continue; }
      if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === '/' && s[k + 1] === '/') break;
    if (ch === '(' || ch === '[' || ch === '{') { depth++; continue; }
    if (ch === ')' || ch === ']' || ch === '}') { depth--; continue; }
    if (depth === 0 && ch === ';') return { depth, stop: ';' };
    if (depth === 0 && ch === ',') return { depth, stop: ',' };
  }
  return { depth, stop: null };
}

function reindentMultilineBlockAssignment(lines: string[], i: number): { out: string[]; next: number } | null {
  const raw = lines[i];
  const indent = raw.match(/^(\s*)/)?.[1] || '';
  const m = splitTopLevelAssign(raw.trim());
  if (!m) return null;
  const lhs = m[1].trim();
  if (!BLOCK_LVALUE.test(lhs)) return null;
  const firstRhs = m[3];
  if (firstRhs === '') return null;
  // The first line must not terminate the statement (single-line assignments
  // are handled above) and must not carry a top-level ',' (that marks a list
  // body such as a typedef enum member, e.g. "NAME = 4'h0,").
  let st = scanBlockAssignRhs(firstRhs, 0);
  if (st.stop) return null;
  let depth = st.depth;
  if (depth < 0) return null;
  const cont: string[] = [];
  let j = i + 1;
  let closed = false;
  while (j < lines.length && cont.length < 64) {
    const t = lines[j].trim();
    if (t === '' || /^[)\]}]*\s*(begin|end|endcase|else|if|for|while|case[xz]?|default|assign|always|initial)\b/.test(t)) break;
    st = scanBlockAssignRhs(t, depth);
    if (st.stop === ',') return null;
    cont.push(t);
    j++;
    if (st.stop === ';') { closed = true; break; }
    depth = st.depth;
    if (depth < 0) return null;
  }
  if (!closed || cont.length === 0) return null;
  // Continuation lines align to the RHS start column, matching the module-level
  // assign wrapper.
  const contCol = indent.length + lhs.length + 1 + m[2].length + 1;
  const pad = ' '.repeat(contCol);
  const out = [`${indent}${lhs} ${m[2]} ${firstRhs}`];
  cont.forEach(t => out.push(pad + t));
  return { out, next: j };
}

function alignConsecutiveBlockAssignments(lines: string[]): string[] {
  const result: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const parsed = parseBlockAssignment(lines[i]);
    if (!parsed) {
      const ml = reindentMultilineBlockAssignment(lines, i);
      if (ml) {
        ml.out.forEach(l => result.push(l));
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
      const maxLhs = Math.max(...group.map(g => g.lhs.length));
      group.forEach(g => {
        result.push(`${g.indent}${g.lhs.padEnd(maxLhs)} ${g.op} ${g.rhs};${g.gap}${g.comment}`);
      });
    } else {
      result.push(lines[i]);
    }
    i = j;
  }
  return result;
}

/**
 * Aligns assignments within case items and blocks
 * This is a post-processing step that operates on already-indented code
 */
export function alignBlockAssignments(lines: string[], cfg: Config): string[] {
  // Align case-item columns, then column-align runs of consecutive, same-indent
  // plain =/<= assignments inside procedural blocks. Splitting uses
  // splitTopLevelAssign, so ':' from ternaries/part-selects and comparison ops
  // (>=, ==, !=) in the LHS/RHS are handled correctly.
  const aligned = alignCaseItemAssignments(lines);
  if (cfg && cfg.alignAssignments === false) return aligned;
  return alignConsecutiveBlockAssignments(aligned);
}
