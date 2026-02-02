/**
 * Parameter/localparam alignment module
 * 
 * Aligns parameter and localparam declarations
 */

export function alignParameterLines(lines: string[]): string[] {
  if (!lines.length) return [];

  // Group lines into parameter declarations (may span multiple lines until semicolon) or non-param lines
  interface ParamDecl { keyword: string; typeSpec: string; name: string; valueLines: string[]; comment: string; originalLines: string[]; hasEq: boolean; isParam: boolean; }

  const blocks: string[][] = [];
  let current: string[] = [];
  let collecting = false;

  lines.forEach(l => {
    const startsParam = /^\s*(parameter|localparam)\b/.test(l);
    const isNonParam = /^\s*\/\//.test(l) || /^\s*`(ifn?def|else|endif)\b/.test(l) || /^\s*$/.test(l);

    if (!collecting && startsParam) {
      current = [l];
      collecting = !/;\s*(\/\/.*)?$/.test(l); // continue if no semicolon yet
      if (!collecting) { blocks.push(current); current = []; }
      return;
    }
    if (collecting) {
      current.push(l);
      if (/;\s*(\/\/.*)?$/.test(l)) { blocks.push(current); current = []; collecting = false; }
      return;
    }
    // Non-parameter line (comment, ifdef, blank)
    if (isNonParam) {
      blocks.push([l]);
      return;
    }
    // Standalone line (shouldn't happen in parameter block, but handle it)
    blocks.push([l]);
  });
  if (current.length) blocks.push(current);

  const parsed: ParamDecl[] = blocks.map(block => {
    const first = block[0].trim();

    // Check if this is a non-parameter line (comment, ifdef, blank)
    const isNonParam = /^\s*\/\//.test(block[0]) || /^\s*`(ifn?def|else|endif)\b/.test(block[0]) || /^\s*$/.test(block[0]);
    if (isNonParam) {
      return { keyword: '', typeSpec: '', name: '', valueLines: [], comment: '', originalLines: block, hasEq: false, isParam: false };
    }

    const lastLine = block[block.length - 1];
    const commentMatch = lastLine.match(/(.*?)(\/\/.*)$/);
    const comment = commentMatch ? commentMatch[2].replace(/\/\/\s?/, '// ').trim() : '';

    const body = first.replace(/(\/\/.*)$/, '').trim();
    const eqIdx = body.indexOf('=');

    if (eqIdx === -1) {
      return { keyword: '', typeSpec: '', name: body.replace(/;\s*$/, ''), valueLines: [], comment, originalLines: block, hasEq: false, isParam: false };
    }

    const leftPart = body.substring(0, eqIdx).trim();
    const firstValuePart = body.substring(eqIdx + 1).trim().replace(/;\s*$/, '');
    const tokens = leftPart.split(/\s+/);

    let keyword = '';
    if (tokens.length && /^(parameter|localparam)$/.test(tokens[0])) keyword = tokens.shift()!;

    let typeSpec = '';
    let name = '';
    if (tokens.length > 1) {
      typeSpec = tokens.slice(0, -1).join(' ');
      name = tokens[tokens.length - 1];
    } else if (tokens.length === 1) {
      name = tokens[0];
    }

    let valueLines: string[] = [firstValuePart];

    // Add continuation lines
    if (block.length > 1) {
      block.slice(1).forEach(ln => {
        const trimmed = ln.replace(/;\s*(\/\/.*)?$/, '').trim();
        if (trimmed.length) valueLines.push(trimmed);
      });
    }

    // Merge lines that are just opening braces with the next line
    for (let i = 0; i < valueLines.length - 1; i++) {
      if (valueLines[i].trim() === '{') {
        valueLines[i] = '{' + (valueLines[i + 1] ? ' ' + valueLines[i + 1] : '');
        valueLines.splice(i + 1, 1);
        i--; // Re-check current position
      }
    }

    // Merge lines that are just closing braces with the previous line
    for (let i = 1; i < valueLines.length; i++) {
      if (/^}[,;]?\s*$/.test(valueLines[i].trim())) {
        valueLines[i - 1] = valueLines[i - 1] + ' ' + valueLines[i].trim();
        valueLines.splice(i, 1);
        i--; // Re-check current position
      }
    }

    return { keyword, typeSpec, name, valueLines, comment, originalLines: block, hasEq: true, isParam: true };
  });

  const withEq = parsed.filter(p => p.hasEq && p.isParam);
  if (!withEq.length) return parsed.flatMap(p => p.originalLines);

  // Extract base indentation from the first line
  const firstLine = parsed.length > 0 && parsed[0].originalLines.length > 0 ? parsed[0].originalLines[0] : '';
  let baseIndent = (firstLine.match(/^\s*/)?.[0]) || '';

  // If no indentation but starts with parameter/localparam, add minimum module body indentation
  if (baseIndent === '' && /^(parameter|localparam)\b/.test(firstLine.trim())) {
    baseIndent = '  ';
  }

  // Build raw left segments (without padding) to determine rightmost '=' column
  const leftSegments = withEq.map(p => {
    const segs: string[] = [];
    if (p.keyword) segs.push(p.keyword);
    if (p.typeSpec) segs.push(p.typeSpec);
    segs.push(p.name); // name always present if hasEq
    return segs.join(' ');
  });
  const maxLeftLen = Math.max(...leftSegments.map(s => s.length));

  // Calculate the position where semicolons should be (rightmost)
  // For single-line params, it's: baseIndent + leftPadded + ' = ' + value + ';'
  const maxSemicolonPos = Math.max(...withEq.map(p => {
    if (p.valueLines.length > 1) return 0; // Multi-line params handle semicolon differently
    const segs: string[] = [];
    if (p.keyword) segs.push(p.keyword);
    if (p.typeSpec) segs.push(p.typeSpec);
    segs.push(p.name);
    const leftPadded = segs.join(' ').padEnd(maxLeftLen);
    return baseIndent.length + leftPadded.length + 3 + p.valueLines[0].length; // +3 for ' = '
  }));

  // Format each parameter
  const result: string[] = [];
  parsed.forEach(p => {
    // If not a parameter (comment, ifdef, blank), return original
    if (!p.isParam) {
      result.push(...p.originalLines);
      return;
    }

    if (!p.hasEq) {
      result.push(...p.originalLines);
      return;
    }

    const segs: string[] = [];
    if (p.keyword) segs.push(p.keyword);
    if (p.typeSpec) segs.push(p.typeSpec);
    segs.push(p.name);
    let leftRaw = segs.join(' ');
    leftRaw = leftRaw.padEnd(maxLeftLen);

    // First line with '=' and first value part
    if (p.valueLines.length <= 1) {
      // Single-line: align semicolon to maxSemicolonPos
      const lineBeforeSemi = baseIndent + leftRaw + ' = ' + p.valueLines[0];
      const padding = ' '.repeat(Math.max(0, maxSemicolonPos - lineBeforeSemi.length));
      const firstLine = lineBeforeSemi + padding + ';' + (p.comment ? ' ' + p.comment : '');
      result.push(firstLine);
    } else {
      // Multi-line: no semicolon on first line
      const firstLine = baseIndent + leftRaw + ' = ' + p.valueLines[0];
      result.push(firstLine);
    }

    // Continuation lines (indented to align with start of value)
    if (p.valueLines.length > 1) {
      const contIndent = baseIndent + ' '.repeat((leftRaw + ' = ').length);
      const lastIdx = p.valueLines.length - 1;
      for (let i = 1; i < p.valueLines.length; i++) {
        const isLast = i === lastIdx;
        const contLine = contIndent + p.valueLines[i] + (isLast ? ';' : '') + (isLast && p.comment ? ' ' + p.comment : '');
        result.push(contLine);
      }
    }
  });

  return result;
}
