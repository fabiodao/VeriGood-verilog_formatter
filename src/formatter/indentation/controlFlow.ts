/**
 * Control flow indentation module
 * 
 * Enforces begin/end blocks for if/else and for loops
 */

export function enforceIfBlocks(lines: string[], indentSize: number): string[] {
  const unit = ' '.repeat(indentSize);
  function nextNonBlank(idx: number): number { while (idx < lines.length && lines[idx].trim() === '') idx++; return idx; }

  // Helper to skip over preprocessor directive blocks, comments, and find the next executable line
  function nextExecutableLine(idx: number): number {
    let current = nextNonBlank(idx);
    while (current < lines.length) {
      const trimmed = lines[current].trim();
      // Skip comments
      if (trimmed.startsWith('//') || trimmed.startsWith('/*')) {
        current++;
        current = nextNonBlank(current);
        continue;
      }
      // If it's a preprocessor directive, skip the entire block
      if (trimmed.startsWith('`ifdef') || trimmed.startsWith('`ifndef')) {
        let depth = 1;
        current++;
        while (current < lines.length && depth > 0) {
          const t = lines[current].trim();
          if (t.startsWith('`ifdef') || t.startsWith('`ifndef')) depth++;
          else if (t.startsWith('`endif')) depth--;
          current++;
        }
        current = nextNonBlank(current);
      } else if (trimmed.startsWith('`else') || trimmed.startsWith('`elsif')) {
        // Skip `else preprocessor directives too
        current++;
        current = nextNonBlank(current);
      } else if (trimmed.match(/^\s*(if|else|for|while|case|begin|end)\b/)) {
        // Stop if we encounter another control structure - this means there's no simple statement
        return -1;
      } else {
        // Found a non-preprocessor, non-comment line
        break;
      }
    }
    return current;
  }

  const expanded: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    // Single-line if
    const singleIf = line.match(/^(\s*)if\b(.*\))\s+([^;]+);(\s*\/\/.*)?$/);
    if (singleIf && !/\bbegin\b/.test(line)) {
      const indent = singleIf[1]; const cond = singleIf[2].trim(); const stmt = singleIf[3].trim(); const cmt = singleIf[4]? ' ' + singleIf[4].trim():'';
      expanded.push(indent + 'if' + cond + ' begin' + cmt);
      expanded.push(indent + unit + stmt + ';');
      expanded.push(indent + 'end');
      continue;
    }
    // Single-line else if
    const singleElseIf = line.match(/^(\s*)else\s+if\b(.*\))\s+([^;]+);(\s*\/\/.*)?$/);
    if (singleElseIf && !/\bbegin\b/.test(line)) {
      const indent = singleElseIf[1]; const cond = singleElseIf[2].trim(); const stmt = singleElseIf[3].trim(); const cmt = singleElseIf[4]? ' ' + singleElseIf[4].trim():'';
      expanded.push(indent + 'else if' + cond + ' begin' + cmt);
      expanded.push(indent + unit + stmt + ';');
      expanded.push(indent + 'end');
      continue;
    }
    // Single-line else
    const singleElse = line.match(/^(\s*)else\b\s+([^;]+);(\s*\/\/.*)?$/);
    if (singleElse && !/\bbegin\b/.test(line)) {
      const indent = singleElse[1]; const stmt = singleElse[2].trim(); const cmt = singleElse[3]? ' ' + singleElse[3].trim():'';
      expanded.push(indent + 'else begin' + cmt);
      expanded.push(indent + unit + stmt + ';');
      expanded.push(indent + 'end');
      continue;
    }

    // Handle "end else if (...) for (...)" pattern - split into separate lines
    const endElseIfFor = line.match(/^(\s*)end\s+else\s+if\b(.*\))\s+(for\s*\(.*\).*)$/);
    if (endElseIfFor) {
      const indent = endElseIfFor[1];
      const condition = endElseIfFor[2].trim();
      const forPart = endElseIfFor[3].trim();
      expanded.push(indent + 'end else if' + condition + ' begin');
      expanded.push(indent + unit + forPart);
      expanded.push(indent + 'end');
      continue;
    }

    // Headers without begin (if / else if / else) where next line is standalone begin
    const headerPatterns: {re: RegExp; rewrite: (m: RegExpMatchArray, beginComment: string, mergedComment: string) => string}[] = [
      { re: /^(\s*)if\b.*\)(\s*\/\/.*)?$/, rewrite: (m, bc, mc) => m[0].replace(m[2]||'', '').trimEnd() + ' begin' + (mc? ' // ' + mc:'') },
      { re: /^(\s*)else\s+if\b.*\)(\s*\/\/.*)?$/, rewrite: (m, bc, mc) => m[0].replace(m[2]||'', '').trimEnd() + ' begin' + (mc? ' // ' + mc:'') },
      { re: /^(\s*)else\b(\s*\/\/.*)?$/, rewrite: (m, bc, mc) => m[1] + 'else begin' + (mc? ' // ' + mc:'') }
    ];
    let mergedHeader = false;
    for (const hp of headerPatterns) {
      const m = line.match(hp.re);
      if (m && !/\bbegin\b/.test(line)) {
        const headerComment = m[2]; const nxt = nextNonBlank(i+1);
        if (nxt < lines.length) {
          const nextLine = lines[nxt];
          const nextTrimmed = nextLine.trim();

          // Skip wrapping if next line starts with logical continuation operators
          // This indicates a multi-line condition that continues across lines
          if (/^(&&|\|\||&(?!&)|\|(?!\|))/.test(nextTrimmed)) {
            expanded.push(line); mergedHeader = true; break;
          }

          // Check if the next line (or line after preprocessor) continues the condition
          // This handles cases where preprocessor directives are in the middle of conditions
          let isMultiLineCondition = false;
          if (nextTrimmed.startsWith('`')) {
            // Look at what comes after the preprocessor block
            const postPreprocIdx = nextExecutableLine(nxt);
            if (postPreprocIdx < lines.length) {
              const postPreprocLine = lines[postPreprocIdx].trim();
              if (/^(&&|\|\||&(?!&)|\|(?!\|))/.test(postPreprocLine)) {
                isMultiLineCondition = true;
              }
            }
          }

          if (isMultiLineCondition) {
            expanded.push(line); mergedHeader = true; break;
          }

          // Check if this is a complete condition:
          // - For 'if' and 'else if': must have balanced parentheses (closing paren for the if condition)
          // - For 'else': always complete
          let hasCompleteCondition = false;
          if (/\belse\b/.test(line) && !/\bif\b/.test(line)) {
            hasCompleteCondition = true;
          } else if (/\bif\b/.test(line)) {
            // Check if parentheses are balanced
            const afterIf = line.substring(line.indexOf('if') + 2);
            let parenCount = 0;
            for (let char of afterIf) {
              if (char === '(') parenCount++;
              else if (char === ')') parenCount--;
            }
            hasCompleteCondition = (parenCount === 0);
          }

          // Skip wrapping if this is an if/else-if with incomplete condition
          if (!hasCompleteCondition) {
            expanded.push(line); mergedHeader = true; break;
          }

          // If next line is a preprocessor directive and we have a complete condition,
          // look past the preprocessor block to find the actual executable line
          let executableLineIdx = nxt;
          if (nextTrimmed.startsWith('`') || nextTrimmed.startsWith('//')) {
            executableLineIdx = nextExecutableLine(nxt);
            // If nextExecutableLine returns -1, it means we hit another control structure
            // Leave this line unchanged
            if (executableLineIdx === -1) {
              expanded.push(line); mergedHeader = true; break;
            }
          }

          const execLine = executableLineIdx < lines.length ? lines[executableLineIdx].trim() : '';          // Case 1: next (or post-preprocessor) line is standalone begin
          if (/^begin(\s*\/\/.*)?$/.test(execLine)) {
            const beginCommentMatch = execLine.match(/^begin(\s*\/\/.*)?$/);
            const beginComment = beginCommentMatch && beginCommentMatch[1]? beginCommentMatch[1].trim():'';
            const comments: string[] = [];
            if (headerComment) comments.push(headerComment.replace(/\/\/\s?/, '').trim());
            if (beginComment) comments.push(beginComment.replace(/\/\/\s?/, '').trim());
            const mergedComment = comments.filter(Boolean).join(' ');
            expanded.push(hp.rewrite(m, beginComment, mergedComment));
            i = executableLineIdx; mergedHeader = true; break;
          }
          // Case 2: next line is a simple statement (not a control structure keyword, not begin/end)
          else if (!execLine.startsWith('for ') &&
                   !execLine.startsWith('if ') &&
                   !execLine.startsWith('else ') &&
                   !execLine.startsWith('case') &&
                   !execLine.startsWith('begin') &&
                   !execLine.startsWith('end')) {
            // Multi-line if/else without begin: wrap the simple statement
            const indent = m[1];
            expanded.push(hp.rewrite(m, '', ''));

            // If we skipped over comments/preprocessor directives, output them with proper indentation
            if (executableLineIdx > nxt) {
              for (let j = nxt; j < executableLineIdx; j++) {
                const intermediateLine = lines[j];
                const intermediateTrimmed = intermediateLine.trim();
                // Re-indent intermediate lines to be inside the if/else block
                if (intermediateTrimmed !== '') {
                  expanded.push(indent + unit + intermediateTrimmed);
                } else {
                  expanded.push(intermediateLine);
                }
              }
            }

            expanded.push(indent + unit + execLine);
            expanded.push(indent + 'end');
            i = executableLineIdx; mergedHeader = true; break;
          } else {
            // Leave unchanged if body is a control structure (will be handled in next iteration)
            expanded.push(line); mergedHeader = true; break;
          }
        } else {
          // leave unchanged if no more lines
          expanded.push(line); mergedHeader = true; break;
        }
      }
    }
    if (mergedHeader) continue;
    expanded.push(line);
  }

  // Second pass: merge 'end' with following 'else' or 'else if' to create 'end else begin'
  const chained: string[] = [];
  for (let i = 0; i < expanded.length; i++) {
    const line = expanded[i];
    const trimmed = line.trim();

    // Check if this is an 'end' line followed by 'else' or 'else if'
    if (/^\s*end\s*$/.test(line) || /^\s*end\s*\/\//.test(line)) {
      // Look ahead for 'else' or 'else if'
      let foundElse = false;
      for (let j = i + 1; j < expanded.length; j++) {
        const nextTrimmed = expanded[j].trim();
        if (nextTrimmed === '') continue; // skip blank lines

        if (/^else\s+if\b.*\bbegin\b/.test(nextTrimmed)) {
          // Merge: end + else if ... begin
          const indent = (line.match(/^(\s*)/)?.[1]) || '';
          const endComment = line.match(/end\s*(\/\/.*)$/)?.[1] || '';
          // Normalize spacing in "else if ... begin"
          const normalizedElseIf = nextTrimmed.replace(/^else\s+if\b/, 'else if').replace(/\s*\bbegin\b/, ' begin');
          chained.push(indent + 'end ' + normalizedElseIf + (endComment ? ' ' + endComment : ''));
          i = j; // skip the else if line
          foundElse = true;
          break;
        } else if (/^else\b.*\bbegin\b/.test(nextTrimmed)) {
          // Merge: end + else begin
          const indent = (line.match(/^(\s*)/)?.[1]) || '';
          const endComment = line.match(/end\s*(\/\/.*)$/)?.[1] || '';
          // Extract everything after "else" and reconstruct
          const elseMatch = nextTrimmed.match(/^else\b(.*)$/);
          const afterElse = elseMatch ? elseMatch[1].trim() : 'begin';
          const space = String.fromCharCode(32); // explicit space character
          const merged = indent + 'end' + space + 'else' + space + afterElse + (endComment ? space + endComment : '');
          chained.push(merged);
          i = j; // skip the else line
          foundElse = true;
          break;
        } else {
          // Not an else, stop looking
          break;
        }
      }

      if (!foundElse) {
        chained.push(line);
      }
      continue;
    }

    chained.push(line);
  }

  // Third pass: indent contents of each header block (if/else if/else/for/always/initial/generate) and case items
  interface Block { headerIndent: string; type: 'if' | 'case' | 'case-item' | 'for' | 'always' | 'generate'; }
  const stack: Block[] = [];
  const result: string[] = [];
  for (let i = 0; i < chained.length; i++) {
    let line = chained[i];

    // Track generate blocks
    const generateMatch = line.match(/^(\s*)generate\b.*$/);
    if (generateMatch) {
      const currentIndent = generateMatch[1];
      stack.push({ headerIndent: currentIndent, type: 'generate' });
      result.push(line);
      continue;
    }

    // Track endgenerate
    if (/^\s*endgenerate\b/.test(line)) {
      // Pop generate from stack
      while (stack.length > 0 && stack[stack.length - 1].type !== 'generate') {
        stack.pop(); // pop any unclosed blocks
      }
      if (stack.length > 0 && stack[stack.length - 1].type === 'generate') {
        const generateBlock = stack.pop()!;
        result.push(generateBlock.headerIndent + 'endgenerate');
      } else {
        result.push(line);
      }
      continue;
    }

    // Track always/initial blocks with begin
    const alwaysMatch = line.match(/^(\s*)(?:always|initial)\b.*\bbegin\b.*$/);
    if (alwaysMatch) {
      const currentIndent = alwaysMatch[1];
      stack.push({ headerIndent: currentIndent, type: 'always' });
      result.push(line);
      continue;
    }

    // Track case statements
    if (/^\s*case[xz]?\b/.test(line)) {
      const currentIndent = (line.match(/^(\s*)/)?.[1]) || '';
      stack.push({ headerIndent: currentIndent, type: 'case' });
      result.push(line);
      continue;
    }

    // Track for loops with begin
    const forMatch = line.match(/^(\s*)for\s*\(.*\)\s*begin\b/);
    if (forMatch) {
      const currentIndent = forMatch[1];
      let correctIndent = currentIndent; // default: keep current indent

      if (stack.length > 0) {
        const parent = stack[stack.length - 1];
        // For loop should be indented inside parent block
        correctIndent = parent.headerIndent + unit;
      }

      const rebuilt = correctIndent + line.trim();
      stack.push({ headerIndent: correctIndent, type: 'for' });
      result.push(rebuilt);
      continue;
    }

    // Track case items (STATE_NAME: begin, {1'b1, ...}: begin, default: begin)
    if (/^\s*(\{[^}]+\}|\S+)\s*:\s*begin\b/.test(line) || /^\s*default\s*:\s*begin\b/.test(line)) {
      const currentIndent = (line.match(/^(\s*)/)?.[1]) || '';
      stack.push({ headerIndent: currentIndent, type: 'case-item' });
      result.push(line);
      continue;
    }

    // Track endcase
    if (/^\s*endcase\b/.test(line)) {
      // Pop case from stack
      while (stack.length > 0 && stack[stack.length - 1].type !== 'case') {
        stack.pop(); // pop any unclosed case items
      }
      if (stack.length > 0 && stack[stack.length - 1].type === 'case') {
        const caseBlock = stack.pop()!;
        result.push(caseBlock.headerIndent + 'endcase');
      } else {
        result.push(line);
      }
      continue;
    }

    const headerMatch = line.match(/^(\s*)(?:if|else\s+if|else)\b.*\bbegin\b.*$/);
    if (headerMatch) {
      const isIf = /^\s*if\b/.test(line.trim());
      const currentIndent = headerMatch[1];
      let correctIndent = currentIndent; // default: keep current indent

      if (stack.length > 0) {
        const parent = stack[stack.length - 1];
        if (isIf) {
          // Nested 'if' should be indented inside parent block
          correctIndent = parent.headerIndent + unit;
        } else {
          // 'else' or 'else if' should align with its matching 'if' at the same level
          correctIndent = parent.headerIndent;
        }
      }

      const rebuilt = correctIndent + line.trim();
      stack.push({ headerIndent: correctIndent, type: 'if' });
      result.push(rebuilt);
      continue;
    }

    // Handle "end else begin" pattern (merged by enforceIfBlocks)
    const endElseMatch = line.match(/^(\s*)end\s+(else(?:\s+if\b.*)?)\s+begin\b.*$/);
    if (endElseMatch) {
      if (stack.length) {
        const closingBlock = stack.pop()!; // pop the if block being closed
        const closingIndent = closingBlock.headerIndent; // get the if block's indent
        const elsepart = endElseMatch[2]; // "else" or "else if (...)"

        // Output "end else begin" with proper indentation (else aligns with the closed if)
        result.push(closingIndent + 'end ' + elsepart + ' begin');

        // Push the new else block onto stack
        stack.push({ headerIndent: closingIndent, type: 'if' });
      } else {
        result.push(line);
      }
      continue;
    }

    const endMatch = line.match(/^(\s*)end\b.*$/); // plain end (no longer merging with else)
    if (endMatch) {
      if (stack.length) {
        const closingBlock = stack.pop()!; // pop block being closed
        const closingIndent = closingBlock.headerIndent; // always align to header indent
        const commentPart = line.match(/end(.*)$/)?.[1] || '';
        const trimmedComment = commentPart.replace(/^\s*/, '');
        const aligned = closingIndent + 'end' + (trimmedComment ? ' ' + trimmedComment : '');
        result.push(aligned);
      } else {
        result.push(line);
      }
      continue;
    }
    if (stack.length && line.trim() !== '') {
      const top = stack[stack.length - 1];
      const existingIndent = (line.match(/^(\s*)/) || ['', ''])[1];
      // Skip indenting structural keywords
      const isEndLine = /^\s*end\b/.test(line);
      const isCaseKeyword = /^\s*case[xz]?\b/.test(line);
      const isEndCase = /^\s*endcase\b/.test(line);
      const isCaseItem = /^\s*(\{[^}]+\}|\S+)\s*:\s*begin\b/.test(line) || /^\s*default\s*:\s*begin\b/.test(line);
      const isIfElseHeader = /^\s*(?:if|else\s+if|else)\b.*\bbegin\b/.test(line);
      const isForHeader = /^\s*for\s*\(.*\)\s*begin\b/.test(line);
      const isAlwaysHeader = /^\s*(?:always|initial)\b.*\bbegin\b/.test(line);
      const isGenerateHeader = /^\s*generate\b/.test(line);
      const isEndGenerate = /^\s*endgenerate\b/.test(line);

      // Re-indent regular statements to be one level deeper than the current block header
      if (!isEndLine && !isCaseKeyword && !isEndCase && !isCaseItem && !isIfElseHeader && !isForHeader && !isAlwaysHeader && !isGenerateHeader && !isEndGenerate) {
        const expectedIndent = top.headerIndent + unit;
        line = expectedIndent + line.trim();
      }
    }
    result.push(line);
  }
  return result;
}

