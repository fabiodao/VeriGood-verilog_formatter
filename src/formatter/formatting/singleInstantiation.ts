/**
 * Single instantiation formatting helper
 *
 * Formats a single module instantiation (handles parameters and ports)
 */

export function formatSingleInstantiation(lines: string[], baseIndent: string, unit: string): string[] {
  // Determine if this is a parameterized instantiation by checking the first line
  const firstLine = lines[0].trim();
  const hasParams = /^[A-Za-z_][A-Za-z0-9_]*\s+#/.test(firstLine);

  // Parse the instantiation structure manually line by line
  interface ParsedLine {
    type: 'module_start' | 'param_start' | 'param' | 'param_end' | 'inst_start' | 'port' | 'inst_end' | 'directive' | 'comma' | 'blank';
    content: string;
    port?: string;
    conn?: string;
    comment?: string;
    originalLines?: string[]; // For multiline port connections
    hadComma?: boolean; // Track if original parameter/port had a trailing comma
    maxSignalLen?: number; // Max signal length for this port's concatenation
  }

  const parsed: ParsedLine[] = [];
  let moduleName = '';
  let instanceName = '';
  let state: 'init' | 'in_params' | 'between' | 'in_ports' = 'init';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (state === 'init') {
      // First line: module_name #(
      const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+#\s*\(/);
      if (m) {
        moduleName = m[1];
        parsed.push({ type: 'param_start', content: trimmed });
        state = 'in_params';
        continue;
      }
      // Or: module_name # (without opening paren on same line)
      const m_hash = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+#\s*$/);
      if (m_hash) {
        moduleName = m_hash[1];
        // Don't add to parsed yet - wait for the opening paren line
        // This will be handled when we see the '(' line below
        parsed.push({ type: 'module_start', content: trimmed });
        state = 'in_params'; // Expecting parameter list to start
        continue;
      }
      // Or simple: module_name instance_name (
      const m2 = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
      if (m2) {
        moduleName = m2[1];
        instanceName = m2[2];
        parsed.push({ type: 'inst_start', content: trimmed });
        state = 'in_ports';
        continue;
      }
      // Or just module_name without instance (instance will be on next line)
      const m3 = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)$/);
      if (m3 && i + 1 < lines.length) {
        moduleName = m3[1];
        // Look ahead to see if next line has instance_name (
        const nextTrimmed = lines[i + 1].trim();
        const m4 = nextTrimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
        if (m4) {
          // Found instance on next line - will be combined in output
          instanceName = m4[1];
          i++; // Skip the next line since we're processing it now
          parsed.push({ type: 'inst_start', content: trimmed + ' ' + nextTrimmed });
          state = 'in_ports';
          continue;
        }
      }
    }

    if (state === 'in_params') {
      // Check if this is the opening paren for parameters (when module_name # was on previous line)
      if (/^\s*\(\s*$/.test(trimmed) && parsed.length > 0 && parsed[parsed.length - 1].type === 'module_start') {
        parsed.push({ type: 'param_start', content: trimmed });
        continue;
      }
      // Check for end of parameters: line with ) possibly followed by instance_name (
      if (/^\s*\)/.test(trimmed)) {
        parsed.push({ type: 'param_end', content: trimmed });
        // Check if instance name is on the same line: ) instance_name (
        const sameLineInst = trimmed.match(/^\)\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
        if (sameLineInst) {
          instanceName = sameLineInst[1];
          parsed.push({ type: 'inst_start', content: sameLineInst[0] });
          state = 'in_ports';
        } else {
          // Check if instance name is on the same line without (: ) instance_name
          const instNameOnly = trimmed.match(/^\)\s*([A-Za-z_][A-Za-z0-9_]*)\s*$/);
          if (instNameOnly) {
            instanceName = instNameOnly[1];
            // Will transition to inst_start when we see the opening paren
          }
          state = 'between';
        }
        continue;
      }
      // Check for parameter connection: .PORT(value) with optional comma and comment
      if (/^\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/.test(trimmed)) {
        // Try to match single-line parameter first: .port_name(value), // optional comment
        // But first check if parentheses are balanced
        let parenCount = 0;
        let hasClosingParen = false;
        for (const ch of trimmed) {
          if (ch === '(') parenCount++;
          if (ch === ')') {
            parenCount--;
            if (parenCount === 0) {
              hasClosingParen = true;
              break;
            }
          }
        }

        if (hasClosingParen) {
          // Parentheses are balanced - can treat as single-line
          const pm = trimmed.match(/^\.([A-Za-z_][A-Za-z0-9_]*)\s*\((.*?)\)\s*(,?)\s*(\/\/.*)?$/);
          if (pm) {
            parsed.push({
              type: 'param',
              content: trimmed,
              port: pm[1],
              conn: pm[2].trim(),
              comment: pm[4] ? pm[4].trim() : undefined,
              hadComma: pm[3] === ',' // Track if original had comma
            });
            continue;
          }
        }

        // If no closing ) or unbalanced parens, this is a multiline parameter connection
        // Collect all lines until we find the closing )
        const paramName = trimmed.match(/^\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/)?.[1];
        if (paramName) {
          const multilineLines: string[] = [line]; // Keep original line with indentation
          let foundClosing = false;
          let parenDepth = 1; // We've seen one opening (

          // Count remaining parens on first line
          const firstLineAfterParam = trimmed.substring(trimmed.indexOf('(') + 1);
          for (const ch of firstLineAfterParam) {
            if (ch === '(') parenDepth++;
            if (ch === ')') parenDepth--;
          }

          if (parenDepth === 0) {
            // Found closing on first line - shouldn't reach here as pm would have matched
            foundClosing = true;
          }

          // Continue collecting lines until we find matching closing paren
          let j = i + 1;
          while (j < lines.length && !foundClosing) {
            const nextLine = lines[j];
            multilineLines.push(nextLine);

            // Count parens on this line
            for (const ch of nextLine) {
              if (ch === '(') parenDepth++;
              if (ch === ')') {
                parenDepth--;
                if (parenDepth === 0) {
                  foundClosing = true;
                  break;
                }
              }
            }
            j++;
          }

          if (foundClosing) {
            // Check if this is a simple single-value connection split across lines
            // Pattern: .param (value\n)
            // If only 2 lines and second line is just ")" or "),", treat as single-line
            const isSimpleSplit = multilineLines.length === 2 &&
                                  multilineLines[1].trim().match(/^\)\s*,?\s*$/);

            if (isSimpleSplit) {
              // Extract the value from first line and combine onto one line
              const valueMatch = multilineLines[0].match(/^\.([A-Za-z_][A-Za-z0-9_]*)\s*\((.*)$/);
              if (valueMatch) {
                const port = valueMatch[1];
                const value = valueMatch[2].trim();
                const hasComma = multilineLines[1].includes(',');
                parsed.push({
                  type: 'param',
                  content: `.${port} (${value})${hasComma ? ',' : ''}`,
                  port: port,
                  conn: value,
                  comment: undefined
                });
                i = j - 1;
                continue;
              }
            }

            // Store the multiline parameter as a single entry with original lines preserved
            // Calculate max signal length for THIS parameter's concatenation
            let paramMaxSignalLen = 0;

            // Check the first line for the first value
            const firstLine = multilineLines[0].trim();
            // Match signal, numeric literal (including hex like 4'hf), or expression in parentheses
            const firstLineMatch = firstLine.match(/^\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+[\da-fA-F_]+|\([^)]+\))\s*[,}]/);
            if (firstLineMatch && firstLineMatch[2].length > paramMaxSignalLen) {
              paramMaxSignalLen = firstLineMatch[2].length;
            }

            // Check continuation lines for values
            for (const origLine of multilineLines) {
              const trimmed = origLine.trim();
              if (trimmed.startsWith('`') || trimmed.startsWith('//')) continue;

              // Match signal, numeric literal (including hex like 4'hf), or expression in parentheses
              const signalMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+[\da-fA-F_]+|\([^)]+\))\s*[,}]/);
              if (signalMatch && signalMatch[1].length > paramMaxSignalLen) {
                paramMaxSignalLen = signalMatch[1].length;
              }
              const replicationMatch = trimmed.match(/^(\{[^}]+\{[^}]+\}\})/);
              if (replicationMatch && replicationMatch[1].length > paramMaxSignalLen) {
                paramMaxSignalLen = replicationMatch[1].length;
              }
              const doubleReplicationMatch = trimmed.match(/^(\{\{[^}]+\{[^}]+\}\})/);
              if (doubleReplicationMatch && doubleReplicationMatch[1].length > paramMaxSignalLen) {
                paramMaxSignalLen = doubleReplicationMatch[1].length;
              }
            }

            parsed.push({
              type: 'param',
              content: '', // Will be reconstructed during output
              port: paramName,
              conn: 'MULTILINE', // Marker for multiline
              originalLines: multilineLines,
              maxSignalLen: paramMaxSignalLen // Store max signal length for this parameter
            });

            i = j - 1; // Continue from after the last line we consumed
            continue;
          }
        }
      }
      // Check for directives
      if (/^`(ifn?def|else|endif)/.test(trimmed)) {
        parsed.push({ type: 'directive', content: trimmed });
        continue;
      }
      // Check for comment lines
      if (/^\/\//.test(trimmed)) {
        parsed.push({ type: 'directive', content: trimmed });
        continue;
      }
      // Check for standalone comma
      if (trimmed === ',') {
        parsed.push({ type: 'comma', content: trimmed });
        continue;
      }
      // Blank line
      if (trimmed === '') {
        parsed.push({ type: 'blank', content: trimmed });
        continue;
      }
    }

    if (state === 'between') {
      // Instance name line: instance_name( or instance_name[range](
      const im = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?)\s*\(/);
      if (im) {
        instanceName = im[1];
        parsed.push({ type: 'inst_start', content: trimmed });
        state = 'in_ports';
        continue;
      }
      // Or just opening paren (instance name was already captured from previous line)
      if (/^\s*\(\s*$/.test(trimmed) && instanceName) {
        parsed.push({ type: 'inst_start', content: trimmed });
        state = 'in_ports';
        continue;
      }
    }

    if (state === 'in_ports') {
      // Check for end of ports: );
      if (/^\s*\)\s*;\s*$/.test(trimmed)) {
        parsed.push({ type: 'inst_end', content: trimmed });
        break;
      }
      // Check for port connection: .PORT(value) with optional comma and comment
      if (/^\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/.test(trimmed)) {
        // Try to match single-line port first: .port_name(value), // optional comment
        // But first check if parentheses are balanced
        let parenCount = 0;
        let hasClosingParen = false;
        for (const ch of trimmed) {
          if (ch === '(') parenCount++;
          if (ch === ')') {
            parenCount--;
            if (parenCount === 0) {
              hasClosingParen = true;
              break;
            }
          }
        }

        if (hasClosingParen) {
          // Parentheses are balanced - can treat as single-line
          const pm = trimmed.match(/^\.([A-Za-z_][A-Za-z0-9_]*)\s*\((.*?)\)\s*(,?)\s*(\/\/.*)?$/);
          if (pm) {
            parsed.push({
              type: 'port',
              content: trimmed,
              port: pm[1],
              conn: pm[2].trim(),
              comment: pm[4] ? pm[4].trim() : undefined,
              hadComma: pm[3] === ',' // Track if original had comma
            });
            continue;
          }
        }

        // If no closing ) or unbalanced parens, this is a multiline port connection
        // Collect all lines until we find the closing )
        const portName = trimmed.match(/^\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/)?.[1];
        if (portName) {
          const multilineLines: string[] = [line]; // Keep original line with indentation
          let foundClosing = false;
          let parenDepth = 1; // We've seen one opening (

          // Count remaining parens on first line
          const firstLineAfterPort = trimmed.substring(trimmed.indexOf('(') + 1);
          for (const ch of firstLineAfterPort) {
            if (ch === '(') parenDepth++;
            if (ch === ')') parenDepth--;
          }

          if (parenDepth === 0) {
            // Found closing on first line - shouldn't reach here as pm would have matched
            foundClosing = true;
          }

          // Continue collecting lines until we find matching closing paren
          let j = i + 1;
          while (j < lines.length && !foundClosing) {
            const nextLine = lines[j];
            multilineLines.push(nextLine);

            // Count parens on this line
            for (const ch of nextLine) {
              if (ch === '(') parenDepth++;
              if (ch === ')') {
                parenDepth--;
                if (parenDepth === 0) {
                  foundClosing = true;
                  break;
                }
              }
            }
            j++;
          }

          if (foundClosing) {
            // Check if this is a simple single-value connection split across lines
            // Pattern: .port (value\n)
            // If only 2 lines and second line is just ")" or "),", treat as single-line
            const isSimpleSplit = multilineLines.length === 2 &&
                                  multilineLines[1].trim().match(/^\)\s*,?\s*$/);

            if (isSimpleSplit) {
              // Extract the value from first line and combine onto one line
              const valueMatch = multilineLines[0].match(/^\.([A-Za-z_][A-Za-z0-9_]*)\s*\((.*)$/);
              if (valueMatch) {
                const port = valueMatch[1];
                const value = valueMatch[2].trim();
                const hasComma = multilineLines[1].includes(',');
                parsed.push({
                  type: 'port',
                  content: `.${port} (${value})${hasComma ? ',' : ''}`,
                  port: port,
                  conn: value,
                  comment: undefined
                });
                i = j - 1;
                continue;
              }
            }

            // Store the multiline port as a single entry with original lines preserved
            // Calculate max signal length for THIS port's concatenation
            let portMaxSignalLen = 0;

            // Check the first line for the first signal
            const firstLine = multilineLines[0].trim();
            const firstLineMatch = firstLine.match(/^\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+[\da-fA-F_]+)\s*[,}]/);
            if (firstLineMatch && firstLineMatch[2].length > portMaxSignalLen) {
              portMaxSignalLen = firstLineMatch[2].length;
            }
            const firstLineContinuedMatch = firstLine.match(/^\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?)\s*$/);
            if (firstLineContinuedMatch && firstLineContinuedMatch[2].length > portMaxSignalLen) {
              portMaxSignalLen = firstLineContinuedMatch[2].length;
            }
            const nestedFirstMatch = firstLine.match(/^\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\{(\{[^,}]+|[a-zA-Z_][a-zA-Z0-9_\[\]\-:]+|\d+'\w+[\da-fA-F_]+)\s*[,}]/);
            if (nestedFirstMatch && nestedFirstMatch[2].length > portMaxSignalLen) {
              portMaxSignalLen = nestedFirstMatch[2].length;
            }

            // Check continuation lines for signals
            for (const origLine of multilineLines) {
              const trimmed = origLine.trim();
              if (trimmed.startsWith('`') || trimmed.startsWith('//')) continue;

              const signalMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+[\da-fA-F_]+)\s*[,}]/);
              if (signalMatch && signalMatch[1].length > portMaxSignalLen) {
                portMaxSignalLen = signalMatch[1].length;
              }
              const commaLeftMatch = trimmed.match(/^,\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+[\da-fA-F_]+)(?:\s*,|\s*$)?/);
              if (commaLeftMatch && commaLeftMatch[1].length > portMaxSignalLen) {
                portMaxSignalLen = commaLeftMatch[1].length;
              }
              const expressionWithBracesMatch = trimmed.match(/^(.+})\s*}+\s*\)[\),]?\s*$/);
              if (expressionWithBracesMatch && expressionWithBracesMatch[1].trim().length > portMaxSignalLen) {
                portMaxSignalLen = expressionWithBracesMatch[1].trim().length;
              }
              const replicationMatch = trimmed.match(/^(\{[^}]+\{[^}]+\}\})/);
              if (replicationMatch && replicationMatch[1].length > portMaxSignalLen) {
                portMaxSignalLen = replicationMatch[1].length;
              }
              const doubleReplicationMatch = trimmed.match(/^(\{\{[^}]+\{[^}]+\}\})/);
              if (doubleReplicationMatch && doubleReplicationMatch[1].length > portMaxSignalLen) {
                portMaxSignalLen = doubleReplicationMatch[1].length;
              }
              const nestedMatch = trimmed.match(/^(\{[a-zA-Z_][a-zA-Z0-9_\[\]\-:]+)\s*[,}]/);
              if (nestedMatch && nestedMatch[1].length > portMaxSignalLen) {
                portMaxSignalLen = nestedMatch[1].length;
              }
            }

            parsed.push({
              type: 'port',
              content: '', // Will be reconstructed during output
              port: portName,
              conn: 'MULTILINE', // Marker for multiline
              originalLines: multilineLines,
              maxSignalLen: portMaxSignalLen // Store max signal length for this port
            });
            i = j - 1; // Continue from after the last line we consumed
            continue;
          }
        }
      }
      // Check for directives
      if (/^`(ifn?def|else|endif)/.test(trimmed)) {
        parsed.push({ type: 'directive', content: trimmed });
        continue;
      }
      // Check for comment lines
      if (/^\/\//.test(trimmed)) {
        parsed.push({ type: 'directive', content: trimmed });
        continue;
      }
      // Check for standalone comma
      if (trimmed === ',') {
        parsed.push({ type: 'comma', content: trimmed });
        continue;
      }
      // Blank line
      if (trimmed === '') {
        parsed.push({ type: 'blank', content: trimmed });
        continue;
      }
    }
  }

  // Now format the parsed structure
  const result: string[] = [];

  // Find all parameters and ports to calculate alignment
  const params = parsed.filter(p => p.type === 'param' && p.port);
  const ports = parsed.filter(p => p.type === 'port' && p.port);
  const maxParamPort = params.length > 0 ? Math.max(...params.map(p => p.port!.length)) : 0;
  const maxParamConn = params.length > 0 ? Math.max(...params.filter(p => p.conn !== 'MULTILINE').map(p => p.conn!.length)) : 0;
  const maxPortPort = ports.length > 0 ? Math.max(...ports.map(p => p.port!.length)) : 0;
  const maxPortConn = ports.length > 0 ? Math.max(...ports.filter(p => p.conn !== 'MULTILINE').map(p => p.conn!.length)) : 0;

  // Generate formatted output
  const hasParameters = parsed.some(p => p.type === 'param_start' || p.type === 'module_start');

  if (hasParameters) {
    // Check if module_name and # are separate from the opening paren
    const hasModuleStart = parsed.some(p => p.type === 'module_start');
    if (hasModuleStart) {
      result.push(baseIndent + moduleName + ' #');
      result.push(baseIndent + unit + '(');
    } else {
      result.push(baseIndent + moduleName + ' #(');
    }

    // First pass for parameters: find the longest content across ALL parameters
    let globalMaxParamSignalLen = 0; // For concatenation signals
    let globalMaxParamContentLen = 0; // For all parameter content (including expressions)

    for (let i = 0; i < parsed.length; i++) {
      const p = parsed[i];
      if (p.type === 'param_end') break;

      if (p.type === 'param' && p.conn !== undefined) {
        if (p.conn === 'MULTILINE' && p.originalLines) {
          // Check if this is a concatenation by looking at first line
          const firstLineTrimmed = p.originalLines[0].trim();
          const isConcatenation = /\(\{/.test(firstLineTrimmed);

          // For non-concatenation multiline params, include first line content in length calculation
          if (!isConcatenation) {
            // Extract just the content after the opening paren
            const contentMatch = firstLineTrimmed.match(/\((.+)$/);
            if (contentMatch) {
              let firstLineContent = contentMatch[1].trim();
              // Strip inline comments
              firstLineContent = firstLineContent.replace(/\/\/.*$/, '').trim();
              // Skip if it's a directive
              if (!firstLineContent.startsWith('`')) {
                if (firstLineContent.length > globalMaxParamContentLen) {
                  globalMaxParamContentLen = firstLineContent.length;
                }
              }
            }
          }

          // Scan all lines in multiline parameter
          for (let lineIdx = 0; lineIdx < p.originalLines.length; lineIdx++) {
            const origLine = p.originalLines[lineIdx];
            const trimmed = origLine.trim();

            // Skip opening, closing, and directive lines
            if (lineIdx === 0 ||
                trimmed.match(/^\)\s*,?\s*$/) ||
                trimmed.match(/^}\s*\)\s*,?\s*$/) ||
                trimmed.startsWith('`')) {
              continue;
            }

            if (isConcatenation) {
              // For concatenations, track signal name length (including numeric literals like 8'd0, 4'hf and array indices like signal[0])
              const signalMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+[\da-fA-F_]+)\s*[,}]/);
              if (signalMatch && signalMatch[1].length > globalMaxParamSignalLen) {
                globalMaxParamSignalLen = signalMatch[1].length;
              }
              // Check for replication patterns like {COUNT{signal}}
              const replicationMatch = trimmed.match(/^(\{[^}]+\{[^}]+\}\})/);
              if (replicationMatch && replicationMatch[1].length > globalMaxParamSignalLen) {
                globalMaxParamSignalLen = replicationMatch[1].length;
              }
              // Check for double-opening replication like {{COUNT{signal}}
              const doubleReplicationMatch = trimmed.match(/^(\{\{[^}]+\{[^}]+\}\})/);
              if (doubleReplicationMatch && doubleReplicationMatch[1].length > globalMaxParamSignalLen) {
                globalMaxParamSignalLen = doubleReplicationMatch[1].length;
              }
              // Check for nested concatenations like {signal[bit]
              const nestedMatch = trimmed.match(/^(\{[a-zA-Z_][a-zA-Z0-9_\[\]\-:]+)\s*[,}]/);
              if (nestedMatch && nestedMatch[1].length > globalMaxParamSignalLen) {
                globalMaxParamSignalLen = nestedMatch[1].length;
              }
            } else {
              // For expressions, track actual content length
              // Strip comments first, then closing paren/comma before measuring
              let content = trimmed;
              // Remove inline comments (//...)
              content = content.replace(/\/\/.*$/, '').trim();
              // Remove closing paren/comma
              content = content.replace(/\s*\)\s*,?\s*$/, '').trim();
              const contentLen = content.length;
              if (contentLen > globalMaxParamContentLen) {
                globalMaxParamContentLen = contentLen;
              }
            }
          }
        } else if (p.conn !== 'MULTILINE') {
          // Single-line parameter
          const contentLen = p.conn.length;
          if (contentLen > globalMaxParamContentLen) {
            globalMaxParamContentLen = contentLen;
          }
        }
      }
    }

    // Calculate unified closing parenthesis column for parameters
    // All closing `)` should be at the same column
    // For concatenations: continuationIndent + maxSignalLen + 1 (for }), then ) is next position
    // continuationIndent = (baseIndent + unit).length + 1 + maxParamPort + 3 (for " ({")
    // So ) is at: (baseIndent + unit).length + 1 + maxParamPort + 3 + maxSignalLen + 1
    const paramContentIndent = (baseIndent + unit).length + 1 + maxParamPort + 2; // Position where content starts: "." + name + " ("
    const paramConcatContinuationIndent = (baseIndent + unit).length + 1 + maxParamPort + 3; // For concatenations: "." + name + " ({"
    const paramClosingParenCol = Math.max(
      paramContentIndent + maxParamConn,  // Single-line parameters
      paramConcatContinuationIndent + (globalMaxParamSignalLen > 0 ? globalMaxParamSignalLen + 1 : 0),  // Multiline concatenations (+1 for })
      paramContentIndent + globalMaxParamContentLen  // Multiline expressions
    );

    // Parameters - Two-pass approach for comment alignment
    // First pass: Build parameter lines without comments and collect comment info
    interface ParamLineInfo {
      line: string;
      comment: string;
      isMultiline: boolean;
      lineIndex?: number; // for multiline params
      isConcatenation?: boolean; // for multiline params - distinguishes concat from expression
    }
    const paramLineInfos: ParamLineInfo[] = [];

    for (let i = 0; i < parsed.length; i++) {
      const p = parsed[i];
      if (p.type === 'param_end') break;
      if (p.type === 'param_start') continue;

      if (p.type === 'param' && p.port && p.conn !== undefined) {
        // Check if this is a multiline parameter
        if (p.conn === 'MULTILINE' && p.originalLines && p.maxSignalLen !== undefined) {
          // Multiline parameter
          const portPadded = p.port.padEnd(maxParamPort);
          let paramContinuationIndent = ' '.repeat((baseIndent + unit).length + 1 + maxParamPort + 2); // Default: align with " ("
          let isConcatenation = false;
          const paramMaxSignalLen = p.maxSignalLen; // Use per-parameter max signal length (like ports do)

          for (let lineIdx = 0; lineIdx < p.originalLines.length; lineIdx++) {
            const origLine = p.originalLines[lineIdx];
            const origTrimmed = origLine.trim();

            // Special handling: check if this is a directive with closing paren BEFORE extracting comments
            // Pattern: `endif ), or `endif // comment ), or `endif // comment })
            let hasDirectiveWithClosing = false;
            let directivePart = '';
            let closingPart = '';
            if (/^`(ifn?def|else|endif)/.test(origTrimmed)) {
              // Match: directive + optional (whitespace + // + comment without parens/braces) + closing paren/brace
              const directiveMatch = origTrimmed.match(/^(`(?:ifdef|ifndef|else|endif)(?:\s+\/\/[^\)\}]+)?)\s*([\)\}]+\s*,?\s*)$/);
              if (directiveMatch) {
                hasDirectiveWithClosing = true;
                directivePart = directiveMatch[1];
                closingPart = directiveMatch[2];
              }
            }

            // Extract comment from this line (but only if we haven't already identified a directive with closing)
            let lineWithoutComment = origLine;
            let lineComment = '';
            if (!hasDirectiveWithClosing) {
              const commentMatch = origLine.match(/(.*?)(\/\/.*)$/);
              lineWithoutComment = commentMatch ? commentMatch[1].trimEnd() : origLine;
              lineComment = commentMatch ? commentMatch[2] : '';
            }

            if (hasDirectiveWithClosing) {
              // Directive followed by closing paren: split them
              // Output the directive on its own line
              paramLineInfos.push({ line: paramContinuationIndent + directivePart.trim(), comment: '', isMultiline: true, lineIndex: lineIdx });
              // Then output the closing paren line, aligned to paramClosingParenCol
              const hasComma = closingPart.includes(',');
              const closingStr = hasComma ? '),' : ')';
              // Position the ) at paramClosingParenCol + 1 (one space after content)
              const paddingNeeded = Math.max(0, paramClosingParenCol + 1 - (baseIndent + unit).length - 1); // +1 for space after content, -1 for the ) itself
              const closingLine = baseIndent + unit + ' '.repeat(paddingNeeded) + closingStr;
              paramLineInfos.push({ line: closingLine, comment: '', isMultiline: true, lineIndex: lineIdx });
            } else if (lineIdx === 0) {
              // First line: check what type of parameter this is
              const trimmedWithoutComment = lineWithoutComment.trim();

              // Type 1: Concatenation pattern ".PARAM ({value ," (value can be signal name, array index, numeric literal like 4'hf, or expression in parentheses)
              const concatMatch = trimmedWithoutComment.match(/^\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+[\da-fA-F_]+|\([^)]+\))\s*(.*)$/);
              if (concatMatch) {
                isConcatenation = true;
                paramContinuationIndent = ' '.repeat((baseIndent + unit).length + 1 + maxParamPort + 3); // +3 for " ({" to position after the {
                const paramName = concatMatch[1];
                const firstValue = concatMatch[2];
                const remainder = concatMatch[3].trim();
                const paramPadded = paramName.padEnd(maxParamPort);
                let formattedRemainder = remainder;
                if (remainder.startsWith(',')) {
                  // For first line: value is after ({, continuation lines start at column 13 with {value
                  // To align commas, we need to add padding so the comma aligns with continuation lines
                  // Continuation lines: column 13 + {value + padding = comma at column 36
                  // First line: after ({ + value + padding should also put comma at same column
                  // Since continuation indent is now at column 13 (after {), and continuation values include {,
                  // we don't subtract 1 anymore
                  const spacesBeforeComma = Math.max(0, paramMaxSignalLen - firstValue.length);
                  const padding = spacesBeforeComma > 0 ? ' '.repeat(spacesBeforeComma) : '';
                  formattedRemainder = padding + remainder;
                }
                const baseLine = baseIndent + unit + '.' + paramPadded + ' ({' + firstValue + formattedRemainder;
                paramLineInfos.push({ line: baseLine, comment: lineComment, isMultiline: true, lineIndex: lineIdx, isConcatenation: true });
              } else {
                // Type 2: Mathematical expression or other complex value
                // ".PARAM (expression" or ".PARAM (8 +" etc
                const exprMatch = trimmedWithoutComment.match(/^\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*)$/);
                if (exprMatch) {
                  isConcatenation = false;
                  const paramName = exprMatch[1];
                  const exprStart = exprMatch[2];
                  const paramPadded = paramName.padEnd(maxParamPort);
                  // Continuation indent aligns with first character after "("
                  paramContinuationIndent = ' '.repeat((baseIndent + unit).length + 1 + maxParamPort + 2); // +1 for ".", +2 for " ("
                  const baseLine = baseIndent + unit + '.' + paramPadded + ' (' + exprStart;
                  paramLineInfos.push({ line: baseLine, comment: lineComment, isMultiline: true, lineIndex: lineIdx, isConcatenation: false });
                } else {
                  // Fallback
                  paramLineInfos.push({ line: baseIndent + unit + trimmedWithoutComment, comment: lineComment, isMultiline: true, lineIndex: lineIdx });
                }
              }
            } else if (/^`(ifn?def|else|endif)/.test(origTrimmed)) {
              // Compiler directives without closing paren - align with continuation indent
              paramLineInfos.push({ line: paramContinuationIndent + origTrimmed, comment: '', isMultiline: true, lineIndex: lineIdx });
            } else if (/^\/\//.test(origTrimmed)) {
              // Comment lines
              paramLineInfos.push({ line: paramContinuationIndent + origTrimmed, comment: '', isMultiline: true, lineIndex: lineIdx });
            } else if (/}\s*\),?$/.test(lineWithoutComment.trim())) {
              // Closing line like "value })," or "{replication} })," or "value})" or standalone "})"
              // Handle this BEFORE general value matching
              const trimmedWithoutComment = lineWithoutComment.trim();
              const hasComma = trimmedWithoutComment.endsWith(',');

              // Try to match simple value (signal name or numeric literal)
              const simpleValueMatch = trimmedWithoutComment.match(/^([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+[\da-fA-F_]+)\s*}+\s*\)?/);
              if (simpleValueMatch) {
                const valueName = simpleValueMatch[1];
                // MIMIC PORT LOGIC: Step 1 - Align } at paramMaxSignalLen position (where commas are)
                const bracePaddingNeeded = Math.max(0, paramMaxSignalLen - valueName.length);
                const bracePadding = bracePaddingNeeded > 0 ? ' '.repeat(bracePaddingNeeded) : '';

                // MIMIC PORT LOGIC: Step 2 - Add padding after } to align ) at paramClosingParenCol
                const closingBraces = '}';
                const positionAfterBrace = paramContinuationIndent.length + valueName.length + bracePadding.length + closingBraces.length;
                const parenPaddingNeeded = Math.max(0, paramClosingParenCol - positionAfterBrace);
                const parenPadding = parenPaddingNeeded > 0 ? ' '.repeat(parenPaddingNeeded) : '';

                const baseLine = paramContinuationIndent + valueName + bracePadding + closingBraces + parenPadding + ')' + (hasComma ? ',' : '');
                paramLineInfos.push({ line: baseLine, comment: lineComment, isMultiline: true, lineIndex: lineIdx });
              } else {
                // Try to match replication pattern like {COUNT{signal}}
                const replicationMatch = trimmedWithoutComment.match(/^(\{[^}]+\{[^}]+\}\})\s*}+\s*\)?/);
                if (replicationMatch) {
                  const replicationExpr = replicationMatch[1];
                  // MIMIC PORT LOGIC: Step 1 - Align } at paramMaxSignalLen position
                  const bracePaddingNeeded = Math.max(0, paramMaxSignalLen - replicationExpr.length);
                  const bracePadding = bracePaddingNeeded > 0 ? ' '.repeat(bracePaddingNeeded) : '';

                  // MIMIC PORT LOGIC: Step 2 - Add padding after } to align ) at paramClosingParenCol
                  const closingBraces = '}';
                  const positionAfterBrace = paramContinuationIndent.length + replicationExpr.length + bracePadding.length + closingBraces.length;
                  const parenPaddingNeeded = Math.max(0, paramClosingParenCol - positionAfterBrace);
                  const parenPadding = parenPaddingNeeded > 0 ? ' '.repeat(parenPaddingNeeded) : '';

                  const baseLine = paramContinuationIndent + replicationExpr + bracePadding + closingBraces + parenPadding + ')' + (hasComma ? ',' : '');
                  paramLineInfos.push({ line: baseLine, comment: lineComment, isMultiline: true, lineIndex: lineIdx });
                } else {
                  // Standalone closing "})," or "})" - MIMIC PORT LOGIC
                  const closingBraces = '}';
                  // Step 1: Align } at paramMaxSignalLen position
                  const bracePaddingNeeded = Math.max(0, paramMaxSignalLen - closingBraces.length);
                  const bracePadding = bracePaddingNeeded > 0 ? ' '.repeat(bracePaddingNeeded) : '';

                  // Step 2: Add padding after } to align ) at paramClosingParenCol
                  const positionAfterBrace = paramContinuationIndent.length + bracePadding.length + closingBraces.length;
                  const parenPaddingNeeded = Math.max(0, paramClosingParenCol - positionAfterBrace);
                  const parenPadding = parenPaddingNeeded > 0 ? ' '.repeat(parenPaddingNeeded) : '';

                  const baseLine = paramContinuationIndent + bracePadding + closingBraces + parenPadding + ')' + (hasComma ? ',' : '');
                  paramLineInfos.push({ line: baseLine, comment: lineComment, isMultiline: true, lineIndex: lineIdx });
                }
              }
            } else {
              // Continuation lines - different handling based on content
              const trimmedWithoutComment = lineWithoutComment.trim();

              // PRIORITY 1: Check for lines ending with closing paren (before signal matching)
              if (/\)\s*,?\s*$/.test(trimmedWithoutComment)) {
                // Line with content followed by closing paren: "expression )," or "+ value )" or "P_L2_FRAME_LENGTH_WD),"
                const contentWithoutClosing = trimmedWithoutComment.replace(/\s*\)\s*,?\s*$/, '').trim();
                const hasComma = trimmedWithoutComment.endsWith(',');
                const closingStr = hasComma ? '),' : ')';

                // Position ) at paramClosingParenCol
                const contentStartCol = paramContinuationIndent.length + contentWithoutClosing.length;
                const paddingNeeded = Math.max(0, paramClosingParenCol - contentStartCol);
                const baseLine = paramContinuationIndent + contentWithoutClosing + ' '.repeat(paddingNeeded) + closingStr;
                paramLineInfos.push({ line: baseLine, comment: lineComment, isMultiline: true, lineIndex: lineIdx });
              } else {
              // PRIORITY 2: Check if this is a signal name, numeric literal, or expression in a concatenation (followed by comma or closing brace)
              // Match: signal_name, signal_name[index], numeric literals like 8'd0 or 4'hf, or expressions in parentheses like (A-1)
              const signalMatch = trimmedWithoutComment.match(/^([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+[\da-fA-F_]+|\([^)]+\))\s*(.*)$/);
              if (signalMatch) {
                const signalName = signalMatch[1];
                const remainder = signalMatch[2].trim();
                // Only add padding if there's a comma or closing brace
                let formattedRemainder = remainder;
                if (remainder.startsWith(',') || remainder.startsWith('}')) {
                  const spacesBeforeComma = paramMaxSignalLen - signalName.length;
                  const padding = spacesBeforeComma > 0 ? ' '.repeat(spacesBeforeComma) : '';
                  formattedRemainder = padding + remainder;
                }
                const baseLine = paramContinuationIndent + signalName + formattedRemainder;
                paramLineInfos.push({ line: baseLine, comment: lineComment, isMultiline: true, lineIndex: lineIdx });
              } else {
                // Lines starting with '{' for nested concatenations or replications
                // Pattern 1: Replication like {COUNT{signal}} or double-replication {{COUNT{signal}}
                const replicationMatch = trimmedWithoutComment.match(/^(\{\{?[^}]+\{[^}]+\}\})(.*?)$/);
                if (replicationMatch) {
                  const replicationExpr = replicationMatch[1]; // e.g., "{COUNT{signal}}" or "{{COUNT{signal}}"
                  const remainder = replicationMatch[2].trim();
                  // Align commas and closing braces
                  let formattedRemainder = remainder;
                  if (remainder.startsWith(',')) {
                    const exprLength = replicationExpr.length;
                    const paddingNeeded = Math.max(0, paramMaxSignalLen - exprLength);
                    const padding = paddingNeeded > 0 ? ' '.repeat(paddingNeeded) : '';
                    formattedRemainder = padding + remainder;
                  } else if (remainder.startsWith('}')) {
                    // Closing brace(s) followed by ) - align the } but keep ) immediately after with no space
                    // Extract the closing braces and closing paren
                    const closingBraceMatch = remainder.match(/^(}+)(\s*\))(.*)$/);
                    if (closingBraceMatch) {
                      const closingBraces = closingBraceMatch[1];
                      const rest = closingBraceMatch[3]; // comma or empty
                      const exprLength = replicationExpr.length;
                      const paddingNeeded = Math.max(0, paramMaxSignalLen - exprLength);
                      const padding = paddingNeeded > 0 ? ' '.repeat(paddingNeeded) : '';
                      formattedRemainder = padding + closingBraces + ')' + rest;
                    } else {
                      // Just closing braces, no paren
                      const exprLength = replicationExpr.length;
                      const paddingNeeded = Math.max(0, paramMaxSignalLen - exprLength);
                      const padding = paddingNeeded > 0 ? ' '.repeat(paddingNeeded) : '';
                      formattedRemainder = padding + remainder;
                    }
                  }
                  const baseLine = paramContinuationIndent + replicationExpr + formattedRemainder;
                  paramLineInfos.push({ line: baseLine, comment: lineComment, isMultiline: true, lineIndex: lineIdx });
                } else {
                  // Pattern 2: Nested concatenation like {signal[bit], or {signal,
                  const nestedMatch = trimmedWithoutComment.match(/^(\{[a-zA-Z_][a-zA-Z0-9_\[\]\-:]*)(.*?)$/);
                  if (nestedMatch) {
                    const signalPart = nestedMatch[1]; // e.g., "{signal[bit]"
                    const remainder = nestedMatch[2].trim();
                    let formattedRemainder = remainder;
                    if (remainder.startsWith(',')) {
                      // Align comma - measure from opening brace to end of signal
                      const exprLength = signalPart.length;
                      const paddingNeeded = Math.max(0, paramMaxSignalLen - exprLength);
                      const padding = paddingNeeded > 0 ? ' '.repeat(paddingNeeded) : '';
                      formattedRemainder = padding + remainder;
                    }
                    const baseLine = paramContinuationIndent + signalPart + formattedRemainder;
                    paramLineInfos.push({ line: baseLine, comment: lineComment, isMultiline: true, lineIndex: lineIdx });
                  } else if (/^\s*\)\s*,?\s*$/.test(trimmedWithoutComment)) {
                    // Closing parenthesis line for mathematical expressions (line with ONLY closing paren)
                    // Align ) to paramClosingParenCol (same as concatenations and single-line)
                    const hasComma = trimmedWithoutComment.includes(',');
                    const closingStr = hasComma ? '),' : ')';
                    // Position ) at paramClosingParenCol + 1 (one space after content)
                    const paddingNeeded = Math.max(0, paramClosingParenCol + 1 - (baseIndent + unit).length - 1); // +1 for space after content, -1 for the ) itself
                    const baseLine = baseIndent + unit + ' '.repeat(paddingNeeded) + closingStr;
                    paramLineInfos.push({ line: baseLine, comment: lineComment, isMultiline: true, lineIndex: lineIdx });
                  } else if (/\)\s*,?\s*$/.test(trimmedWithoutComment)) {
                    // Line with content followed by closing paren: "expression )," or "+ value )"
                    const hasComma = trimmedWithoutComment.endsWith(',');
                    const contentWithoutClosing = trimmedWithoutComment.replace(/\s*\)\s*,?\s*$/, '').trim();
                    const closingStr = hasComma ? '),' : ')';
                    // Position ) at paramClosingParenCol
                    // Calculate: paramContinuationIndent + content + padding + closingStr
                    const contentStartCol = paramContinuationIndent.length + contentWithoutClosing.length;
                    const paddingNeeded = Math.max(0, paramClosingParenCol - contentStartCol - 1); // -1 for the ) itself
                    const baseLine = paramContinuationIndent + contentWithoutClosing + ' '.repeat(paddingNeeded) + ' ' + closingStr;
                    paramLineInfos.push({ line: baseLine, comment: lineComment, isMultiline: true, lineIndex: lineIdx });
                  } else {
                    // Mathematical expression continuation or other complex content
                    // Preserve with continuation indent
                    paramLineInfos.push({ line: paramContinuationIndent + trimmedWithoutComment, comment: lineComment, isMultiline: true, lineIndex: lineIdx });
                  }
                }
              }
              }
            }
          }
        } else {
          // Single-line parameter
          const portPadded = p.port.padEnd(maxParamPort);

          // Determine comma handling
          let comma = '';
          // Check if next non-directive/blank is param_end or if next param is inside ifdef
          let isLast = true;
          let foundDirective = false;
          for (let j = i + 1; j < parsed.length; j++) {
            if (parsed[j].type === 'param_end') break;
            if (parsed[j].type === 'directive') {
              foundDirective = true;
              continue;
            }
            if (parsed[j].type === 'param') {
              if (!foundDirective) {
                isLast = false;
              }
              break;
            }
          }

          // If there's a directive (ifdef) following, preserve original comma state
          // Otherwise, add comma based on whether this is the last param
          if (foundDirective) {
            comma = p.hadComma ? ',' : '';
          } else {
            comma = isLast ? '' : ',';
          }

          // Build base line without comment - align closing ) with multiline parameters
          const currentPos = (baseIndent + unit).length + 1 + portPadded.length + 2 + p.conn.length; // +1 for ".", +2 for " ("
          const paddingNeeded = Math.max(0, paramClosingParenCol - currentPos);
          const connPadded = p.conn + ' '.repeat(paddingNeeded);
          const baseLine = baseIndent + unit + '.' + portPadded + ' (' + connPadded + ')' + comma;

          paramLineInfos.push({ line: baseLine, comment: p.comment || '', isMultiline: false });
        }
      } else if (p.type === 'directive') {
        paramLineInfos.push({ line: baseIndent + unit + p.content, comment: '', isMultiline: false });
      } else if (p.type === 'comma') {
        // Check if the next non-blank entry is an ifdef - if so, skip this comma
        let nextIsIfdef = false;
        for (let j = i + 1; j < parsed.length; j++) {
          if (parsed[j].type === 'directive') {
            if (/^`ifdef/.test(parsed[j].content)) {
              nextIsIfdef = true;
            }
            break;
          }
          if (parsed[j].type !== 'comma') break;
        }
        if (!nextIsIfdef) {
          // Keep the comma if it's not followed by ifdef
          paramLineInfos.push({ line: baseIndent + unit + ',', comment: '', isMultiline: false });
        }
        // Skip comma if followed by ifdef
        continue;
      }
    }

    // Second pass: Calculate max line length and add aligned comments
    const maxParamLineLength = Math.max(0, ...paramLineInfos.filter(info => info.comment && !info.line.includes('//') && !info.line.includes('`')).map(info => info.line.length));

    paramLineInfos.forEach(info => {
      if (info.comment && info.comment.trim()) {
        // Add space padding to align comment
        const paddingNeeded = Math.max(1, maxParamLineLength - info.line.length + 1);
        result.push(info.line + ' '.repeat(paddingNeeded) + info.comment);
      } else {
        result.push(info.line);
      }
    });

    result.push(baseIndent + unit + ')');
    result.push(baseIndent + unit + instanceName + '(');
  } else {
    result.push(baseIndent + moduleName + ' ' + instanceName + '(');
  }

  // Ports - use double indent if module has parameters, single indent otherwise
  const portIndent = hasParameters ? baseIndent + unit + unit : baseIndent + unit;

  // Detect if we have "comma left" (", signal") or "comma right" ("signal,") concatenations
  // This is used for calculating the global closing column
  let hasCommaLeftConcat = false;
  let hasCommaRightConcat = false;
  let globalMaxSignalLen = 0;

  for (let i = 0; i < parsed.length; i++) {
    const p = parsed[i];
    if (p.type === 'port' && p.conn === 'MULTILINE' && p.originalLines) {
      // Detect comma style by checking continuation lines
      for (let lineIdx = 1; lineIdx < p.originalLines.length; lineIdx++) {
        const trimmed = p.originalLines[lineIdx].trim();
        if (trimmed.startsWith(',')) {
          hasCommaLeftConcat = true;
        } else if (!trimmed.startsWith('`') && !trimmed.startsWith('//') && /,/.test(trimmed)) {
          hasCommaRightConcat = true;
        }
      }
      // Track the maximum signal length across all ports for closing paren calculation
      if (p.maxSignalLen && p.maxSignalLen > globalMaxSignalLen) {
        globalMaxSignalLen = p.maxSignalLen;
      }
    }
  }

  // Calculate the target column for ALL closing parentheses (both single-line and multiline)
  // For single-line ports: portIndent + "." + maxPortPort + " (" + maxPortConn + ")"
  // For comma-left concatenations: continuationIndent(27) + ", "(2) + signal(30) + "})"
  // For comma-right concatenations: continuationIndent(23) + signal(36) + "})"
  const singleLineClosingCol = portIndent.length + 1 + maxPortPort + 2 + maxPortConn;  // Position where ) should be
  const commaLeftClosingCol = globalMaxSignalLen > 0 && hasCommaLeftConcat
    ? (portIndent.length + 1 + maxPortPort + 3) + (globalMaxSignalLen + 2) + 1  // continuationIndent + ", " + signal + "}"
    : 0;
  const commaRightClosingCol = globalMaxSignalLen > 0 && hasCommaRightConcat
    ? portIndent.length + 1 + maxPortPort + 3 + globalMaxSignalLen + 1  // +3 for " ({", globalMaxSignalLen for signal, +1 for "}"
    : 0;
  const portClosingParenCol = Math.max(singleLineClosingCol, commaLeftClosingCol, commaRightClosingCol);

  let inPorts = false;
  for (let i = 0; i < parsed.length; i++) {
    const p = parsed[i];
    if (p.type === 'inst_start') {
      inPorts = true;
      continue;
    }
    if (!inPorts) continue;
    if (p.type === 'inst_end') break;

    if (p.type === 'port' && p.port && p.conn !== undefined) {
      // Check if this is a multiline port
      if (p.conn === 'MULTILINE' && p.originalLines && p.maxSignalLen !== undefined) {
        // Output multiline port with comma alignment using this port's max signal length
        // Calculate continuation indent dynamically based on where first signal starts
        // Format: portIndent + "." + portPadded + " ({" = position where first signal starts
        const continuationIndent = ' '.repeat(portIndent.length + 1 + maxPortPort + 3); // +3 for " ({"
        const portMaxSignalLen = p.maxSignalLen; // Use per-port max signal length

        // Detect if THIS port uses comma-left concatenations (per-port detection)
        let portHasCommaLeft = false;
        for (let lineIdx = 1; lineIdx < p.originalLines.length; lineIdx++) {
          const trimmed = p.originalLines[lineIdx].trim();
          if (trimmed.startsWith(',') && !trimmed.startsWith('`') && !trimmed.startsWith('//')) {
            portHasCommaLeft = true;
            break;
          }
        }

        for (let lineIdx = 0; lineIdx < p.originalLines.length; lineIdx++) {
          const origLine = p.originalLines[lineIdx];
          const origTrimmed = origLine.trim();

          // Special handling: check if this is a directive with closing paren/brace BEFORE any other processing
          // Pattern: `endif ), or `endif }), or `endif // comment ), or `endif // comment })
          let hasDirectiveWithClosing = false;
          let directivePart = '';
          let closingPart = '';
          if (/^`(ifn?def|else|endif)/.test(origTrimmed)) {
            const directiveMatch = origTrimmed.match(/^(`(?:ifdef|ifndef|else|endif)(?:\s+\/\/[^\)\}]+)?)\s*([\)\}]+\s*,?\s*)$/);
            if (directiveMatch) {
              hasDirectiveWithClosing = true;
              directivePart = directiveMatch[1];
              closingPart = directiveMatch[2];
            }
          }

          if (hasDirectiveWithClosing) {
            // Directive followed by closing paren/brace: split them
            // Output the directive on its own line
            result.push(continuationIndent + directivePart.trim());
            // Then output the closing paren/brace line, aligned to portClosingParenCol
            const hasComma = closingPart.includes(',');
            const closingStr = closingPart.trim().replace(/\s+/g, '').replace(/,/g, '') + (hasComma ? ',' : ''); // Remove internal spaces, re-add comma at end
            // Align the ) to portClosingParenCol (last character of closingStr should be ) or ,)
            const paddingNeeded = Math.max(0, portClosingParenCol - portIndent.length - closingStr.length);
            const closingLine = portIndent + ' '.repeat(paddingNeeded) + closingStr;
            result.push(closingLine);
          } else if (lineIdx === 0) {
            // First line: ".idata ({Monitor_mccu ," - align opening ( with single-line ports
            // Try to match simple signal, array index, or numeric literal first: .portname ({signalname , or .portname ({signal[0] , or .portname ({8'd0 , or .portname ({4'hf ,
            const firstLineMatch = origTrimmed.match(/^\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+[\da-fA-F_]+)\s*(.*)$/);
            if (firstLineMatch) {
              const portName = firstLineMatch[1];
              const firstSignal = firstLineMatch[2];
              const remainder = firstLineMatch[3].trim();
              const portPadded = portName.padEnd(maxPortPort);
              let formattedRemainder = remainder;
              if (remainder.startsWith(',')) {
                const spacesBeforeComma = portMaxSignalLen - firstSignal.length;
                const padding = spacesBeforeComma > 0 ? ' '.repeat(spacesBeforeComma) : '';
                formattedRemainder = padding + remainder;
              }
              result.push(portIndent + '.' + portPadded + ' ({' + firstSignal + formattedRemainder);
            } else {
              // Try to match replication or nested concatenation: .portname ({{COUNT{signal}} or .portname ({{signal[bit] or .portname ({8'd0
              const replicationFirstMatch = origTrimmed.match(/^\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\{(\{\{?[^,}]+\{[^}]+\}\}|[a-zA-Z_][a-zA-Z0-9_\[\]\-:]+|\d+'\w+[\da-fA-F_]+)\s*(.*)$/);
              if (replicationFirstMatch) {
                const portName = replicationFirstMatch[1];
                const firstExpr = replicationFirstMatch[2]; // e.g., "{{COUNT{signal}}" or "{signal[bit]"
                const remainder = replicationFirstMatch[3].trim();
                const portPadded = portName.padEnd(maxPortPort);
                let formattedRemainder = remainder;
                if (remainder.startsWith(',')) {
                  const spacesBeforeComma = portMaxSignalLen - firstExpr.length;
                  const padding = spacesBeforeComma > 0 ? ' '.repeat(spacesBeforeComma) : '';
                  formattedRemainder = padding + remainder;
                }
                result.push(portIndent + '.' + portPadded + ' ({' + firstExpr + formattedRemainder);
              } else {
                // Fallback: keep as is if pattern doesn't match
                result.push(portIndent + origTrimmed);
              }
            }
          } else if (/^`(ifn?def|else|endif)/.test(origTrimmed) || /^\/\//.test(origTrimmed)) {
            // Directives and comments: just add with continuation indent
            result.push(continuationIndent + origTrimmed);
          } else if (/}\s*\),?$/.test(origTrimmed)) {
            // Closing line like "prdt_respq_data_in})," or "signal})" or "signal[expr]}})" or "LP_FRAMELEN_PARITY_W{1'b1}})" or standalone "})"
            // Handle this BEFORE general signal matching
            // First try to match any expression content before the closing braces
            // Pattern: capture everything up to the final }}) sequence
            const closingMatch = origTrimmed.match(/^(.+?)(}+)(\s*\))(,?)$/);
            if (closingMatch && !closingMatch[1].match(/^}+$/)) { // Ensure we have content, not just standalone closing braces
              const expressionContent = closingMatch[1].trim();
              const closingBraces = closingMatch[2]; // Preserve all closing braces (}, }}, }}}, etc.)
              const hasComma = closingMatch[4] === ',';

              // For expressions with embedded braces like "signal{replication}", split the last brace
              // Format: signal{replication} + padding + } + )
              if (closingBraces.length > 1 && expressionContent.includes('{')) {
                // Expression has embedded braces and multiple closing braces
                // Keep the first closing brace with the expression, pad, then add remaining braces
                const innerClosingBrace = '}';
                const outerClosingBraces = closingBraces.substring(1);
                const exprWithInnerBrace = expressionContent + innerClosingBrace;

                // Step 1: Align outer } at portMaxSignalLen position (where commas are for THIS port)
                const commaLeftOffset = portHasCommaLeft ? 2 : 0;
                const bracePaddingNeeded = Math.max(0, portMaxSignalLen + commaLeftOffset - exprWithInnerBrace.length);
                const bracePadding = bracePaddingNeeded > 0 ? ' '.repeat(bracePaddingNeeded) : '';

                // Step 2: Add padding after } to align ) at portClosingParenCol
                const positionAfterBrace = continuationIndent.length + exprWithInnerBrace.length + bracePadding.length + outerClosingBraces.length;
                const parenPaddingNeeded = Math.max(0, portClosingParenCol - positionAfterBrace);
                const parenPadding = parenPaddingNeeded > 0 ? ' '.repeat(parenPaddingNeeded) : '';

                result.push(continuationIndent + exprWithInnerBrace + bracePadding + outerClosingBraces + parenPadding + ')' + (hasComma ? ',' : ''));
              } else {
                // Simple signal or expression without embedded braces
                // Step 1: Align } at portMaxSignalLen position (where commas are for THIS port)
                const bracePaddingNeeded = Math.max(0, portMaxSignalLen - expressionContent.length);
                const bracePadding = bracePaddingNeeded > 0 ? ' '.repeat(bracePaddingNeeded) : '';

                // Step 2: Add padding after } to align ) at portClosingParenCol
                const positionAfterBrace = continuationIndent.length + expressionContent.length + bracePadding.length + closingBraces.length;
                const parenPaddingNeeded = Math.max(0, portClosingParenCol - positionAfterBrace);
                const parenPadding = parenPaddingNeeded > 0 ? ' '.repeat(parenPaddingNeeded) : '';

                result.push(continuationIndent + expressionContent + bracePadding + closingBraces + parenPadding + ')' + (hasComma ? ',' : ''));
              }
            } else {
              // Standalone closing like "})" or "}),"
              const standaloneClosingMatch = origTrimmed.match(/^(}+)(\s*\))(,?)$/);
              if (standaloneClosingMatch) {
                const closingBraces = standaloneClosingMatch[1];
                const hasComma = standaloneClosingMatch[3] === ',';

                // Step 1: Align } at portMaxSignalLen position (where commas are for THIS port)
                const commaLeftOffset = portHasCommaLeft ? 2 : 0;
                const bracePaddingNeeded = Math.max(0, portMaxSignalLen + commaLeftOffset - closingBraces.length);
                const bracePadding = bracePaddingNeeded > 0 ? ' '.repeat(bracePaddingNeeded) : '';

                // Step 2: Add padding after } to align ) at portClosingParenCol
                const positionAfterBrace = continuationIndent.length + bracePadding.length + closingBraces.length;
                const parenPaddingNeeded = Math.max(0, portClosingParenCol - positionAfterBrace);
                const parenPadding = parenPaddingNeeded > 0 ? ' '.repeat(parenPaddingNeeded) : '';

                const closingLine = continuationIndent + bracePadding + closingBraces + parenPadding + ')' + (hasComma ? ',' : '');
                result.push(closingLine);
              } else {
                // Other closing patterns - preserve as-is with proper indent
                result.push(continuationIndent + origTrimmed);
              }
            }
          } else {
            // Signal lines: align commas (includes signal names, array indices, and numeric literals like 4'hf)
            const signalMatch = origTrimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+[\da-fA-F_]+)\s*(.*)$/);
            if (signalMatch) {
              const signalName = signalMatch[1];
              const remainder = signalMatch[2].trim();
              // Only add padding if there's a comma or closing brace
              let formattedRemainder = remainder;
              if (remainder.startsWith(',') || remainder.startsWith('}')) {
                const spacesBeforeComma = portMaxSignalLen - signalName.length;
                const padding = spacesBeforeComma > 0 ? ' '.repeat(spacesBeforeComma) : '';
                formattedRemainder = padding + remainder;
              }
              result.push(continuationIndent + signalName + formattedRemainder);
            } else {
              // Lines starting with '{' for nested concatenations or replications
              // Pattern 1: Replication like {COUNT{signal}} or double-replication {{COUNT{signal}}
              const replicationMatch = origTrimmed.match(/^(\{\{?[^}]+\{[^}]+\}\})(.*?)$/);
              if (replicationMatch) {
                const replicationExpr = replicationMatch[1]; // e.g., "{COUNT{signal}}" or "{{COUNT{signal}}"
                const remainder = replicationMatch[2].trim();
                // Align commas and closing braces
                let formattedRemainder = remainder;
                if (remainder.startsWith(',')) {
                  const exprLength = replicationExpr.length;
                  const paddingNeeded = Math.max(0, portMaxSignalLen - exprLength);
                  const padding = paddingNeeded > 0 ? ' '.repeat(paddingNeeded) : '';
                  formattedRemainder = padding + remainder;
                } else if (remainder.startsWith('}')) {
                  // Closing brace(s) followed by ) - align the } but keep ) immediately after with no space
                  // Extract the closing braces and closing paren
                  const closingBraceMatch = remainder.match(/^(}+)(\s*\))(.*)$/);
                  if (closingBraceMatch) {
                    const closingBraces = closingBraceMatch[1];
                    const rest = closingBraceMatch[3]; // comma or empty
                    const exprLength = replicationExpr.length;
                    const paddingNeeded = Math.max(0, portMaxSignalLen - exprLength);
                    const padding = paddingNeeded > 0 ? ' '.repeat(paddingNeeded) : '';
                    formattedRemainder = padding + closingBraces + ')' + rest;
                  } else {
                    // Just closing braces, no paren
                    const exprLength = replicationExpr.length;
                    const paddingNeeded = Math.max(0, portMaxSignalLen - exprLength);
                    const padding = paddingNeeded > 0 ? ' '.repeat(paddingNeeded) : '';
                    formattedRemainder = padding + remainder;
                  }
                }
                result.push(continuationIndent + replicationExpr + formattedRemainder);
              } else {
                // Pattern 2: Nested concatenation like {signal[bit], or {signal,
                const nestedMatch = origTrimmed.match(/^(\{[a-zA-Z_][a-zA-Z0-9_\[\]\-:]*)(.*?)$/);
                if (nestedMatch) {
                  const signalPart = nestedMatch[1]; // e.g., "{signal[bit]"
                  const remainder = nestedMatch[2].trim();
                  let formattedRemainder = remainder;
                  if (remainder.startsWith(',')) {
                    // Align comma - measure from opening brace to end of signal
                    const exprLength = signalPart.length;
                    const paddingNeeded = Math.max(0, portMaxSignalLen - exprLength);
                    const padding = paddingNeeded > 0 ? ' '.repeat(paddingNeeded) : '';
                    formattedRemainder = padding + remainder;
                  }
                  result.push(continuationIndent + signalPart + formattedRemainder);
                } else {
                  // Other nested concatenation lines - just preserve as-is with proper indent
                  result.push(continuationIndent + origTrimmed);
                }
              }
            }
          }
        }
      } else {
        // Single-line port - format normally
        const portPadded = p.port.padEnd(maxPortPort);

        // Determine comma handling
        let comma = '';
        // Check if next non-directive/blank is inst_end or if next port is inside ifdef
        let isLast = true;
        let foundDirective = false;
        for (let j = i + 1; j < parsed.length; j++) {
          if (parsed[j].type === 'inst_end') break;
          if (parsed[j].type === 'directive') {
            foundDirective = true;
            continue;
          }
          if (parsed[j].type === 'port') {
            if (!foundDirective) {
              isLast = false;
            }
            break;
          }
        }

        // If there's a directive (ifdef) following, preserve original comma state
        // Otherwise, add comma based on whether this is the last port
        if (foundDirective) {
          comma = p.hadComma ? ',' : '';
        } else {
          comma = isLast ? '' : ',';
        }

        // Pad all connections so ) aligns at portClosingParenCol (determined by longest connection)
        // Calculate current position: portIndent + "." + portPadded + " (" + conn
        const currentPos = portIndent.length + 1 + portPadded.length + 2 + p.conn.length;
        const paddingNeeded = Math.max(0, portClosingParenCol - currentPos);
        const connPadded = p.conn + ' '.repeat(paddingNeeded);
        const commentStr = p.comment ? ' ' + p.comment : '';
        result.push(portIndent + '.' + portPadded + ' (' + connPadded + ')' + comma + commentStr);
      }
    } else if (p.type === 'directive') {
      result.push(portIndent + p.content);
    } else if (p.type === 'comma') {
      // Check if the next non-blank entry is an ifdef - if so, skip this comma
      let nextIsIfdef = false;
      for (let j = i + 1; j < parsed.length; j++) {
        if (parsed[j].type === 'directive') {
          if (/^`ifdef/.test(parsed[j].content)) {
            nextIsIfdef = true;
          }
          break;
        }
        if (parsed[j].type !== 'comma') break;
      }
      if (!nextIsIfdef) {
        // Keep the comma if it's not followed by ifdef
        result.push(portIndent + ',');
      }
      // Skip comma if followed by ifdef
      continue;
    }
  }

  // Closing ); should have same indentation as ports
  result.push(portIndent + ');');

  return result;
}
