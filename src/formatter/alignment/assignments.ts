/**
 * Assignment alignment module
 * 
 * Aligns assignment statements (assign, blocking/non-blocking assignments)
 */

export function alignAssignmentGroup(lines: string[]): string[] {
  interface Row { rawLines: string[]; lhs: string; op: string; rhsLines: string[]; comment: string; hasOp: boolean; isAssign: boolean; assignRemainder: string; endsWithSemicolon: boolean; }
  // Extract base indent from first non-comment/non-ifdef line
  const firstCodeLine = lines.find(l => !/^\s*\/\//.test(l) && !/^\s*`(ifn?def|else|endif)\b/.test(l)) || lines[0];
  const baseIndent = (firstCodeLine.match(/^\s*/)?.[0]) || '';
  const merged: string[][] = [];
  let current: string[] = [];
  lines.forEach(l => {
    // Standalone comments, ifdefs, and blank lines should be their own group
    if (/^\s*\/\//.test(l) || /^\s*`(ifn?def|else|endif)\b/.test(l) || /^\s*$/.test(l)) {
      if (current.length) {
        merged.push(current);
        current = [];
      }
      merged.push([l]); // Comment/ifdef/blank as standalone group
      return;
    }
    current.push(l);
    if (/;\s*(\/\/.*)?$/.test(l)) { merged.push(current); current = []; }
  });
  if (current.length) merged.push(current);
  const rows: Row[] = merged.map(stLines => {
    const first = stLines[0];
    const commentMatch = first.match(/(.*?)(\/\/.*)$/);
    const commentFirst = commentMatch ? commentMatch[2].replace(/\/\/\s?/, '// ').trim() : '';
    const bodyFirst = (commentMatch ? commentMatch[1] : first).trim();
    const m = bodyFirst.match(/^(.*?)\s*(<=|=)\s*(.*)$/);
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
    // Preserve base indentation for non-operator lines
    return rows.flatMap(r => r.rawLines.map(rl => baseIndent + rl.trim()));
  }
  const assignRemainderLengths = opRows.filter(r => r.isAssign).map(r => r.assignRemainder.length);
  const maxAssignRemainder = assignRemainderLengths.length ? Math.max(...assignRemainderLengths) : 0;
  const maxNonAssignLhs = opRows.filter(r => !r.isAssign).length ? Math.max(...opRows.filter(r => !r.isAssign).map(r => r.lhs.length)) : 0;
  const assignPrefixLen = 7; // 'assign '
  const targetLhsWidth = Math.max(assignPrefixLen + maxAssignRemainder, maxNonAssignLhs);
  const bodies = opRows.map(r => {
    const lhsDisplay = r.isAssign ? ('assign ' + r.assignRemainder.padEnd(targetLhsWidth - assignPrefixLen)) : r.lhs.padEnd(targetLhsWidth);
    const firstRhs = r.rhsLines[0];
    return baseIndent + lhsDisplay + ' ' + r.op + ' ' + firstRhs.trim();
  });
  const maxBodyLen = Math.max(...bodies.map(b => b.length));
  const out: string[] = [];
  rows.forEach(r => {
    if (!r.hasOp) {
      r.rawLines.forEach(rl => out.push(baseIndent + rl.trim()));
      return;
    }
    const lhsDisplay = r.isAssign ? ('assign ' + r.assignRemainder.padEnd(targetLhsWidth - assignPrefixLen)) : r.lhs.padEnd(targetLhsWidth);
    const prefix = baseIndent + lhsDisplay + ' ' + r.op + ' ';
    const firstLineCore = (prefix + r.rhsLines[0].trim()).padEnd(maxBodyLen);
    const firstLine = firstLineCore + (r.rhsLines.length === 1 ? ';' : '') + (r.comment && r.rhsLines.length === 1 ? ' ' + r.comment : (r.rhsLines.length === 1 ? '' : ''));
    out.push(firstLine);
    if (r.rhsLines.length > 1) {
      const contIndentSpaces = ' '.repeat(prefix.length);
      const lastIdx = r.rhsLines.length - 1;
      r.rhsLines.slice(1).forEach((rl, idx) => {
        const isLastLine = idx === lastIdx - 1;
        // All continuation lines are aligned at the position after the = sign
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
