/**
 * Always block indentation module
 *
 * Handles indentation for always/always_ff/always_comb/always_latch blocks
 */

export function indentAlwaysBlocks(lines: string[], indentSize: number): string[] {
  const unit = ' '.repeat(indentSize);
  const result: string[] = [];
  let insideAlways = false;
  let alwaysIndent = '';
  let insideCase = false;
  let beginEndStack: string[] = []; // Stack to track begin/end pairs

  // First pass: merge 'end' and 'else' on same line when inside always blocks
  const mergedLines: string[] = [];
  let tempInsideAlways = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track always blocks
    if (/^\s*always(?:_ff|_comb|_latch)?\b/.test(line)) {
      tempInsideAlways = true;
      mergedLines.push(line);
      continue;
    }

    // Check if always block ends
    if (tempInsideAlways && /^\s*end\b/.test(line) && !/\belse\b/.test(line)) {
      // Look ahead for 'else' or 'else if' on next non-empty line
      let nextElseIndex = -1;
      let hasIfdefBetween = false;

      for (let j = i + 1; j < lines.length; j++) {
        const nextTrimmed = lines[j].trim();
        if (nextTrimmed === '') continue; // Skip empty lines

        // If we encounter an ifdef directive, don't merge
        if (/^`(ifdef|ifndef|elsif|else|endif)/.test(nextTrimmed)) {
          hasIfdefBetween = true;
          break;
        }

        // If we find else, mark it for merging (only if no ifdef between)
        if (/^\s*else\b/.test(lines[j])) {
          nextElseIndex = j;
        }
        break; // Stop at first non-empty line
      }

      if (nextElseIndex !== -1 && !hasIfdefBetween) {
        // Merge 'end' with 'else' on same line (only if no ifdef between)
        const elseLine = lines[nextElseIndex];
        const elseContent = elseLine.trim();
        const endIndent = (line.match(/^(\s*)/)?.[1]) || '';
        mergedLines.push(endIndent + 'end ' + elseContent);
        i = nextElseIndex; // Skip the else line since we merged it
        continue;
      }
    }

    // Check if this is the final 'end' that closes the always block
    if (tempInsideAlways && /^\s*end\b/.test(line) && i === lines.length - 1) {
      tempInsideAlways = false;
    }

    mergedLines.push(line);
  }

  // Second pass: perform normal indentation on merged lines
  let expectSingleStatement = false; // Track if next line should be indented for single-statement block
  let singleStatementDepth = 0; // Track depth of nested single-statement blocks

  for (let i = 0; i < mergedLines.length; i++) {
    const line = mergedLines[i];
    const trimmed = line.trim();

    // Handle ifdef directives - pass through but maintain always block tracking
    if (/^`(ifdef|ifndef|elsif|else|endif)/.test(trimmed)) {
      // If inside always block, indent the ifdef to match
      if (insideAlways && !insideCase) {
        // Calculate proper indent based on stack depth (not affected by expectSingleStatement)
        let nestingLevel = beginEndStack.length;
        const ifdefIndent = alwaysIndent + unit.repeat(nestingLevel);
        // Always apply the calculated indentation for ifdef directives
        result.push(ifdefIndent + trimmed);
        // Reset expectSingleStatement for ifdef directives
        expectSingleStatement = false;
      } else {
        result.push(line);
      }
      continue;
    }

    // Detect always block start (always, always_ff, always_comb, always_latch)
    if (/^\s*always(?:_ff|_comb|_latch)?\b/.test(line)) {
      alwaysIndent = (line.match(/^(\s*)/)?.[1]) || '';
      insideAlways = true;
      beginEndStack = [];

      // Check if this line also has 'begin' on it
      if (/\bbegin\b/.test(trimmed)) {
        beginEndStack.push('begin');
      } else {
        // No begin on same line - next non-empty line should be indented as single statement
        expectSingleStatement = true;
      }

      result.push(line);
      continue;
    }

    // Track begin/end with a stack when inside always block
    if (insideAlways && !insideCase) {
      // FIRST: Check for 'end' keyword and pop from stack BEFORE calculating indentation
      let hasEnd = false;
      if (/^\s*end\b/.test(line) || /\bend\b\s+else/.test(line)) {
        // If line contains 'end else begin', handle the end first
        if (/\bend\b\s+else\s+begin\b/.test(line)) {
          if (beginEndStack.length > 0) {
            beginEndStack.pop();
            hasEnd = true;
          }
        } else {
          // Regular end - pop from stack
          if (beginEndStack.length > 1) {
            // Pop from stack - this end closes a nested begin
            beginEndStack.pop();
            hasEnd = true;
          } else if (beginEndStack.length === 1) {
            // Stack has only 1 item (the always begin) - this end closes the always block
            insideAlways = false;
            result.push(line);
            continue;
          } else {
            // Stack is empty - this shouldn't happen but handle it
            insideAlways = false;
            result.push(line);
            continue;
          }
        }
      }

      // Check if this is an 'else', 'if', or 'for' statement
      // These should be at the same level as their corresponding block
      const isElse = /^\s*else\b/.test(line) || /\bend\s+else\b/.test(line);
      const isIf = /^\s*if\s*\(/.test(trimmed) || /\belse\s+if\s*\(/.test(trimmed);
      const isFor = /^\s*for\s*\(/.test(trimmed);

      // SECOND: Calculate indentation based on CURRENT stack depth (after popping end)
      let nestingLevel = beginEndStack.length + singleStatementDepth;

      // If we're NOT expecting a single statement but depth > 0, we've exited single-statement blocks
      if (!expectSingleStatement && singleStatementDepth > 0) {
        singleStatementDepth = 0;
        nestingLevel = beginEndStack.length;
        
        // If we're in an always block without begin/end and all single statements are done, exit the always block
        if (insideAlways && beginEndStack.length === 0) {
          insideAlways = false;
        }
      }

      // If we're expecting a single statement (from previous if/else/for/always without begin), add one more level
      if (expectSingleStatement && !isElse) {
        nestingLevel++;
        // Increment single statement depth
        singleStatementDepth++;
        // Don't reset yet - if this is an if/for, it will set expectSingleStatement again
        // Only reset for simple statements
        if (!isIf && !isFor) {
          expectSingleStatement = false;
        }
      }

      // Else statements are at the same level as their if, which is the current stack depth
      // (The if pushed a begin, then end popped it, so we're back to the if's level)

      const currentLineIndent = alwaysIndent + unit.repeat(nestingLevel);

      // THIRD: Check for 'begin' keyword and push to stack AFTER calculating indentation
      // This happens for lines like "else begin" or "else if (...) begin" or "for (...) begin"
      const hasBegin = /\bbegin\b/.test(trimmed);
      if (hasBegin) {
        beginEndStack.push('begin');
        expectSingleStatement = false; // Reset if we have a begin
      } else if (isIf || isElse || isFor) {
        // If/else/for without begin - next line should be a single statement needing extra indent
        expectSingleStatement = true;
      }

      // Format the line with the calculated indentation
      if (trimmed !== '') {
        // Normalize spacing around assignment operators (but not for for loops)
        let normalizedTrimmed = trimmed;
        if (!/^\s*for\s*\(/.test(trimmed) && !/^\s*assign\b/.test(trimmed)) {
          // Add spaces around = (but not ==, !=, <=, >=, and not for assign statements)
          normalizedTrimmed = normalizedTrimmed.replace(/([^=!<>])\s*=\s*([^=])/g, '$1 = $2');
          // Add spaces around <= (but not <<=)
          normalizedTrimmed = normalizedTrimmed.replace(/([^<])\s*<=\s*/g, '$1 <= ');
        }
        
        const newLine = currentLineIndent + normalizedTrimmed;
        result.push(newLine);
        continue;
      }
    }

    // Detect case statement start
    if (insideAlways && /^case[xz]?\b/.test(trimmed)) {
      insideCase = true;
    }

    // Detect end of case statement
    if (insideCase && /^endcase\b/.test(trimmed)) {
      insideCase = false;
      result.push(line);
      continue;
    }

    // Indent content inside always block, but skip case statement content
    if (insideAlways && !insideCase && trimmed !== '') {
      // Calculate indentation based on stack depth
      // Stack depth represents how many begins we're inside
      const nestingLevel = beginEndStack.length;
      const newIndent = alwaysIndent + unit.repeat(nestingLevel);
      const newLine = newIndent + trimmed;
      result.push(newLine);
    } else {
      result.push(line);
    }
  }

  return result;
}