export function enforceForLoopBlocks(lines: string[], indentSize: number): string[] {
  const unit = ' '.repeat(indentSize);
  function nextNonBlank(idx: number): number { while (idx < lines.length && lines[idx].trim() === '') idx++; return idx; }
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();

    // Single-line for loop: for (...) statement;
    const singleFor = line.match(/^(\s*)for\s*\((.*)\)\s+([^;]+);(\s*\/\/.*)?$/);
    if (singleFor && !/\bbegin\b/.test(line)) {
      const indent = singleFor[1];
      const condition = singleFor[2].trim();
      const stmt = singleFor[3].trim();
      const cmt = singleFor[4] ? ' ' + singleFor[4].trim() : '';
      result.push(indent + 'for (' + condition + ') begin' + cmt);
      result.push(indent + unit + stmt + ';');
      result.push(indent + 'end');
      continue;
    }

    // For loop followed by if statement: for (...) if (...) ...
    const forIf = line.match(/^(\s*)for\s*\((.*)\)\s+(if\b.*)$/);
    if (forIf && !/\bbegin\b/.test(line.substring(0, line.indexOf('if')))) {
      const indent = forIf[1];
      const condition = forIf[2].trim();
      const ifPart = forIf[3].trim();
      result.push(indent + 'for (' + condition + ') begin');
      result.push(indent + unit + ifPart);
      // Track depth of the if statement content only
      // Start at 1 if the if has begin, 0 otherwise
      const ifHasBegin = /\bbegin\b/.test(ifPart);
      let depth = ifHasBegin ? 1 : 0;
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j];
        const nextTrimmed = nextLine.trim();
        if (/\bbegin\b/.test(nextTrimmed) && !/\/\/.*\bbegin\b/.test(nextLine)) {
          depth++;
        }
        if (/^\s*end\b/.test(nextLine) && !/\/\/.*\bend\b/.test(nextLine)) {
          if (depth === 0) {
            // No open blocks in if content - we're done
            result.push(indent + 'end');
            i = j - 1; // Don't skip the outer end
            break;
          }
          depth--;
          if (depth === 0) {
            // Closed all if content blocks - add the content's end
            result.push(nextLine);
            // Now close the for loop
            result.push(indent + 'end');
            i = j; // skip to this line
            break;
          }
        }
        result.push(nextLine);
        j++;
      }
      continue;
    }

    // For loop header without begin where next line is standalone begin
    const forHeader = line.match(/^(\s*)for\s*\((.*)\)(\s*\/\/.*)?$/);
    if (forHeader && !/\bbegin\b/.test(line)) {
      const indent = forHeader[1];
      const condition = forHeader[2].trim();
      const headerComment = forHeader[3];
      const nxt = nextNonBlank(i + 1);

      if (nxt < lines.length) {
        const nextLine = lines[nxt];
        const nextTrimmed = nextLine.trim();

        // Case 1: next line is standalone begin
        if (/^begin(\s*\/\/.*)?$/.test(nextTrimmed)) {
          const beginCommentMatch = nextTrimmed.match(/^begin(\s*\/\/.*)?$/);
          const beginComment = beginCommentMatch && beginCommentMatch[1] ? beginCommentMatch[1].trim() : '';
          const comments: string[] = [];
          if (headerComment) comments.push(headerComment.replace(/\/\/\s?/, '').trim());
          if (beginComment) comments.push(beginComment.replace(/\/\/\s?/, '').trim());
          const mergedComment = comments.filter(Boolean).join(' ');
          result.push(indent + 'for (' + condition + ') begin' + (mergedComment ? ' // ' + mergedComment : ''));
          i = nxt; // skip the begin line
          continue;
        }
        // Case 2: next line is a simple statement (not a control structure keyword, not begin/end)
        else if (!nextTrimmed.startsWith('for ') &&
                 !nextTrimmed.startsWith('if ') &&
                 !nextTrimmed.startsWith('else ') &&
                 !nextTrimmed.startsWith('case') &&
                 !nextTrimmed.startsWith('begin') &&
                 !nextTrimmed.startsWith('end')) {
          // Multi-line for loop without begin: wrap the simple statement
          result.push(indent + 'for (' + condition + ') begin' + (headerComment || ''));
          result.push(indent + unit + nextTrimmed);
          result.push(indent + 'end');
          i = nxt; // skip the statement line
          continue;
        }
      }
    }

    result.push(line);
  }

  return result;
}
