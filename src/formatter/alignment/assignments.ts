/**
 * Assignment alignment module
 * 
 * Aligns assignment statements (assign, blocking/non-blocking assignments)
 */

import { splitTopLevelAssign } from '../utils/assignments';

export function alignAssignmentGroup(lines: string[]): string[] {
  interface Row { rawLines: string[]; lhs: string; op: string; rhsLines: string[]; comment: string; hasOp: boolean; isAssign: boolean; assignRemainder: string; endsWithSemicolon: boolean; }
  // Extract base indent from first non-comment/non-ifdef line
  const firstCodeLine = lines.find(l => !/^\s*\/\//.test(l) && !/^\s*`(ifn?def|else|endif)\b/.test(l) && l.trim() !== '') || lines[0];
  const baseIndent = (firstCodeLine.match(/^\s*/)?.[0]) || '';
  // Parse each line into assignment groups
  // Comments/blanks/ifdefs are kept as separate "rows" but don't break alignment calculation
  const merged: string[][] = [];
  let current: string[] = [];
  
  lines.forEach(l => {
    const trimmed = l.trim();
    const isComment = /^\/\//.test(trimmed);
    const isBlank = trimmed === '';
    const isIfdef = /^`(ifn?def|else|endif)\b/.test(trimmed);
    
    if (isComment || isBlank || isIfdef) {
      // Flush current assignment if any
      if (current.length) {
        merged.push(current);
        current = [];
      }
      // Add comment/blank/ifdef as standalone row
      merged.push([l]);
      return;
    }
    
    // This is an assignment line
    current.push(l);
    if (/;\s*(\/\/.*)?$/.test(l)) {
      // Assignment complete
      merged.push(current);
      current = [];
    }
  });
  if (current.length) merged.push(current);
  const rows: Row[] = merged.map(stLines => {
    const first = stLines[0];
    const commentMatch = first.match(/(.*?)(\/\/.*)$/);
    const commentFirst = commentMatch ? commentMatch[2].replace(/\/\/\s?/, '// ').trim() : '';
    const bodyFirst = (commentMatch ? commentMatch[1] : first).trim();
    const m = splitTopLevelAssign(bodyFirst);
    if (m) {
      const lhsRaw = m[1].trim();
      const isAssign = /^assign\b/.test(lhsRaw);
      const assignRemainder = isAssign ? lhsRaw.replace(/^assign\s+/, '').trim() : '';
      const rhsAll: string[] = [];
      const firstRhs = m[3];
      rhsAll.push(firstRhs.replace(/;\s*$/, ''));
      stLines.slice(1).forEach(sl => {
        const trimmed = sl.replace(/;\s*(\/\/.*)?$/, '');
        rhsAll.push(trimmed.trim());
      });
      let endComment = commentFirst;
      const lastLine = stLines[stLines.length - 1];
      const lastCommentMatch = lastLine !== first ? lastLine.match(/(.*?)(\/\/.*)$/) : null;
      if (lastCommentMatch) endComment = lastCommentMatch[2].replace(/\/\/\s?/, '// ').trim();
      const endsWithSemicolon = /;\s*(\/\/.*)?$/.test(lastLine);
      return { rawLines: stLines, lhs: lhsRaw, op: m[2], rhsLines: rhsAll, comment: endComment, hasOp: true, isAssign, assignRemainder, endsWithSemicolon };
    }
    const combined = stLines.join(' ');
    return { rawLines: stLines, lhs: combined.trim(), op: '', rhsLines: [], comment: '', hasOp: false, isAssign: false, assignRemainder: '', endsWithSemicolon: /;\s*(\/\/.*)?$/.test(stLines[stLines.length - 1]) };
  });
  const opRows = rows.filter(r => r.hasOp);
  if (!opRows.length) {
    // Preserve base indentation for non-operator lines; blank lines stay empty
    return rows.flatMap(r => r.rawLines.map(rl => rl.trim() ? baseIndent + rl.trim() : ''));
  }
  const assignRemainderLengths = opRows.filter(r => r.isAssign).map(r => r.assignRemainder.length);
  const maxAssignRemainder = assignRemainderLengths.length ? Math.max(...assignRemainderLengths) : 0;
  const maxNonAssignLhs = opRows.filter(r => !r.isAssign).length ? Math.max(...opRows.filter(r => !r.isAssign).map(r => r.lhs.length)) : 0;
  const assignPrefixLen = 7; // 'assign '
  const targetLhsWidth = Math.max(assignPrefixLen + maxAssignRemainder, maxNonAssignLhs);
  // Max code length (through ';') across single-line assignments — used ONLY to
  // align trailing comments, never to pad before ';'.
  const singleLineOpRows = opRows.filter(r => r.rhsLines.length === 1);
  const maxCodeLen = singleLineOpRows.length
    ? Math.max(...singleLineOpRows.map(r => {
        const lhs = r.isAssign
          ? ('assign ' + r.assignRemainder.padEnd(targetLhsWidth - assignPrefixLen))
          : r.lhs.padEnd(targetLhsWidth);
        return (baseIndent + lhs + ' ' + r.op + ' ' + r.rhsLines[0].trim() + ';').length;
      }))
    : 0;
  const out: string[] = [];
  rows.forEach(r => {
    if (!r.hasOp) {
      r.rawLines.forEach(rl => out.push(rl.trim() ? baseIndent + rl.trim() : ''));
      return;
    }
    const lhsDisplay = r.isAssign ? ('assign ' + r.assignRemainder.padEnd(targetLhsWidth - assignPrefixLen)) : r.lhs.padEnd(targetLhsWidth);
    const prefix = baseIndent + lhsDisplay + ' ' + r.op + ' ';
    if (r.rhsLines.length === 1) {
      // Keep ';' tight to the RHS; align trailing comments after the ';'
      const code = prefix + r.rhsLines[0].trim() + ';';
      out.push(r.comment ? code.padEnd(maxCodeLen) + ' ' + r.comment : code);
    } else {
      out.push(prefix + r.rhsLines[0].trim());
    }
    if (r.rhsLines.length > 1) {
      // Continuation lines align to the RHS start column (just past '= ').
      const contIndentLen = prefix.length;
      const contIndentSpaces = ' '.repeat(contIndentLen);
      const lastIdx = r.rhsLines.length - 1;
      
      r.rhsLines.slice(1).forEach((rl, idx) => {
        const isLastLine = idx === lastIdx - 1;
        // Continuation lines align with the first character after opening paren, or after = sign
        let lineCore = contIndentSpaces + rl.trim();
        if (isLastLine) {
          lineCore = lineCore + ';' + (r.comment ? ' ' + r.comment : '');
        }
        out.push(lineCore);
      });
    }
  });
  return out;
}
