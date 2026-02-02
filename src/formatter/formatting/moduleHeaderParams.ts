/**
 * Module header parameter alignment helper
 * 
 * Aligns parameters in module headers
 */

export function alignModuleHeaderParameterLines(lines: string[]): string[] {
  if (!lines.length) return [];

  // Helper to check if a line ends with comma (not inside braces/parens)
  function endsWithComma(text: string): boolean {
    let depth = 0;
    let inString = false;
    let lastNonSpace = -1;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];

      // Handle SystemVerilog '{ construct
      if (ch === "'" && i + 1 < text.length && text[i + 1] === '{') {
        i++;
        depth++;
        continue;
      }

      if (ch === '"' || ch === "'") {
        if (!inString) inString = true;
        else if (i === 0 || text[i-1] !== '\\') inString = false;
      }
      if (inString) continue;

      if (ch === '(' || ch === '{' || ch === '[') depth++;
      if (ch === ')' || ch === '}' || ch === ']') depth--;
      if (ch !== ' ' && ch !== '\t') lastNonSpace = i;
    }

    return depth === 0 && lastNonSpace >= 0 && text[lastNonSpace] === ',';
  }

  // Helper to check if a line appears to continue (ends with operator or has unclosed brackets)
  function needsContinuation(text: string): boolean {
    let depth = 0;
    let inString = false;
    let lastNonSpace = -1;
    let lastNonSpaceChar = '';

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];

      // Handle SystemVerilog '{ construct
      if (ch === "'" && i + 1 < text.length && text[i + 1] === '{') {
        i++;
        depth++;
        continue;
      }

      if (ch === '"' || ch === "'") {
        if (!inString) inString = true;
        else if (i === 0 || text[i-1] !== '\\') inString = false;
      }
      if (inString) continue;

      if (ch === '(' || ch === '{' || ch === '[') depth++;
      if (ch === ')' || ch === '}' || ch === ']') depth--;
      if (ch !== ' ' && ch !== '\t') {
        lastNonSpace = i;
        lastNonSpaceChar = ch;
      }
    }

    // Continues if: unclosed brackets/braces, or ends with operator (but not comma or semicolon)
    if (depth > 0) return true;
    if (lastNonSpace >= 0) {
      const operators = ['+', '-', '*', '/', '%', '&', '|', '^', '?', ':', '<', '>'];
      return operators.includes(lastNonSpaceChar);
    }
    return false;
  }  // First, group lines into complete parameter declarations (handling multi-line values)
  interface ParamGroup {
    lines: string[];
    keyword: string;
    typeSpec: string;
    name: string;
    valueLines: string[];
    comment: string;
    isDirective: boolean;
    isComment: boolean;
  }

  const groups: ParamGroup[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Handle comment-only lines
    if (/^\/\//.test(trimmed)) {
      groups.push({
        lines: [line],
        keyword: '',
        typeSpec: '',
        name: '',
        valueLines: [],
        comment: trimmed,
        isDirective: false,
        isComment: true
      });
      i++;
      continue;
    }

    // Handle directives
    if (/^`(ifn?def|else|endif)\b/.test(trimmed)) {
      groups.push({
        lines: [line],
        keyword: '',
        typeSpec: '',
        name: '',
        valueLines: [],
        comment: '',
        isDirective: true,
        isComment: false
      });
      i++;
      continue;
    }

    // Handle parameter declaration
    if (/^(parameter|localparam)\b/.test(trimmed)) {
      const paramLines: string[] = [line];
      let allComments: string[] = [];

      const commentMatch = line.match(/(.*?)(\/\/.*)$/);
      if (commentMatch && commentMatch[2]) {
        allComments.push(commentMatch[2].replace(/\/\/\s?/, '// ').trim());
      }
      let body = (commentMatch ? commentMatch[1] : line).trim();

      // Parse the parameter declaration
      const eqIdx = body.indexOf('=');
      let keyword = '';
      let typeSpec = '';
      let name = '';
      let valueLines: string[] = [];

      if (eqIdx !== -1) {
        const leftPart = body.substring(0, eqIdx).trim();
        const valuePart = body.substring(eqIdx + 1).trim();

        const tokens = leftPart.split(/\s+/);
        if (tokens.length && /^(parameter|localparam)$/.test(tokens[0])) {
          keyword = tokens.shift()!;
        }
        if (tokens.length > 1) {
          typeSpec = tokens.slice(0, -1).join(' ');
          name = tokens[tokens.length - 1];
        } else if (tokens.length === 1) {
          name = tokens[0];
        }

        // Start with first value line
        valueLines.push(valuePart);

        // Track cumulative depth starting from the VALUE PART ONLY (after the =)
        let cumulativeDepth = 0;
        let inString = false;

        // Calculate depth for value part only
        for (let j = 0; j < valuePart.length; j++) {
          const ch = valuePart[j];

          // Handle SystemVerilog '{ construct (not a string)
          if (ch === "'" && j + 1 < valuePart.length && valuePart[j + 1] === '{') {
            j++; // Skip the {, we'll process it below after incrementing j
            cumulativeDepth++;
            continue;
          }

          if (ch === '"' || ch === "'") {
            if (!inString) inString = true;
            else if (j === 0 || valuePart[j-1] !== '\\') inString = false;
          }
          if (inString) continue;

          if (ch === '(' || ch === '{' || ch === '[') cumulativeDepth++;
          if (ch === ')' || ch === '}' || ch === ']') cumulativeDepth--;
        }

        // Check if this line ends the parameter
        const hasEndingComma = endsWithComma(valuePart);

        // If no ending comma and (has unclosed brackets OR ends with operator), collect continuation lines
        if (!hasEndingComma && (cumulativeDepth > 0 || needsContinuation(valuePart))) {
          i++;
          while (i < lines.length) {
            const nextLine = lines[i];
            const nextTrimmed = nextLine.trim();

            // Stop if next line starts a new parameter or is a directive/comment
            if (/^(parameter|localparam)\b/.test(nextTrimmed)) {
              i--; // Back up so outer loop processes this line
              break;
            }
            if (/^`(ifn?def|else|endif)\b/.test(nextTrimmed) || /^\/\//.test(nextTrimmed)) {
              i--; // Back up
              break;
            }

            paramLines.push(nextLine);
            const nextCommentMatch = nextLine.match(/(.*?)(\/\/.*)$/);
            if (nextCommentMatch && nextCommentMatch[2]) {
              allComments.push(nextCommentMatch[2].replace(/\/\/\s?/, '// ').trim());
            }
            let nextBody = (nextCommentMatch ? nextCommentMatch[1] : nextLine).trim();
            valueLines.push(nextBody);

            // Update cumulative depth with this line
            inString = false;
            for (let j = 0; j < nextBody.length; j++) {
              const ch = nextBody[j];

              // Handle SystemVerilog '{ construct
              if (ch === "'" && j + 1 < nextBody.length && nextBody[j + 1] === '{') {
                j++;
                cumulativeDepth++;
                continue;
              }

              if (ch === '"' || ch === "'") {
                if (!inString) inString = true;
                else if (j === 0 || nextBody[j-1] !== '\\') inString = false;
              }
              if (inString) continue;

              if (ch === '(' || ch === '{' || ch === '[') cumulativeDepth++;
              if (ch === ')' || ch === '}' || ch === ']') cumulativeDepth--;
            }

            const nextHasEndingComma = endsWithComma(nextBody);
            const nextNeedsContinuation = needsContinuation(nextBody);

            // End conditions:
            // 1. Line has comma AND all brackets closed AND line doesn't end with continuation operator
            if (nextHasEndingComma && cumulativeDepth <= 0 && !nextNeedsContinuation) {
              break;
            }

            // 2. No comma, all brackets closed, no continuation operator - orphaned line, stop
            if (!nextHasEndingComma && cumulativeDepth <= 0 && !nextNeedsContinuation) {
              break;
            }

            i++;
          }
        }
      }

      groups.push({
        lines: paramLines,
        keyword,
        typeSpec,
        name,
        valueLines,
        comment: allComments.length > 0 ? allComments[allComments.length - 1] : '',
        isDirective: false,
        isComment: false
      });
    }
    i++;
  }

  // Filter to parameters with values for alignment calculation
  const paramsWithValues = groups.filter(g => !g.isComment && !g.isDirective && g.name && g.valueLines.length > 0);

  if (!paramsWithValues.length) {
    return groups.flatMap(g => g.isComment ? [g.comment] : g.lines);
  }

  // Calculate max lengths for alignment
  const leftSegments = paramsWithValues.map(g => {
    const segs: string[] = [];
    if (g.keyword) segs.push(g.keyword);
    if (g.typeSpec) segs.push(g.typeSpec);
    segs.push(g.name);
    return segs.join(' ');
  });
  const maxLeftLen = Math.max(...leftSegments.map(s => s.length));

  // For single-line values, calculate max value length for alignment
  const singleLineParams = paramsWithValues.filter(g => g.valueLines.length === 1);
  const maxValueLen = singleLineParams.length > 0
    ? Math.max(...singleLineParams.map(g => g.valueLines[0].replace(/,\s*$/, '').length))
    : 0;

  // Format each group
  const result: string[] = [];
  groups.forEach(g => {
    if (g.isComment) {
      result.push(g.comment);
      return;
    }
    if (g.isDirective) {
      result.push(g.lines[0].trim());
      return;
    }

    if (!g.name || g.valueLines.length === 0) {
      result.push(...g.lines);
      return;
    }

    // Build left side
    const segs: string[] = [];
    if (g.keyword) segs.push(g.keyword);
    if (g.typeSpec) segs.push(g.typeSpec);
    segs.push(g.name);
    const leftPadded = segs.join(' ').padEnd(maxLeftLen);

    if (g.valueLines.length === 1) {
      // Single-line value
      const valueNoComma = g.valueLines[0].replace(/,\s*$/, '');
      const hasComma = /,\s*$/.test(g.valueLines[0]);

      // Calculate position for comma alignment
      // Comma should be at: maxLeftLen + ' = ' + maxValueLen
      const commaCol = maxLeftLen + 3 + maxValueLen;
      const currentPos = leftPadded.length + 3 + valueNoComma.length;
      const paddingNeeded = Math.max(0, commaCol - currentPos);

      const line = leftPadded + ' = ' + valueNoComma + ' '.repeat(paddingNeeded) + (hasComma ? ',' : '');
      result.push(line + (g.comment ? ' ' + g.comment : ''));
    } else {
      // Multi-line value - first line with equals
      const firstLine = leftPadded + ' = ' + g.valueLines[0];
      result.push(firstLine);

      // Continuation lines indented to align with first value character
      const contIndent = ' '.repeat(maxLeftLen + 3); // +3 for ' = '
      for (let j = 1; j < g.valueLines.length; j++) {
        const isLast = j === g.valueLines.length - 1;
        const contLine = contIndent + g.valueLines[j];
        result.push(contLine + (isLast && g.comment ? ' ' + g.comment : ''));
      }
    }
  });

  return result;
}
