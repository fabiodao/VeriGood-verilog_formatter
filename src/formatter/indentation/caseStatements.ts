/**
 * Case statement indentation module
 * 
 * Handles indentation for case/casex/casez statements and their items
 */

export function indentCaseStatements(lines: string[], indentSize: number): string[] {
  const unit = ' '.repeat(indentSize);
  const result: string[] = [];
  const caseStack: { caseIndent: string; inCaseItem: boolean; caseItemIndent: string; }[] = [];

  // Track if/begin/end depth to properly handle nested structures within case items
  let blockDepth = 0;
  const blockDepthAtCaseStart: number[] = [];

  // Stack to track indentation levels for if/begin blocks
  const indentStack: string[] = [];

  // Track if we're in a multi-line if statement waiting for begin
  let inMultiLineIf = false;
  let multiLineIfIndent = '';

  // Track when we adjust indentation, to adjust following continuation lines
  let lastIndentAdjustment = 0;

  // Track if we're inside an always block to properly indent top-level case statements
  let alwaysBlockIndent = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const currentIndent = (line.match(/^(\s*)/)?.[1]) || '';

    // Track always block indentation
    if (/^\s*always(?:_ff|_comb|_latch)?\b/.test(line)) {
      alwaysBlockIndent = currentIndent + unit;
    }
    if (alwaysBlockIndent && /^\s*endmodule\b/.test(line)) {
      alwaysBlockIndent = '';
    }

    // Safety: prevent blockDepth from going negative
    if (blockDepth < 0) blockDepth = 0;

    // When not inside a case statement, pass through lines unchanged
    // (enforceIfBlocks has already handled proper indentation for if/for blocks)
    if (caseStack.length === 0 && !/^\s*case[xz]?\b/.test(line)) {
      result.push(line);
      lastIndentAdjustment = 0;

      // Track blockDepth and indentStack for knowing proper indentation when we enter case statements
      // Handle "end else begin" - this opens a new block context
      if (/\bend\s+else\s+begin\b/.test(line) && !/\/\/.*\bend\s+else\s+begin\b/.test(line)) {
        blockDepth++; // The 'end' decreases by 1, but 'begin' increases by 1, net is 0, but we track the begin
        // Push the indentation for content inside this else block
        const elseBlockIndent = currentIndent + unit;
        indentStack.push(elseBlockIndent);
      } else {
        // Track individual begin/end
        if (/\bbegin\b/.test(line) && !/\/\/.*\bbegin\b/.test(line)) {
          blockDepth++;
          // Push indentation for content inside this begin block
          const beginBlockIndent = currentIndent + unit;
          indentStack.push(beginBlockIndent);
        }
        if (/^\s*end\b/.test(line) && !/\/\/.*\bend\b/.test(line)) {
          blockDepth--;
          // Pop indentation when we close a block
          if (indentStack.length > 0) {
            indentStack.pop();
          }
        }
      }
      continue;
    }

    // Passthrough module-level declarations (wire/reg/logic/input/output) when not in any case/always structure
    if (caseStack.length === 0 && blockDepth === 0 && /^\s*(wire|reg|logic|input|output|inout)\b/.test(line)) {
      result.push(line);
      lastIndentAdjustment = 0; // Reset tracking
      continue;
    }

    // Handle continuation lines: if previous line had indentation adjusted, and this line has
    // significantly more indentation, adjust it by the same amount
    if (caseStack.length === 0 && blockDepth === 0 && lastIndentAdjustment !== 0) {
      if (currentIndent.length > unit.length * 2 && trimmed !== '') {
        // This is a continuation line - adjust by the same amount as the previous line
        const adjustedIndent = ' '.repeat(currentIndent.length + lastIndentAdjustment);
        result.push(adjustedIndent + trimmed);
        continue; // Keep the adjustment for next line
      } else {
        // Not a continuation line - reset adjustment
        lastIndentAdjustment = 0;
      }
    }

    // Detect case statement start: case, casex, casez
    if (/^\s*case[xz]?\b/.test(line)) {
      // Track block depth before processing case
      if (/\bbegin\b/.test(trimmed) && !/\/\/.*\bbegin\b/.test(line)) {
        blockDepth++;
      }

      // For nested cases, calculate the proper indent based on current context
      // Default to using indentStack if available (for case inside if/else blocks)
      // Otherwise use current indent (for top-level case)
      let properIndent = indentStack.length > 0 ? indentStack[indentStack.length - 1] : currentIndent;

      // If properIndent is empty or too short (likely a bug in indentStack), fall back to currentIndent or alwaysBlockIndent
      if (properIndent.length === 0 && caseStack.length === 0) {
        // Top-level case with empty indentStack - use current indentation or always block indentation
        properIndent = currentIndent.length > 0 ? currentIndent : (alwaysBlockIndent || currentIndent);
      }

      // If case has no indentation but we're inside an always block AND indentStack is empty or short,
      // use always block indent (only if indentStack doesn't have better information)
      if (currentIndent.length === 0 && alwaysBlockIndent && caseStack.length === 0 &&
          (indentStack.length === 0 || properIndent.length < alwaysBlockIndent.length)) {
        properIndent = alwaysBlockIndent;
      }

      if (caseStack.length > 0) {
        // This is a nested case
        // If we have indentStack content, use it (case is inside if/else blocks)
        // Otherwise, calculate based on parent case indentation
        if (indentStack.length === 0) {
          // No if/else blocks - calculate from parent case
          const parentCase = caseStack[caseStack.length - 1];
          const parentBlockDepth = blockDepthAtCaseStart[blockDepthAtCaseStart.length - 1];

          // Base indent for nested case (case + 2 units for case item content)
          properIndent = parentCase.caseIndent + unit + unit;

          // Add extra indentation for each additional block level (if/begin blocks)
          const extraBlockLevels = blockDepth - parentBlockDepth - 1; // -1 because the case item begin is expected
          if (extraBlockLevels > 0) {
            properIndent += unit.repeat(extraBlockLevels);
          }
        }
        // else: use properIndent from indentStack (already set above)
      }

      caseStack.push({
        caseIndent: properIndent,
        inCaseItem: false,
        caseItemIndent: properIndent + unit
      });
      blockDepthAtCaseStart.push(blockDepth);
      const outputLine = properIndent + trimmed;
      result.push(outputLine);
      continue;
    }

    // Detect endcase
    if (/^\s*endcase\b/.test(line) && caseStack.length > 0) {
      const caseInfo = caseStack.pop()!;
      blockDepthAtCaseStart.pop();
      result.push(caseInfo.caseIndent + 'endcase');

      // Store the indent for the 'end' after endcase (it should align with the always/initial block)
      // The case statement is indented one level from the always block
      // So the always block is one level back from the case
      const alwaysIndent = caseInfo.caseIndent.length >= unit.length
        ? caseInfo.caseIndent.substring(0, caseInfo.caseIndent.length - unit.length)
        : '';

      if (indentStack.length > 0) {
        // Clear the indent stack and push the always block indent
        indentStack.length = 0;
      }
      indentStack.push(alwaysIndent);

      // Track block depth after endcase
      if (/^\s*end\b/.test(line) && !/\/\/.*\bend\b/.test(line)) {
        blockDepth--;
      }
      continue;
    }

    // Handle 'end' statement immediately after endcase (closes the always/initial block)
    if (/^\s*end\b/.test(line) && !/\/\/.*\bend\b/.test(line) && caseStack.length === 0 && indentStack.length > 0) {
      // Check if previous non-blank line was endcase
      let prevWasEndcase = false;
      for (let j = result.length - 1; j >= 0; j--) {
        const prevLine = result[j].trim();
        if (prevLine === '') continue;
        if (/^endcase\b/.test(prevLine)) {
          prevWasEndcase = true;
        }
        break;
      }

      if (prevWasEndcase) {
        blockDepth--;
        const poppedIndent = indentStack.pop();
        // Use the popped indent which now contains the always block indent
        let endIndent = poppedIndent || '';
        result.push(endIndent + 'end');
        continue;
      }
    }

    // Inside a case statement
    if (caseStack.length > 0) {
      const caseInfo = caseStack[caseStack.length - 1];

      // Detect case item: identifier/constant followed by colon
      // Examples: STATE_NAME: begin, 3'b001: begin, {1'b1, 1'b0}: begin, default: begin
      // Also handle single-line case items without begin: 2'b00: result = value;
      const isCaseItemWithBegin = /^\s*(\{[^}]+\}|[\w']+(?:,\s*[\w']+)*)\s*:\s*begin\b/.test(line) || /^\s*default\s*:\s*begin\b/.test(line);
      const isCaseItemSingleLine = /^\s*(\{[^}]+\}|[\w']+(?:,\s*[\w']+)*)\s*:\s*[^:]+$/.test(line) || /^\s*default\s*:\s*[^:]+$/.test(line);

      if (isCaseItemWithBegin || isCaseItemSingleLine) {
        // Case item should be indented by one level from case
        caseInfo.inCaseItem = true;
        // Normalize spacing around assignment operators (but not for for loops or assign statements)
        let normalizedTrimmed = trimmed;
        if (!/^\s*for\s*\(/.test(trimmed) && !/^\s*assign\b/.test(trimmed)) {
          normalizedTrimmed = normalizedTrimmed.replace(/([^=!<>])\s*=\s*([^=])/g, '$1 = $2');
          normalizedTrimmed = normalizedTrimmed.replace(/([^<])\s*<=\s*/g, '$1 <= ');
        }
        result.push(caseInfo.caseItemIndent + normalizedTrimmed);

        // If it has begin, next lines should be indented further
        if (/\bbegin\b/.test(trimmed) && !/\/\/.*\bbegin\b/.test(line)) {
          blockDepth++;
          const contentIndent = caseInfo.caseIndent + unit + unit;
          indentStack.push(contentIndent);
        }
        continue;
      }

      // Detect case item end: plain 'end' that closes the case item block
      // Also match end with comments like "end // case: ..."
      if (/^\s*end\s*$/.test(line) || /^\s*end\s+[A-Z_]/.test(line) || /^\s*end\s*\/\//.test(line)) {
        // Check if this is a case item end by looking ahead for next case item or endcase
        let isCaseItemEnd = false;
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();
          // Skip blank lines and comments
          if (nextLine === '' || /^\/\//.test(nextLine)) continue;
          if (/^(\{[^}]+\}|[\w']+)\s*:\s*/.test(nextLine) || /^default\s*:\s*/.test(nextLine) || /^endcase\b/.test(nextLine)) {
            isCaseItemEnd = true;
          }
          break;
        }

        if (isCaseItemEnd) {
          blockDepth--;
          indentStack.pop();
          // end keyword should be at the same level as the case item
          result.push(caseInfo.caseItemIndent + trimmed);
          continue;
        } else {
          blockDepth--;
          // Not a case item end, so it's an if/else/begin end
          const poppedIndent = indentStack.pop();
          const endIndent = indentStack.length > 0 ? indentStack[indentStack.length - 1] : (caseInfo.caseIndent + unit + unit);
          result.push(endIndent + trimmed);
          continue;
        }
      }

      // For content inside case items: indent by two levels from case (one from case + one from case item)
      // Expected base indent for content is case + 2 levels
      const expectedContentIndent = caseInfo.caseIndent + unit + unit;

      // Handle if/else/end keywords specially - they need proper indentation within case context
      if (/^\s*if\b/.test(line)) {
        // The if should be at the current indent level from stack
        const ifIndent = indentStack.length > 0 ? indentStack[indentStack.length - 1] : expectedContentIndent;
        result.push(ifIndent + trimmed);

        // If has begin, increase indent stack for next lines
        if (/\bbegin\b/.test(trimmed) && !/\/\/.*\bbegin\b/.test(line)) {
          blockDepth++;
          indentStack.push(ifIndent + unit);
        }
        continue;
      }      // Check for "end else" BEFORE checking for plain "end" (only inside case statements)
      if (/^\s*end\s+else\b/.test(line) && caseStack.length > 0) {
        // "end" closes the if block, "else" should align with the closed if
        blockDepth--;
        const poppedIndent = indentStack.pop();
        const elseIndent = indentStack.length > 0 ? indentStack[indentStack.length - 1] : expectedContentIndent;

        // Extract the parts and reconstruct with proper spacing
        const match = trimmed.match(/^end\s+(else(?:\s+if\b.*)?(?:\s+begin\b.*)?)$/);
        if (match) {
          const elsePart = match[1];
          // Ensure there's exactly one space between "end" and "else"
          result.push(elseIndent + 'end ' + elsePart);
        } else {
          result.push(elseIndent + trimmed);
        }

        // If has begin, push indent for next lines
        if (/\bbegin\b/.test(trimmed) && !/\/\/.*\bbegin\b/.test(line)) {
          blockDepth++;
          indentStack.push(elseIndent + unit);
        }
        continue;
      }

      if (/^\s*else\b/.test(line) && caseStack.length > 0) {
        // else should align with its corresponding if
        // The if is at the current stack level, so else should be too
        const elseIndent = indentStack.length > 0 ? indentStack[indentStack.length - 1] : expectedContentIndent;
        result.push(elseIndent + trimmed);

        // If has begin, push indent for next lines
        if (/\bbegin\b/.test(trimmed) && !/\/\/.*\bbegin\b/.test(line)) {
          blockDepth++;
          indentStack.push(elseIndent + unit);
        }
        continue;
      }

      if (/^\s*end\b/.test(line)) {
        // Check if this is a case item end
        let isCaseItemEnd = false;
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();
          if (nextLine === '') continue;
          if (/^(\{[^}]+\}|[\w']+)\s*:\s*/.test(nextLine) || /^default\s*:\s*/.test(nextLine) || /^endcase\b/.test(nextLine)) {
            isCaseItemEnd = true;
          }
          break;
        }

        if (!isCaseItemEnd) {
          // This is an end for an if/else/begin block
          blockDepth--;
          const poppedIndent = indentStack.pop();
          const endIndent = indentStack.length > 0 ? indentStack[indentStack.length - 1] : expectedContentIndent;
          result.push(endIndent + 'end');
          continue;
        }
      }

      // For regular content: use current indent from stack
      if (trimmed !== '') {
        const contentIndent = indentStack.length > 0 ? indentStack[indentStack.length - 1] : expectedContentIndent;
        // Normalize spacing around assignment operators (but not for for loops or assign statements)
        let normalizedTrimmed = trimmed;
        if (!/^\s*for\s*\(/.test(trimmed) && !/^\s*assign\b/.test(trimmed)) {
          normalizedTrimmed = normalizedTrimmed.replace(/([^=!<>])\s*=\s*([^=])/g, '$1 = $2');
          normalizedTrimmed = normalizedTrimmed.replace(/([^<])\s*<=\s*/g, '$1 <= ');
        }
        result.push(contentIndent + normalizedTrimmed);

        // Check if this line has 'begin' - if so, push to indentStack
        // This handles cases like continuation lines of multi-line if that end with 'begin'
        if (/\bbegin\b/.test(trimmed) && !/\/\/.*\bbegin\b/.test(line)) {
          blockDepth++;
          indentStack.push(contentIndent + unit);
        }

        continue;
      }
    } else {
      // Not in a case statement - track if/else/begin blocks for proper indentation

      // Check for "end else" BEFORE checking for plain "end"
      if (/^\s*end\s+else\b/.test(line)) {
        // "end" closes the if block, "else" should align with the closed if
        blockDepth--;
        const poppedIndent = indentStack.pop();
        // Use the parent level from stack, or derive from current line's base indent
        let elseIndent = '';
        if (indentStack.length > 0) {
          elseIndent = indentStack[indentStack.length - 1];
        } else if (poppedIndent) {
          // If stack is empty but we popped something, the else should be one level less than popped
          elseIndent = poppedIndent.length >= unit.length ? poppedIndent.substring(0, poppedIndent.length - unit.length) : '';
        }

        // Extract the parts and reconstruct with proper spacing
        const match = trimmed.match(/^end\s+(else(?:\s+if\b.*)?(?:\s+begin\b.*)?)$/);
        if (match) {
          const elsePart = match[1];
          result.push(elseIndent + 'end ' + elsePart);
        } else {
          result.push(elseIndent + trimmed);
        }

        // If has begin, push indent for next lines
        if (/\bbegin\b/.test(trimmed) && !/\/\/.*\bbegin\b/.test(line)) {
          blockDepth++;
          indentStack.push(elseIndent + unit);
        }
        continue;
      }

      // Handle if with begin on same line (only inside case statements)
      if (/^\s*if\b.*\bbegin\b/.test(line) && caseStack.length > 0) {
        const ifIndent = indentStack.length > 0 ? indentStack[indentStack.length - 1] : currentIndent;
        result.push(ifIndent + trimmed);
        blockDepth++;
        indentStack.push(ifIndent + unit);
        inMultiLineIf = false; // Reset if we were tracking multi-line
        continue;
      }

      // Handle multi-line if (without begin on same line) (only inside case statements)
      if (/^\s*if\b/.test(line) && !/^\s*`if/.test(line) && !/\bbegin\b/.test(line) && !/\/\/.*\bif\b/.test(line) && caseStack.length > 0) {
        const ifIndent = indentStack.length > 0 ? indentStack[indentStack.length - 1] : currentIndent;
        result.push(ifIndent + trimmed);
        // Track that we're in a multi-line if - wait for the begin
        inMultiLineIf = true;
        multiLineIfIndent = ifIndent;
        continue;
      }

      // Handle continuation lines of multi-line if (lines that don't start with a keyword)
      // Reset multi-line if tracking if we encounter an assign statement (it's not a continuation of if)
      if (inMultiLineIf && /^\s*assign\b/.test(line)) {
        inMultiLineIf = false;
      }

      if (inMultiLineIf && !/^\s*(if|else|begin|end|case|endcase|`)\b/.test(line)) {
        // This is a continuation line (e.g., "|| condition")
        result.push(multiLineIfIndent + trimmed);
        // Check if this line has begin - if so, end the multi-line if tracking
        if (/\bbegin\b/.test(trimmed) && !/\/\/.*\bbegin\b/.test(line)) {
          blockDepth++;
          indentStack.push(multiLineIfIndent + unit);
          inMultiLineIf = false;
        }
        continue;
      }

      // Handle else with begin
      if (/^\s*else\b.*\bbegin\b/.test(line)) {
        const elseIndent = indentStack.length > 0 ? indentStack[indentStack.length - 1] : currentIndent;
        result.push(elseIndent + trimmed);
        blockDepth++;
        indentStack.push(elseIndent + unit);
        inMultiLineIf = false; // Reset if we were tracking multi-line
        continue;
      }

      // Handle standalone begin (e.g., after multi-line if condition)
      if (/^\s*begin\b/.test(line) && !/\/\/.*\bbegin\b/.test(line)) {
        const beginIndent = indentStack.length > 0 ? indentStack[indentStack.length - 1] : (inMultiLineIf ? multiLineIfIndent : currentIndent);
        result.push(beginIndent + 'begin');
        blockDepth++;
        indentStack.push(beginIndent + unit);
        inMultiLineIf = false; // End multi-line if tracking
        continue;
      }

      // Handle plain end (only inside case statements)
      if (/^\s*end\b/.test(line) && !/\/\/.*\bend\b/.test(line) && caseStack.length > 0) {
        blockDepth--;
        if (indentStack.length > 0) {
          const poppedIndent = indentStack.pop();
          let endIndent = '';
          if (indentStack.length > 0) {
            endIndent = indentStack[indentStack.length - 1];
          } else if (poppedIndent) {
            // Stack is empty, derive indent from popped level
            endIndent = poppedIndent.length >= unit.length ? poppedIndent.substring(0, poppedIndent.length - unit.length) : '';
          }
          result.push(endIndent + 'end');
          continue;
        }
      }

      // For other lines, use indent from stack if available (only inside case statements)
      if (trimmed !== '' && indentStack.length > 0 && caseStack.length > 0) {
        const newIndent = indentStack[indentStack.length - 1];
        // Track indentation adjustment for continuation lines
        if (caseStack.length === 0 && blockDepth === 0) {
          lastIndentAdjustment = newIndent.length - currentIndent.length;
        }
        result.push(newIndent + trimmed);
        continue;
      }
    }

    result.push(line);
    lastIndentAdjustment = 0; // Reset for lines that fall through
  }

  return result;
}
