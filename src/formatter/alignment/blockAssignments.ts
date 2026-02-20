/**
 * Block assignment alignment module
 * 
 * Aligns assignments within case items and always/if blocks
 */

import { Config } from '../types';

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
          const assignMatch = assignment.match(/^(.*?)\s*(<=|=)\s*(.*)$/);
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
        // Calculate max lengths for alignment
        // Labels should be padded only if they're on consecutive lines
        const maxLabelLen = Math.max(...group.map(item => item.label.length));
        const maxLhsLen = Math.max(...group.map(item => item.lhs.length));
        const maxRhsLen = Math.max(...group.map(item => item.rhs.length));
        
        group.forEach(item => {
          // Pad label to align colons
          const paddedLabel = item.label.padEnd(maxLabelLen);
          // After the colon, pad the lhs to align operators
          const paddedLhs = item.lhs.padEnd(maxLhsLen);
          // Pad RHS to align semicolons and comments
          const paddedRhs = item.rhs.padEnd(maxRhsLen);
          const alignedLine = `${item.indent}${paddedLabel}: ${paddedLhs} ${item.op} ${paddedRhs};${item.comment ? ' ' + item.comment : ''}`;
          result.push(alignedLine);
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
        const maxLhsLen = Math.max(...assignmentGroup.map(item => item.lhs.length));
        const maxRhsLen = Math.max(...assignmentGroup.map(item => item.rhs.length));
        
        // Pad both LHS and RHS to align operators and semicolons
        assignmentGroup.forEach(item => {
          const paddedLhs = item.lhs.padEnd(maxLhsLen);
          const paddedRhs = item.rhs.padEnd(maxRhsLen);
          const alignedLine = `${item.indent}${paddedLhs} ${item.op} ${paddedRhs};${item.comment ? ' ' + item.comment : ''}`;
          result.push(alignedLine);
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
  // console.log(`[handleIfElseAlignment] Found ${assignments.length} assignments`);
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

/**
 * Aligns assignments within case items and blocks
 * This is a post-processing step that operates on already-indented code
 */
export function alignBlockAssignments(lines: string[], cfg: Config): string[] {
  // First pass: align case item assignments
  let aligned = alignCaseItemAssignments(lines);
  
  // Second pass: align block-level assignments
  aligned = alignBlockLevelAssignments(aligned);
  
  return aligned;
}
