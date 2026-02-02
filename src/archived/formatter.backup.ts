import * as vscode from 'vscode';

interface Config {
  indentSize: number;
  maxBlankLines: number;
  alignPortList: boolean;
  alignParameters: boolean;
  wrapPortList: boolean;
  lineLength: number;
  removeTrailingWhitespace: boolean;
  alignAssignments: boolean;
  alignWireDeclSemicolons: boolean;
  commentColumn: number;
  formatModuleInstantiations: boolean;
  formatModuleHeaders: boolean;
  indentAlwaysBlocks: boolean;
  enforceBeginEnd: boolean;
  indentCaseStatements: boolean;
  annotateIfdefComments: boolean;
}

export function formatDocument(document: vscode.TextDocument, options: vscode.FormattingOptions): vscode.TextEdit[] {
  // Use tabSize from FormattingOptions (reflects current editor setting from bottom bar)
  const workspaceTabSize = options.tabSize || 2;
  const cfg = getConfig(workspaceTabSize);
  const original = document.getText();

  // Check if any formatting feature is enabled
  const anyFeatureEnabled = cfg.removeTrailingWhitespace || cfg.maxBlankLines < 100 ||
    cfg.alignAssignments || cfg.alignWireDeclSemicolons || cfg.alignParameters ||
    cfg.alignPortList || cfg.formatModuleHeaders || cfg.formatModuleInstantiations ||
    cfg.indentAlwaysBlocks || cfg.enforceBeginEnd || cfg.indentCaseStatements ||
    cfg.annotateIfdefComments || cfg.commentColumn > 0;

  // If no features enabled, return empty (no changes)
  if (!anyFeatureEnabled) {
    return [];
  }

  const lines = original.split(/\r?\n/);

  const processed: string[] = [];
  let blankCount = 0;

  let inModuleHeader = false;
  let moduleHeaderLines: string[] = [];

  // State for grouping consecutive assignment lines and wire decl blocks
  let pendingAssignments: { idx: number; text: string }[] = [];
  let pendingWireDecls: { idx: number; text: string }[] = [];
  let pendingParams: { idx: number; text: string }[] = [];
  let pendingPorts: { idx: number; text: string }[] = [];
  let inAssignmentContinuation = false; // multi-line assignment state
  let inWireContinuation = false; // multi-line wire/reg/logic init state
  let inParamContinuation = false; // multi-line parameter state
  let inPortContinuation = false; // multi-line port declaration state
  let wireGroupNonDeclCount = 0; // count consecutive non-declaration lines in wire group

  // Global macro stack (for ALL file, not just module header)
  const globalMacroStack: string[] = [];
  function annotateMacro(line: string): string {
    if (!cfg.annotateIfdefComments) return line;

    const leading = line.match(/^\s*/)?.[0] || '';
    const trimmed = line.trim();

    // Check if directive appears mid-line (like "{`ifdef SYMBOL")
    // Extract everything before the directive
    const midLineMatch = trimmed.match(/^(.+?)(`ifn?def\s+(\w+)|`else\b|`endif\b.*)$/);
    if (midLineMatch && !trimmed.startsWith('`')) {
      // Directive is mid-line, not at start
      const beforeDirective = midLineMatch[1];
      const directivePart = midLineMatch[2];

      // Handle ifdef/ifndef
      const ifdefMatch = directivePart.match(/^`ifn?def\s+(\w+)/);
      if (ifdefMatch) {
        globalMacroStack.push(ifdefMatch[1]);
        return leading + beforeDirective + directivePart; // Don't annotate ifdef
      }

      // Handle else
      if (/^`else\b/.test(directivePart)) {
        const current = globalMacroStack[globalMacroStack.length - 1];
        if (current) {
          return leading + beforeDirective + '`else // ' + current;
        }
        return leading + trimmed;
      }

      // Handle endif
      if (/^`endif\b/.test(directivePart)) {
        const popped = globalMacroStack.pop();
        if (popped) {
          const afterEndif = directivePart.replace(/^`endif\s*/, '');
          return leading + beforeDirective + '`endif // ' + popped + (afterEndif ? ' ' + afterEndif : '');
        }
        return leading + trimmed;
      }
    }

    // ifdef / ifndef at start of line
    const ifdefM = trimmed.match(/^`ifn?def\s+(\w+)/);
    if (ifdefM) {
      const name = ifdefM[1];
      globalMacroStack.push(name);
      return leading + trimmed; // do not append comment on ifdef lines per style
    }
    // else
    if (/^`else\b/.test(trimmed)) {
      const current = globalMacroStack[globalMacroStack.length - 1];
      if (current) {
        if (/\/\//.test(trimmed)) {
          // Normalize existing comment
          if (!new RegExp(`//\\s*${current}$`).test(trimmed)) {
            return leading + '`else // ' + current; // replace any existing comment
          }
          return leading + trimmed.replace(/`else.*?(\/\/\s*.*)$/,'`else // ' + current);
        }
        return leading + '`else // ' + current;
      }
      return leading + trimmed;
    }
    // endif
    if (/^`endif\b/.test(trimmed)) {
      const popped = globalMacroStack.pop();
      if (popped) {
        // Extract any content after `endif (like closing parens, commas)
        const afterEndif = trimmed.replace(/^`endif\s*/, '');
        const hasExistingComment = /\/\//.test(afterEndif);

        if (hasExistingComment) {
          // If already commented, normalize it but preserve content after comment
          const parts = afterEndif.split('//');
          const beforeComment = parts[0].trim();
          const afterComment = parts.slice(1).join('//').trim();
          return leading + '`endif ' + (beforeComment ? beforeComment + ' ' : '') + '// ' + popped;
        } else {
          // No comment yet - add comment THEN preserve any trailing content (like ), or })
          // This way directives with closing parens look like: `endif // SYMBOL ),
          return leading + '`endif // ' + popped + (afterEndif ? ' ' + afterEndif : '');
        }
      }
      return leading + '`endif';
    }
    return line;
  }

  function flushAssignments() {
    if (!pendingAssignments.length) return;
    const formatted = cfg.alignAssignments ? alignAssignmentGroup(pendingAssignments.map(a => a.text)) : pendingAssignments.map(a => a.text);
    formatted.forEach((l: string) => processed.push(applyCommentColumn(l, cfg)));
    pendingAssignments = [];
  }
  function flushWireDecls() {
    if (!pendingWireDecls.length) return;
    const formatted = cfg.alignWireDeclSemicolons ? alignWireDeclGroup(pendingWireDecls.map(w => w.text), cfg) : pendingWireDecls.map(w => w.text);
    formatted.forEach((l: string) => processed.push(applyCommentColumn(l, cfg)));
    pendingWireDecls = [];
  }
  function flushParams() {
    if (!pendingParams.length) return;
    const formatted = cfg.alignParameters ? alignParameterLines(pendingParams.map(p => p.text)) : pendingParams.map(p => p.text);
    formatted.forEach((l: string) => processed.push(applyCommentColumn(l, cfg)));
    pendingParams = [];
  }
  function flushPorts() {
    if (!pendingPorts.length) return;
    const formatted = cfg.alignPortList ? alignPortDeclLines(pendingPorts.map(p => p.text)) : pendingPorts.map(p => p.text);
    formatted.forEach((l: string) => processed.push(applyCommentColumn(l, cfg)));
    pendingPorts = [];
  }

  let moduleBodyActive = false; // inside a module after header
  let functionDepth = 0; // Track function/task nesting depth

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Only trim trailing whitespace if enabled
    if (cfg.removeTrailingWhitespace) {
      line = line.replace(/\s+$/,'');
    }

    // Annotate macro directives globally (only if enabled)
    if (cfg.annotateIfdefComments && /`(ifn?def|else|endif)\b/.test(line)) {
      line = annotateMacro(line);
    }

    // Module header accumulation (only if formatModuleHeaders enabled)
    if (cfg.formatModuleHeaders) {
      if (!inModuleHeader && /^\s*module\b/.test(line)) {
        flushAssignments();
        flushWireDecls();
        inModuleHeader = true;
        moduleHeaderLines = [];
      }
      if (inModuleHeader) {
        moduleHeaderLines.push(line);
        if (/;\s*(\/\/.*)?$/.test(line)) { // end of header
          const formattedHeader = formatModuleHeader(moduleHeaderLines, cfg);
          formattedHeader.forEach(h => processed.push(h));
          processed.push(''); // Add blank line after module header
          inModuleHeader = false;
          moduleBodyActive = true; // start body indentation
        }
        continue;
      }
    }

    // Module body indentation - REMOVED (was forcing 2-space indent on everything)
    // Let indentAlwaysBlocks handle indentation instead
    // if (moduleBodyActive) {
    //   if (/^\s*endmodule\b/.test(line)) {
    //     line = line.replace(/^\s+/, '');
    //     moduleBodyActive = false;
    //   } else if (line.trim() !== '') {
    //     line = '  ' + line.replace(/^\s*/, '');
    //   }
    // }

    // Blank line compression (only if maxBlankLines is set to limit)
    const shouldCompressBlankLines = cfg.maxBlankLines < 100; // reasonable max
    if (line.trim() === '') {
      // Keep blank lines inside assignment group (don't flush yet)
      if (pendingAssignments.length && !inAssignmentContinuation) {
        blankCount++;
        if (shouldCompressBlankLines && blankCount > cfg.maxBlankLines) continue;
        pendingAssignments.push({ idx: i, text: line });
        continue;
      } else {
        flushAssignments();
      }
      // Keep blank lines inside parameter group (don't flush yet)
      if (pendingParams.length && !inParamContinuation) {
        blankCount++;
        if (shouldCompressBlankLines && blankCount > cfg.maxBlankLines) continue;
        pendingParams.push({ idx: i, text: line });
        continue;
      } else {
        flushParams();
      }
      // Note: pendingPorts handling removed - IOs now handled by pendingWireDecls
      // Keep blank lines inside wire decl group if count hasn't exceeded limit
      // For IO declarations (input/output/inout), never break the group
      if (pendingWireDecls.length && !inWireContinuation) {
        const firstPendingIsIO = /^\s*(input|output|inout)\b/.test(pendingWireDecls[0].text);
        wireGroupNonDeclCount++;
        // IO declarations stay grouped regardless of gap size
        if (!firstPendingIsIO && wireGroupNonDeclCount > 3) {
          flushWireDecls();
          wireGroupNonDeclCount = 0;
        } else {
          blankCount++;
          if (shouldCompressBlankLines && blankCount > cfg.maxBlankLines) continue;
          pendingWireDecls.push({ idx: i, text: line });
          continue;
        }
      } else {
        flushWireDecls();
      }
      blankCount++;
      if (shouldCompressBlankLines && blankCount > cfg.maxBlankLines) continue;
      processed.push('');
      continue;
    } else {
      blankCount = 0;
    }

    // Track function/task depth for proper declaration alignment
    if (/^\s*\b(function|task)\b/.test(line)) {
      functionDepth++;
    }
    if (/^\s*\b(endfunction|endtask)\b/.test(line)) {
      // Flush wire declarations before exiting function
      flushWireDecls();
      functionDepth--;
      if (functionDepth < 0) functionDepth = 0; // Safety check
    }

    // Handle multi-line wire/reg/logic declaration continuation
    if (inWireContinuation) {
      pendingWireDecls.push({ idx: i, text: line });
      if (/;\s*(\/\/.*)?$/.test(line)) { // declaration ends
        inWireContinuation = false;
      }
      continue;
    }

    // Detect wire/reg/logic/input/output/inout declarations group (only if alignment enabled)
    // Separate wires WITH equal signs from those WITHOUT (treat wires with '=' like assignments)
    // Also separate input/output/inout from wire/reg/logic
    // EXCEPT inside functions/tasks where all declarations should align together
    if (cfg.alignWireDeclSemicolons && /^\s*(wire|reg|logic|input|output|inout|integer)\b/.test(line)) {
      const lineWithoutComment = line.replace(/\/\/.*$/, ''); // Remove comments before checking for =
      const hasEqualSign = /=/.test(lineWithoutComment);
      const isIODecl = /^\s*(input|output|inout)\b/.test(line);
      // If there are pending wire decls and they're a different type, flush first
      // BUT: inside functions/tasks, don't flush between different declaration types
      if (pendingWireDecls.length && !inWireContinuation && functionDepth === 0) {
        const firstPendingWithoutComment = pendingWireDecls[0].text.replace(/\/\/.*$/, '');
        const firstPendingHasEqual = /=/.test(firstPendingWithoutComment);
        const firstPendingIsIO = /^\s*(input|output|inout)\b/.test(pendingWireDecls[0].text);
        // Flush if switching between IO and wire/reg, or between equal/no-equal
        if (firstPendingIsIO !== isIODecl || firstPendingHasEqual !== hasEqualSign) {
          flushWireDecls(); // different type, start new group
          wireGroupNonDeclCount = 0;
        }
      }
      // Flush other groups only when wire is encountered
      if (!pendingWireDecls.length) {
        flushAssignments();
        flushParams();
        flushPorts();
      }
      pendingWireDecls.push({ idx: i, text: line });
      wireGroupNonDeclCount = 0; // reset count when we see a wire declaration
      if (!/;\s*(\/\/.*)?$/.test(line)) { // no semicolon => continuation
        inWireContinuation = true;
      }
      continue;
    } else if (pendingWireDecls.length && !inWireContinuation) {
      // Keep comments/macros inside the group, but check the count
      // For IO declarations (input/output/inout), never break the group
      const firstPendingIsIO = /^\s*(input|output|inout)\b/.test(pendingWireDecls[0].text);
      if (/^\s*\/\//.test(line) || /^\s*`(ifn?def|else|endif)\b/.test(line)) {
        wireGroupNonDeclCount++;
        // IO declarations stay grouped regardless of gap size
        if (!firstPendingIsIO && wireGroupNonDeclCount > 3) {
          flushWireDecls();
          wireGroupNonDeclCount = 0;
        } else {
          pendingWireDecls.push({ idx: i, text: line });
          continue;
        }
      } else {
        // Any other line breaks the wire group (but NOT IO groups)
        // EXCEPT: parameter/localparam always breaks any group
        const isParam = /^\s*(parameter|localparam)\b/.test(line);
        if (!firstPendingIsIO || isParam) {
          flushWireDecls();
          wireGroupNonDeclCount = 0;
        } else {
          // For IO groups, treat unknown lines as passthrough
          wireGroupNonDeclCount++;
          pendingWireDecls.push({ idx: i, text: line });
          continue;
        }
      }
    }

    // Handle multi-line parameter/localparam continuation
    if (inParamContinuation) {
      pendingParams.push({ idx: i, text: line });
      if (/;\s*(\/\/.*)?$/.test(line)) { // parameter ends
        inParamContinuation = false;
      }
      continue;
    }

    // Detect parameter/localparam declarations (only if alignment enabled)
    if (cfg.alignParameters && /^\s*(parameter|localparam)\b/.test(line)) {
      // Flush other groups only when parameter is encountered
      if (!pendingParams.length) {
        flushWireDecls();
        flushAssignments();
        flushPorts();
      }
      // Ensure minimum indentation (at least 2 spaces for module body params)
      let paramLine = line;
      if (!/^\s\s/.test(line) && /^(parameter|localparam)\b/.test(line.trimStart())) {
        // If line doesn't have at least 2 spaces and starts with parameter/localparam, add base indentation
        paramLine = '  ' + line.trimStart();
      }
      pendingParams.push({ idx: i, text: paramLine });
      if (!/;\s*(\/\/.*)?$/.test(line)) { // no semicolon => continuation
        inParamContinuation = true;
      }
      continue;
    } else if (pendingParams.length && inParamContinuation) {
      // Handle parameter continuation lines
      pendingParams.push({ idx: i, text: line });
      if (/;\s*(\/\/.*)?$/.test(line)) { // parameter declaration ends
        inParamContinuation = false;
      }
      continue;
    } else if (pendingParams.length && !inParamContinuation) {
      // Keep comments/ifdefs/blank lines inside the parameter group
      if (/^\s*\/\//.test(line) || /^\s*`(ifn?def|else|endif)\b/.test(line) || /^\s*$/.test(line)) {
        pendingParams.push({ idx: i, text: line });
        continue;
      } else {
        // Any other line breaks the parameter group
        flushParams();
      }
    }

    // Handle multi-line port declaration continuation
    if (inPortContinuation) {
      pendingPorts.push({ idx: i, text: line });
      if (/;\s*(\/\/.*)?$/.test(line)) { // port declaration ends
        inPortContinuation = false;
      }
      continue;
    }

    // Detect input/output/inout declarations in module body
    // NOTE: Input/output/inout now handled by wire/reg/logic section above (line ~210)
    // to ensure all IO declarations are in one unified alignment group
    // Keeping pendingPorts code commented for reference
    /*
    if (/^\s*(input|output|inout)\b/.test(line)) {
      // Flush other groups only when port is encountered
      if (!pendingPorts.length) {
        flushWireDecls();
        flushAssignments();
        flushParams();
      }
      pendingPorts.push({ idx: i, text: line });
      if (!/;\s*(\/\/.*)?$/.test(line)) { // no semicolon => continuation
        inPortContinuation = true;
      }
      continue;
    } else if (pendingPorts.length && !inPortContinuation) {
      // Keep comments/ifdefs/blank lines inside the port group
      if (/^\s*\/\//.test(line) || /^\s*`(ifn?def|else|endif)\b/.test(line) || /^\s*$/.test(line)) {
        pendingPorts.push({ idx: i, text: line });
        continue;
      } else {
        // Any other line breaks the port group
        flushPorts();
      }
    }
    */

    // Multi-line assignment continuation handling (specific for 'assign' without terminating semicolon)
    if (inAssignmentContinuation) {
      pendingAssignments.push({ idx: i, text: line });
      if (/;\s*(\/\/.*)?$/.test(line)) { // multi-line assign ends
        inAssignmentContinuation = false;
      }
      continue;
    }

    // Explicit 'assign' start (may be multi-line if no semicolon) - only group if alignment enabled
    if (cfg.alignAssignments && /^\s*assign\b/.test(line)) {
      pendingAssignments.push({ idx: i, text: line });
      if (!/;\s*(\/\/.*)?$/.test(line)) {
        inAssignmentContinuation = true; // collect following lines until semicolon
      }
      continue;
    }

    // Generic (single-line) non-blocking/blocking assignments (not starting with wire/reg/logic declarations) - only group if alignment enabled
    const genericAssignStart = cfg.alignAssignments && /^(.*?)\s*(<=|=)(?![=]).*;\s*(\/\/.*)?$/.test(line) && !/^\s*(wire|reg|logic|input|output|inout)\b/.test(line);
    if (genericAssignStart) {
      pendingAssignments.push({ idx: i, text: line });
      continue;
    }

    // Keep comments/ifdefs inside the assignment group if we have pending assignments
    if (pendingAssignments.length && !inAssignmentContinuation) {
      if (/^\s*\/\//.test(line) || /^\s*`(ifn?def|else|endif)\b/.test(line)) {
        pendingAssignments.push({ idx: i, text: line });
        continue;
      } else {
        // Any other line breaks the assignment group
        flushAssignments();
      }
    }

    // Apply comment column alignment
    line = applyCommentColumn(line, cfg);

    // Enforce max line length for comments (simple wrap for long single-line comments)
    if (/^\s*\/\//.test(line) && line.length > cfg.lineLength) {
      line = wrapComment(line, cfg.lineLength);
    }

    processed.push(line);
  }

  flushAssignments();
  flushWireDecls();
  flushParams();
  flushPorts();

  // NEW: Move standalone "begin" to previous line if it ends with ")" (only if enforceBeginEnd enabled)
  const withBeginMoved = cfg.enforceBeginEnd ? moveBeginToSameLine(processed) : processed;

  // NEW: Fix invalid "end if" patterns (split into "end" and "if") (only if enforceBeginEnd enabled)
  const withFixedEndIf = cfg.enforceBeginEnd ? fixEndIfPattern(withBeginMoved) : withBeginMoved;

  // NEW: align multiline if/for/while conditions
  const withAlignedConditions = alignMultilineConditions(withFixedEndIf);

  // NEW: indent always blocks (conditional)
  const withAlways = cfg.indentAlwaysBlocks
    ? indentAlwaysBlocks(withAlignedConditions, cfg.indentSize)
    : withAlignedConditions;

  // NEW: fix module-level declaration indentation (only if indentAlwaysBlocks enabled)
  const withFixedIndent = cfg.indentAlwaysBlocks
    ? fixModuleLevelIndentation(withAlways, cfg.indentSize)
    : withAlways;

  // NEW: enforce if and for blocks begin/end iteratively until stable (conditional)
  // Skip this if indentAlwaysBlocks is enabled, as it re-indents and conflicts
  let controlBlocks = withFixedIndent;
  if (cfg.enforceBeginEnd && !cfg.indentAlwaysBlocks) {
    let prevLength = 0;
    let iterations = 0;
    const maxIterations = 10; // prevent infinite loops

    while (iterations < maxIterations) {
      prevLength = controlBlocks.length;
      controlBlocks = enforceIfBlocks(controlBlocks, cfg.indentSize);
      controlBlocks = enforceForLoopBlocks(controlBlocks, cfg.indentSize);

      // If no changes (length stayed same), we're done
      if (controlBlocks.length === prevLength) {
        break;
      }
      iterations++;
    }
  }

  // NEW: format module instantiations (conditional) - run AFTER if/for blocks are enforced
  const withInstantiations = cfg.formatModuleInstantiations
    ? formatModuleInstantiations(controlBlocks, cfg.indentSize)
    : controlBlocks;

  // NEW: indent case statements (must run AFTER enforceIfBlocks and enforceForLoopBlocks) (conditional)
  // Skip this if indentAlwaysBlocks is enabled, as it already handles all indentation
  const withCaseIndent = (cfg.indentCaseStatements && !cfg.indentAlwaysBlocks)
    ? indentCaseStatements(withInstantiations, cfg.indentSize)
    : withInstantiations;

  // NEW: normalize ifdef directive indentation to align with the code they protect
  // Skip this if indentAlwaysBlocks is enabled, as it already handles ifdef indentation correctly
  const finalLines = cfg.indentAlwaysBlocks
    ? withCaseIndent
    : normalizeIfdefIndentation(withCaseIndent);

  // Remove trailing blank lines while preserving original end-of-file newline behavior
  while (finalLines.length > 0 && finalLines[finalLines.length - 1].trim() === '') {
    finalLines.pop();
  }

  const newText = finalLines.join('\n') + (original.endsWith('\n') ? '\n' : '');
  if (newText === original) {
    return [];
  }
  const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(original.length));
  return [vscode.TextEdit.replace(fullRange, newText)];
}

function getConfig(workspaceTabSize: number = 2): Config {
  const wcfg = vscode.workspace.getConfiguration('verilogFormatter');
  // Check if user has explicitly set indentSize (not just using default)
  const indentInspect = wcfg.inspect<number>('indentSize');
  let indentSize = workspaceTabSize;
  
  // Use explicitly set value (workspace, workspace folder, or global)
  if (indentInspect?.workspaceFolderValue !== undefined) {
    indentSize = indentInspect.workspaceFolderValue;
  } else if (indentInspect?.workspaceValue !== undefined) {
    indentSize = indentInspect.workspaceValue;
  } else if (indentInspect?.globalValue !== undefined) {
    indentSize = indentInspect.globalValue;
  }
  // Otherwise use workspace tabSize (already set above)
  return {
    indentSize: indentSize,
    maxBlankLines: wcfg.get<number>('maxBlankLines', 1),
    alignPortList: wcfg.get<boolean>('alignPortList', true),
    alignParameters: wcfg.get<boolean>('alignParameters', true),
    wrapPortList: wcfg.get<boolean>('wrapPortList', true),
    lineLength: wcfg.get<number>('lineLength', 160),
    removeTrailingWhitespace: wcfg.get<boolean>('removeTrailingWhitespace', true),
    alignAssignments: wcfg.get<boolean>('alignAssignments', true),
    alignWireDeclSemicolons: wcfg.get<boolean>('alignWireDeclSemicolons', true),
    commentColumn: wcfg.get<number>('commentColumn', 0),
    formatModuleInstantiations: wcfg.get<boolean>('formatModuleInstantiations', true),
    formatModuleHeaders: wcfg.get<boolean>('formatModuleHeaders', true),
    indentAlwaysBlocks: wcfg.get<boolean>('indentAlwaysBlocks', true),
    enforceBeginEnd: wcfg.get<boolean>('enforceBeginEnd', true),
    indentCaseStatements: wcfg.get<boolean>('indentCaseStatements', true),
    annotateIfdefComments: wcfg.get<boolean>('annotateIfdefComments', true)
  };
}

function formatModuleHeader(lines: string[], cfg: Config): string[] {
  const hasOpen = lines.some(l => l.includes('('));
  const hasClose = lines.some(l => /\)\s*;\s*$/.test(l));
  if (!hasOpen || !hasClose) return lines;

  // Find where the module header actually ends (the line with `);`)
  const moduleHeaderEndIdx = lines.findIndex(l => /\)\s*;\s*$/.test(l));
  const headerLines = moduleHeaderEndIdx >= 0 ? lines.slice(0, moduleHeaderEndIdx + 1) : lines;
  const remainingLines = moduleHeaderEndIdx >= 0 ? lines.slice(moduleHeaderEndIdx + 1) : [];

  const paramStartIdx = headerLines.findIndex(l => /#\s*\(/.test(l));
  let paramEndIdx = -1;
  let inlinePortAfterParams: string | null = null;
  if (paramStartIdx !== -1) {
    for (let i = paramStartIdx; i < headerLines.length; i++) {
      // Look for `) (` or `)` at start of line (parameter block end)
      if (/^\s*\)\s*(\(|$)/.test(headerLines[i])) {
        paramEndIdx = i;
        const mInline = headerLines[i].match(/\)\s*\((.*)$/);
        if (mInline) {
          inlinePortAfterParams = mInline[1]
            .replace(/\)\s*;?\s*$/, '')
            .trim();
        }
        break;
      }
    }
  }

  const moduleDeclLine = headerLines[0].trim();
  const portLinesStart = (paramEndIdx !== -1 ? paramEndIdx + 1 : 1);
  const portLinesEnd = headerLines.length - 1; // exclude closing ');'
  const rawPortLines = [
    ...(inlinePortAfterParams ? [inlinePortAfterParams] : []),
    ...headerLines.slice(portLinesStart, portLinesEnd)
  ];
  const cleanedRawPortLines = rawPortLines.filter(l => !/^\s*\(\s*$/.test(l));

  // Per-header macro stack (separate from global) for annotating endif
  const macroStack: string[] = [];

  interface PortLineEntry {
    original: string;
    kind: 'directive' | 'separator' | 'blank' | 'port';
    content: string;
    dir?: string; type?: string; range?: string; name?: string; comma?: boolean; comment?: string; macroName?: string;
  }
  const entries: PortLineEntry[] = [];

  cleanedRawPortLines.forEach(line => {
    let trimmed = line.trim();
    if (trimmed === '') { entries.push({ original: line, kind: 'blank', content: '' }); return; }
    if (/^,$/.test(trimmed)) { entries.push({ original: line, kind: 'separator', content: ',' }); return; }
    if (trimmed.startsWith('`')) {
      let macroName: string | undefined;
      const ifdefM = trimmed.match(/^`ifn?def\s+(\w+)/);
      if (ifdefM) { macroName = ifdefM[1]; macroStack.push(macroName); }
      if (/^`else\b/.test(trimmed)) {
        const current = macroStack[macroStack.length - 1];
        if (current) trimmed = '`else // ' + current;
      }
      if (/^`endif\b/.test(trimmed)) {
        const popped = macroStack.pop();
        trimmed = '`endif' + (popped ? ` // ${popped}` : '');
        if (/`endif\s*\/\/\s*\w+/.test(trimmed)) {
          trimmed = trimmed.replace(/`endif\s*\/\/\s*(\w+)/, (_m, g1) => '`endif // ' + g1);
        }
      }
      entries.push({ original: line, kind: 'directive', content: trimmed });
      return;
    }
    // Check if this is a comment-only line
    if (trimmed.startsWith('//')) {
      entries.push({ original: line, kind: 'directive', content: trimmed });
      return;
    }
    const commentMatch = trimmed.match(/(.*?)(\/\/.*)$/);
    const comment = commentMatch ? commentMatch[2].replace(/\/\/\s?/, '// ') : undefined;
    const body = commentMatch ? commentMatch[1].trim() : trimmed;
    const trailingComma = /,\s*$/.test(body);
    const bodyNoComma = body.replace(/,\s*$/, '').trim();
    const m = bodyNoComma.match(/^(input|output|inout)?\s*(wire|reg|logic)?\s*(\[[^\]]+\])?\s*(.*)$/);
    if (m) {
      entries.push({ original: line, kind: 'port', content: bodyNoComma, dir: m[1]||'', type: m[2]||'', range: m[3]||'', name: m[4].trim(), comma: trailingComma, comment });
    } else {
      entries.push({ original: line, kind: 'port', content: bodyNoComma, dir: '', type: '', range: '', name: bodyNoComma, comma: trailingComma, comment });
    }
  });

  const portEntries = entries.filter(e => e.kind === 'port');
  const maxDir = Math.max(0, ...portEntries.map(e => e.dir?.length || 0));
  const maxType = Math.max(0, ...portEntries.map(e => e.type?.length || 0));
  const maxRange = Math.max(0, ...portEntries.map(e => e.range?.length || 0));
  const maxName = Math.max(0, ...portEntries.map(e => e.name?.length || 0));

  // First pass: build base content without comments
  portEntries.forEach(e => {
    const dirCol = maxDir ? (e.dir || '').padEnd(maxDir) : '';
    const typeCol = maxType ? (e.type || '').padEnd(maxType) : '';
    const rangeCol = maxRange ? (e.range || '').padStart(maxRange) : '';
    const nameCol = (e.name || '');
    const segments: string[] = [];
    if (maxDir) segments.push(dirCol);
    if (maxType) segments.push(typeCol);
    if (maxRange) segments.push(rangeCol);
    let base = segments.length ? segments.join(' ') + ' ' + nameCol : nameCol;
    // Store the base without comma for alignment calculation
    e.content = base;
  });

  // Calculate max length of base content (without comma) for comma alignment
  const maxBaseLength = Math.max(0, ...portEntries.map(e => e.content?.length || 0));

  // Second pass: pad base and add comma
  portEntries.forEach(e => {
    const basePadded = e.content!.padEnd(maxBaseLength);
    const commaChar = e.comma ? ',' : '';  // Don't add space for ports without comma
    e.content = basePadded + commaChar;
  });

  // Third pass: add aligned comments
  // Pad to maxBaseLength + 1 (for the comma position) before adding comments
  const commentAlignPos = maxBaseLength + 1;  // +1 for comma position
  portEntries.forEach(e => {
    if (e.comment) {
      e.content = e.content!.padEnd(commentAlignPos) + ' ' + e.comment;
    }
  });

  const formattedPortLines = entries.map(e => {
    if (e.kind === 'blank') return '';
    if (e.kind === 'separator') return ',';
    if (e.kind === 'directive') return e.content;
    if (e.kind === 'port') return e.content;
    return e.original.trim();
  });

  const out: string[] = [];
  const hasParameters = paramStartIdx !== -1 && paramEndIdx !== -1;
  const indentSpaces = ' '.repeat(cfg.indentSize);
  const moduleNameMatch = moduleDeclLine.match(/^\s*module\s+(\w+)/);
  const moduleNameBase = moduleNameMatch ? 'module ' + moduleNameMatch[1] : moduleDeclLine.replace(/\(.*/, '').trim();

  if (hasParameters) {
    const modNameOnly = (moduleDeclLine.match(/^\s*module\s+(\w+)/)?.[1]) || moduleNameBase.replace(/^module\s+/, '').trim();
    out.push('module ' + modNameOnly + ' #(');
    // Keep original lines (not trimmed) to preserve indentation for continuation lines
    const paramBlockLinesRaw = lines.slice(paramStartIdx, paramEndIdx + 1);
    const innerParamLines: string[] = [];
    paramBlockLinesRaw.forEach(pl => {
      const trimmed = pl.trim();
      if (/#\s*\($/.test(trimmed)) return;
      if (/^\)\s*(\(|$)/.test(trimmed)) return;
      if (trimmed.length) innerParamLines.push(pl); // Push original, not trimmed
    });

    // Process parameter lines preserving commas exactly as they are
    interface ParamInfo {
      original: string;
      kind: 'parameter' | 'continuation' | 'directive' | 'comment' | 'separator';
      content: string;       // The parameter content without comma/comment
      hasComma: boolean;     // Whether this line originally had a comma
      comment: string;       // Any trailing comment
    }

    const paramInfos: ParamInfo[] = [];

    for (let i = 0; i < innerParamLines.length; i++) {
      const originalLine = innerParamLines[i];
      const trimmed = originalLine.trim();

      // Handle standalone comma (inside ifdef blocks)
      if (/^,\s*$/.test(trimmed)) {
        paramInfos.push({ original: originalLine, kind: 'separator', content: ',', hasComma: false, comment: '' });
        continue;
      }

      // Handle directives (ifdef, else, endif)
      if (/^`(ifn?def|else|endif)\b/.test(trimmed)) {
        paramInfos.push({ original: originalLine, kind: 'directive', content: trimmed, hasComma: false, comment: '' });
        continue;
      }

      // Handle comment-only lines
      if (/^\/\//.test(trimmed)) {
        paramInfos.push({ original: originalLine, kind: 'comment', content: trimmed, hasComma: false, comment: '' });
        continue;
      }

      // Handle parameter lines
      if (/^(parameter|localparam)\b/.test(trimmed)) {
        // Extract comment
        const commentMatch = trimmed.match(/(.*?)(\/\/.*)$/);
        const comment = commentMatch ? commentMatch[2].replace(/\/\/\s?/, '// ').trim() : '';
        let body = (commentMatch ? commentMatch[1] : trimmed).trim();
        
        // Check for trailing comma BEFORE removing it
        const hasComma = /,\s*$/.test(body);
        body = body.replace(/,\s*$/, '').trim();

        paramInfos.push({ original: originalLine, kind: 'parameter', content: body, hasComma, comment });
        continue;
      }

      // Handle continuation lines (multi-line parameter values)
      // These are lines that don't start with parameter/directive but are part of a multi-line value
      // Preserve their FULL original line content (including indentation)
      const commentMatch = trimmed.match(/(.*?)(\/\/.*)$/);
      const comment = commentMatch ? commentMatch[2].replace(/\/\/\s?/, '// ').trim() : '';
      let body = (commentMatch ? commentMatch[1] : trimmed).trim();
      const hasComma = /,\s*$/.test(body);
      body = body.replace(/,\s*$/, '').trim();

      // For continuation lines, store the original line with whitespace preserved
      // Remove the comma and comment from the original to reconstruct later
      let preservedContent = originalLine;
      if (comment) {
        preservedContent = originalLine.replace(/\/\/.*$/, '').trimEnd();
      }
      if (hasComma) {
        preservedContent = preservedContent.replace(/,\s*$/, '');
      }

      paramInfos.push({ original: originalLine, kind: 'continuation', content: preservedContent, hasComma, comment });
    }

    // Calculate max content length for comma alignment (only for parameter lines)
    const allParamLines = paramInfos.filter(p => p.kind === 'parameter');
    const maxContentLen = allParamLines.length > 0
      ? Math.max(...allParamLines.map(p => p.content.length))
      : 0;

    // Build output lines
    paramInfos.forEach(info => {
      if (info.kind === 'separator') {
        // Standalone comma - preserve as-is
        out.push(indentSpaces + ',');
        return;
      }

      if (info.kind === 'directive') {
        out.push(indentSpaces + info.content);
        return;
      }

      if (info.kind === 'comment') {
        out.push(indentSpaces + info.content);
        return;
      }

      if (info.kind === 'continuation') {
        // Continuation lines - preserve original content/indentation, just handle comma
        const commaStr = info.hasComma ? ',' : '';
        if (info.comment) {
          out.push(info.content + commaStr + ' ' + info.comment);
        } else {
          out.push(info.content + commaStr);
        }
        return;
      }

      // Regular parameter line - only pad if it has a comma (to align commas)
      // Lines without commas should NOT get trailing whitespace
      if (info.hasComma) {
        const paddedContent = info.content.padEnd(maxContentLen);
        const baseLine = indentSpaces + paddedContent + ',';
        if (info.comment) {
          out.push(baseLine + ' ' + info.comment);
        } else {
          out.push(baseLine);
        }
      } else {
        // No comma - don't pad, just output the content as-is
        const baseLine = indentSpaces + info.content;
        if (info.comment) {
          out.push(baseLine + ' ' + info.comment);
        } else {
          out.push(baseLine);
        }
      }
    });

    const havePorts = formattedPortLines.some(l => l.trim().length);
    if (havePorts && !inlinePortAfterParams) {
      out.push(indentSpaces + ')');
      out.push(indentSpaces + '(');
    } else {
      out.push(indentSpaces + ')');
    }
  } else {
    const inlineTailMatch = moduleDeclLine.match(/\(\s*(.*)$/);
    let inlineTail = '';
    if (inlineTailMatch) inlineTail = inlineTailMatch[1].replace(/\)\s*;?\s*$/, '').trim();
    out.push(moduleNameBase + ' (');
    if (inlineTail) formattedPortLines.unshift(inlineTail.replace(/,\s*$/, ',').trim());
  }

  // Ports should have the same indentation as parameters
  const portIndent = indentSpaces;
  formattedPortLines.forEach(l => { out.push(l === '' ? '' : portIndent + l); });
  out.push(portIndent + ');');
  for (let i = 1; i < out.length - 1; i++) {
    if (/^\s*\($/.test(out[i]) && /^\s*\($/.test(out[i+1])) { out.splice(i+1,1); i--; }
  }

  // Add back any lines that were after the module header
  return [...out, ...remainingLines];
}

function alignModuleHeaderParameterLines(lines: string[]): string[] {
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

function alignParameterLines(lines: string[]): string[] {
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

function isAssignmentLine(line: string): boolean {
  if (/^\s*assign\b/.test(line)) return true;
  if (/^\s*(wire|reg|logic|input|output|inout)\b/.test(line)) return false;
  if (/^[^\/]*?(?:<=|=)(?![=]).*;\s*(\/\/.*)?$/.test(line) && !/\b(?:always|if|else)\s*\(/.test(line) ) return true; // fixed missing parenthesis
  return false;
}

function applyCommentColumn(line: string, cfg: Config): string {
  if (cfg.commentColumn <= 0) return line;
  const idx = line.indexOf('//');
  if (idx === -1) return line;
  const prefix = line.substring(0, idx).replace(/\s+$/,'');
  const comment = line.substring(idx).replace(/\/\/\s?/, '// ');
  if (prefix.length >= cfg.commentColumn) return prefix + ' ' + comment;
  const spaces = ' '.repeat(cfg.commentColumn - prefix.length);
  return prefix + spaces + comment;
}

function wrapComment(line: string, maxLen: number): string {
  const m = line.match(/^(\s*\/\/)(\s*)(.*)$/);
  if (!m) return line;
  const lead = m[1] + (m[2] || '');
  const text = m[3];
  if (line.length <= maxLen) return line;
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  words.forEach(w => {
    if ((lead.length + current.length + w.length + 1) > maxLen) {
      lines.push(lead + current.trim());
      current = w + ' ';
    } else {
      current += w + ' ';
    }
  });
  if (current.trim().length) lines.push(lead + current.trim());
  return lines.join('\n');
}

function alignAssignmentGroup(lines: string[]): string[] {
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

function alignWireDeclGroup(lines: string[], cfg: Config): string[] {
  // Enhanced: comments and macro directives inside a declaration block do NOT break alignment; they pass through.
  interface DeclRow { indent: string; keyword: string; typeKeyword: string; range: string; name: string; initLines: string[]; hasInit: boolean; comment: string; originalLines: string[]; isMultiNames: boolean; namesList: string; isPassthrough: boolean; }

  function isDeclStart(l: string): boolean { return /^\s*(wire|reg|logic|input|output|inout|integer)\b/.test(l); }
  function isMacro(l: string): boolean { return /^\s*`(ifn?def|else|endif)\b/.test(l); }
  function isComment(l: string): boolean { return /^\s*\/\//.test(l); }

  // Build blocks: a declaration (possibly multi-line until semicolon), or standalone passthrough lines (comments/macros)
  const blocks: string[][] = [];
  let collecting = false;
  let current: string[] = [];
  lines.forEach(l => {
    if (!collecting && isDeclStart(l)) {
      // start new declaration block
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
    // Not collecting declaration; treat comment/macro as passthrough; other lines ignored (should not appear here)
    if (isComment(l) || isMacro(l)) {
      blocks.push([l]);
      return;
    }
    // Fallback: treat as standalone block (will be passed through unchanged)
    blocks.push([l]);
  });
  if (current.length) blocks.push(current);

  // Don't normalize indent - preserve original indentation for each declaration
  const rows: DeclRow[] = blocks.map(block => {
    const first = block[0];
    const indent = (first.match(/^\s*/)?.[0]) || ''; // Preserve original indent
    const isPass = isComment(first) || isMacro(first) || !isDeclStart(first);
    if (isPass) {
      return { indent, keyword: '', typeKeyword: '', range: '', name: '', initLines: [], hasInit: false, comment: '', originalLines: block, isMultiNames: false, namesList: '', isPassthrough: true };
    }
    const commentMatchLast = block[block.length - 1].match(/(.*?)(\/\/.*)$/);
    const endComment = commentMatchLast ? commentMatchLast[2].replace(/\/\/\s?/, '// ').trim() : '';
    const bodyFirst = first.replace(/(\/\/.*)$/, '').trim();
    // Match: (input|output|inout|integer)? (wire|reg|logic)? [range]? name
    // Note: integer is a standalone type without range
    const declMatch = bodyFirst.match(/^(input|output|inout|wire|reg|logic|integer)\s*(?:(wire|reg|logic)\s*)?(\[[^\]]+\])?\s*(.*)$/);
    if (declMatch) {
      const firstKeyword = declMatch[1];
      const secondKeyword = declMatch[2] || '';
      // If first is input/output/inout, that's direction, second is type
      // If first is wire/reg/logic/integer and no second, that's type
      const keyword = /^(input|output|inout)$/.test(firstKeyword) ? firstKeyword : firstKeyword;
      const typeKeyword = /^(input|output|inout)$/.test(firstKeyword) ? secondKeyword : '';
      const range = declMatch[3] ? declMatch[3].trim() : '';
      let remainder = declMatch[4].trim();
      // Check for initialization BEFORE checking for comma (comma might be in the init expression)
      const hasEquals = /\=/.test(remainder);
      if (!hasEquals && /,/.test(remainder)) {
        // Multi-name declaration (no equals sign, but has comma)
        const namesList = remainder.replace(/;\s*$/, '') + (block.length > 1 ? ' ' + block.slice(1, -1).map(b => b.trim()).join(' ') : '');
        return { indent, keyword, typeKeyword, range, name: '', initLines: [], hasInit: false, comment: endComment, originalLines: block, isMultiNames: true, namesList: namesList.replace(/;\s*$/, ''), isPassthrough: false };
      }
      let name = remainder.replace(/;\s*$/, '').trim(); // Trim to remove any trailing spaces
      let initLines: string[] = [];
      let hasInit = false;
      if (hasEquals) {
        const nm = remainder.match(/^([A-Za-z_][A-Za-z0-9_$]*)\s*=\s*(.*)$/);
        if (nm) {
          name = nm[1];
          const firstInit = nm[2].replace(/;\s*$/, '');
          initLines = [firstInit];
          hasInit = true;
        }
      }
      if (block.length > 1) {
        block.slice(1).forEach(ln => {
          const trimmed = ln.replace(/;\s*(\/\/.*)?$/, '').trim();
          if (trimmed.length) initLines.push(trimmed);
        });
        if (initLines.length) hasInit = true;
      }

      // Merge lines that are just opening braces with the next line
      for (let i = 0; i < initLines.length - 1; i++) {
        if (initLines[i].trim() === '{') {
          initLines[i] = '{' + (initLines[i + 1] ? ' ' + initLines[i + 1] : '');
          initLines.splice(i + 1, 1);
          i--; // Re-check current position
        }
      }

      // Merge lines that are just closing braces with the previous line
      for (let i = 1; i < initLines.length; i++) {
        if (/^}[,;]?\s*$/.test(initLines[i].trim())) {
          initLines[i - 1] = initLines[i - 1] + ' ' + initLines[i].trim();
          initLines.splice(i, 1);
          i--; // Re-check current position
        }
      }

      return { indent, keyword, typeKeyword, range, name, initLines, hasInit, comment: endComment, originalLines: block, isMultiNames: false, namesList: '', isPassthrough: false };
    }
    return { indent, keyword: '', typeKeyword: '', range: '', name: first.trim(), initLines: [], hasInit: false, comment: endComment, originalLines: block, isMultiNames: false, namesList: '', isPassthrough: true };
  });

  const decls = rows.filter(r => r.keyword);
  if (!decls.length) {
    // No actual declarations, return passthrough lines unchanged (preserve original indentation)
    return rows.flatMap(r => r.originalLines);
  }

  // Check if all declarations are simple (no ranges, no type keywords, no init)
  // In this case, use simplified alignment with just keyword + name
  const allSimple = decls.every(r => !r.range && !r.typeKeyword && !r.hasInit && !r.isMultiNames);
  if (allSimple) {
    // Calculate max name length for simple declarations
    const maxSimpleName = Math.max(...decls.map(r => r.name.length));
    const keywords = decls.map(r => r.keyword);
    const allSameKeyword = keywords.every(k => k === keywords[0]);

    // Check if already aligned
    let alreadyAligned = true;
    for (const r of rows) {
      if (r.isPassthrough && !r.keyword) continue;
      const keywordPart = allSameKeyword ? r.keyword : r.keyword.padEnd(Math.max(...decls.map(d => d.keyword.length)));
      const nameCol = r.name.padEnd(maxSimpleName);
      const expectedLine = r.indent + keywordPart + ' ' + nameCol + ';' + (r.comment ? ' ' + r.comment : '');
      if (r.originalLines[0] !== expectedLine) {
        alreadyAligned = false;
        break;
      }
    }

    if (alreadyAligned) {
      return rows.flatMap(r => r.originalLines);
    }

    return rows.flatMap(r => {
      if (r.isPassthrough && !r.keyword) {
        return r.originalLines;
      }
      // If all keywords are the same, don't pad them
      const keywordPart = allSameKeyword ? r.keyword : r.keyword.padEnd(Math.max(...decls.map(d => d.keyword.length)));
      const nameCol = r.name.padEnd(maxSimpleName);
      const line = r.indent + keywordPart + ' ' + nameCol + ';' + (r.comment ? ' ' + r.comment : '');
      return [line];
    });
  }

  const multiNameRows = decls.filter(r => r.isMultiNames);
  const singleRows = decls.filter(r => !r.isMultiNames);
  const maxKeyword = Math.max(...decls.map(r => r.keyword.length));
  const maxTypeKeyword = Math.max(0, ...decls.map(r => r.typeKeyword.length));
  const maxRange = Math.max(0, ...decls.map(r => r.range.length));
  const maxNamesList = multiNameRows.length ? Math.max(...multiNameRows.map(r => r.namesList.length)) : 0;

  // For declarations WITHOUT init, calculate their own max name width
  const declsWithoutInit = singleRows.filter(r => !r.hasInit);
  const maxSingleNameNoInit = declsWithoutInit.length ? Math.max(...declsWithoutInit.map(r => r.name.length)) : 0;

  const multiNamesLengths = multiNameRows.map(r => {
    const keywordCol = r.keyword.padEnd(maxKeyword);
    const typeKeywordCol = maxTypeKeyword ? r.typeKeyword.padEnd(maxTypeKeyword) : '';
    const rangeCol = maxRange ? r.range.padStart(maxRange) : '';
    const namesCol = r.namesList.padEnd(maxNamesList);
    const segs = [keywordCol]; if (maxTypeKeyword) segs.push(typeKeywordCol); if (maxRange) segs.push(rangeCol); segs.push(namesCol);
    return segs.join(' ').length;
  });
  const noInitLengths = declsWithoutInit.map(r => {
    const keywordCol = r.keyword.padEnd(maxKeyword);
    const typeKeywordCol = maxTypeKeyword ? r.typeKeyword.padEnd(maxTypeKeyword) : '';
    const rangeCol = maxRange ? r.range.padStart(maxRange) : '';
    const nameCol = r.name.padEnd(maxSingleNameNoInit);
    const segs = [keywordCol]; if (maxTypeKeyword) segs.push(typeKeywordCol); if (maxRange) segs.push(rangeCol); segs.push(nameCol);
    return segs.join(' ').length;
  });
  const maxBodyLenNoInit = [...multiNamesLengths, ...noInitLengths].length ? Math.max(...[...multiNamesLengths, ...noInitLengths]) : 0;

  // For declarations WITH init, calculate their own max name width and align the '=' sign
  const declsWithInit = singleRows.filter(r => r.hasInit);
  const maxSingleNameWithInit = declsWithInit.length ? Math.max(...declsWithInit.map(r => r.name.length)) : 0;

  const maxDeclBeforeEquals = declsWithInit.length ? Math.max(...declsWithInit.map(r => {
    const keywordCol = r.keyword.padEnd(maxKeyword);
    const typeKeywordCol = maxTypeKeyword ? r.typeKeyword.padEnd(maxTypeKeyword) : '';
    const rangeCol = maxRange ? r.range.padStart(maxRange) : '';
    const nameCol = r.name.padEnd(maxSingleNameWithInit);
    const segs = [keywordCol]; if (maxTypeKeyword) segs.push(typeKeywordCol); if (maxRange) segs.push(rangeCol); segs.push(nameCol);
    return segs.join(' ').length;
  })) : 0;

  // Calculate maximum semicolon position for alignment
  // Semicolon should be right after the longest NAME (without padding ranges/keywords)
  const maxSemicolonPos = Math.max(...rows.filter(r => r.keyword || r.isPassthrough).map(r => {
    if (r.isPassthrough && !r.keyword) return 0;
    const keywordCol = r.keyword.padEnd(maxKeyword);
    const typeKeywordCol = maxTypeKeyword ? r.typeKeyword.padEnd(maxTypeKeyword) : '';
    const rangeCol = maxRange ? r.range.padStart(maxRange) : '';

    if (r.isMultiNames) {
      const namesCol = r.namesList.trim();
      const segs = [keywordCol]; if (maxTypeKeyword) segs.push(typeKeywordCol); if (rangeCol) segs.push(rangeCol); segs.push(namesCol);
      const pos = r.indent.length + segs.join(' ').length;
      // Exclude if adding semicolon would exceed line length
      return (pos + 1 + (r.comment ? r.comment.length + 1 : 0) <= cfg.lineLength) ? pos : 0;
    } else {
      const nameCol = r.name.trim();
      const segs = [keywordCol]; if (maxTypeKeyword) segs.push(typeKeywordCol); if (rangeCol) segs.push(rangeCol); segs.push(nameCol);
      let baseDecl = segs.join(' ');
      if (r.hasInit) {
        // For init declarations, include only single-line inits in semicolon alignment
        if (r.initLines.length <= 1) {
          const paddedBase = baseDecl.padEnd(maxDeclBeforeEquals);
          const initValue = (r.initLines[0] || '').trim();
          const pos = r.indent.length + paddedBase.length + ' = '.length + initValue.length;
          // Exclude if adding semicolon would exceed line length
          return (pos + 1 + (r.comment ? r.comment.length + 1 : 0) <= cfg.lineLength) ? pos : 0;
        } else {
          return 0;
        }
      } else {
        const pos = r.indent.length + baseDecl.length;
        // Exclude if adding semicolon would exceed line length
        return (pos + 1 + (r.comment ? r.comment.length + 1 : 0) <= cfg.lineLength) ? pos : 0;
      }
    }
  }));

  // Check if already aligned: compare what we would generate vs what we have
  let alreadyAligned = true;
  let declIndex = 0;
  for (const r of rows) {
    if (r.isPassthrough && !r.keyword) continue; // skip passthrough
    const expectedKeywordCol = r.keyword.padEnd(maxKeyword);
    const expectedTypeKeywordCol = maxTypeKeyword ? r.typeKeyword.padEnd(maxTypeKeyword) : '';
    const expectedRangeCol = maxRange ? r.range.padStart(maxRange) : '';

    if (r.isMultiNames) {
      const expectedNamesCol = r.namesList.trim();
      const segs = [expectedKeywordCol]; if (maxTypeKeyword) segs.push(expectedTypeKeywordCol); if (expectedRangeCol) segs.push(expectedRangeCol); segs.push(expectedNamesCol);
      const lineBeforeSemi = r.indent + segs.join(' ');
      const padding = ' '.repeat(Math.max(0, maxSemicolonPos - lineBeforeSemi.length));
      const expectedLine = lineBeforeSemi + padding + ';' + (r.comment ? ' ' + r.comment : '');
      if (r.originalLines[0] !== expectedLine) {
        alreadyAligned = false;
        break;
      }
    } else {
      const expectedNameCol = r.name.trim();
      const segs = [expectedKeywordCol]; if (maxTypeKeyword) segs.push(expectedTypeKeywordCol); if (expectedRangeCol) segs.push(expectedRangeCol); segs.push(expectedNameCol);
      let baseDecl = segs.join(' ');

      if (r.hasInit) {
        // Align '=' sign like assign statements
        const paddedBase = baseDecl.padEnd(maxDeclBeforeEquals);
        const initPart = ' = ' + (r.initLines[0] || '').trim();
        if (r.initLines.length <= 1) {
          // Single-line init: align semicolon with other declarations
          const lineBeforeSemi = r.indent + paddedBase + initPart;
          const padding = ' '.repeat(Math.max(0, maxSemicolonPos - lineBeforeSemi.length));
          const expectedFirstLine = lineBeforeSemi + padding + ';' + (r.comment ? ' ' + r.comment : '');
          if (r.originalLines[0] !== expectedFirstLine) {
            alreadyAligned = false;
            break;
          }
        } else {
          // Multi-line init: check first line without semicolon
          const expectedFirstLine = r.indent + paddedBase + initPart;
          if (r.originalLines[0] !== expectedFirstLine) {
            alreadyAligned = false;
            break;
          }
        }
        // Check multi-line continuation alignment
        if (r.initLines.length > 1) {
          const contIndentLen = (r.indent + paddedBase + ' = ').length;
          const contIndentSpaces = ' '.repeat(contIndentLen);
          const lastIdx = r.initLines.length - 1;
          for (let i2 = 1; i2 < r.initLines.length; i2++) {
            const trimmed = r.initLines[i2].trim();
            const isLast = i2 === lastIdx;
            let expectedCont = contIndentSpaces + trimmed;
            if (isLast) {
              expectedCont += ';' + (r.comment ? ' ' + r.comment : '');
            }
            if (r.originalLines[i2] !== expectedCont) {
              alreadyAligned = false;
              break;
            }
          }
          if (!alreadyAligned) break;
        }
      } else {
        const lineBeforeSemi = r.indent + baseDecl;
        const padding = ' '.repeat(Math.max(0, maxSemicolonPos - lineBeforeSemi.length));
        const expectedLine = lineBeforeSemi + padding + ';' + (r.comment ? ' ' + r.comment : '');
        if (r.originalLines[0] !== expectedLine) {
          alreadyAligned = false;
          break;
        }
      }
    }
    declIndex++;
  }

  // If already aligned, return original lines unchanged
  if (alreadyAligned) {
    return rows.flatMap(r => r.originalLines);
  }

  const out: string[] = [];
  rows.forEach(r => {
    if (r.isPassthrough && !r.keyword) {
      // emit original lines unchanged (preserve intra-group comments/macros)
      r.originalLines.forEach(ln => out.push(ln));
      return;
    }
    const keywordCol = r.keyword.padEnd(maxKeyword);
    const typeKeywordCol = maxTypeKeyword ? r.typeKeyword.padEnd(maxTypeKeyword) : '';
    const rangeCol = maxRange ? r.range.padStart(maxRange) : '';
    if (r.isMultiNames) {
      const namesCol = r.namesList.trim();
      const segs = [keywordCol]; if (maxTypeKeyword) segs.push(typeKeywordCol); if (rangeCol) segs.push(rangeCol); segs.push(namesCol);
      const lineBeforeSemi = r.indent + segs.join(' ');
      const wouldExceedLimit = (lineBeforeSemi.length + 1 + (r.comment ? r.comment.length + 1 : 0)) > cfg.lineLength;
      if (wouldExceedLimit) {
        out.push(lineBeforeSemi + ';' + (r.comment ? ' ' + r.comment : ''));
      } else {
        const padding = ' '.repeat(Math.max(0, maxSemicolonPos - lineBeforeSemi.length));
        out.push(lineBeforeSemi + padding + ';' + (r.comment ? ' ' + r.comment : ''));
      }
    } else {
      const nameCol = r.name.trim();
      const segs = [keywordCol]; if (maxTypeKeyword) segs.push(typeKeywordCol); if (rangeCol) segs.push(rangeCol); segs.push(nameCol);
      let baseDecl = segs.join(' ');
      if (r.hasInit) {
        // Align '=' sign like assign statements: pad base to max, then add ' = value'
        const paddedBase = baseDecl.padEnd(maxDeclBeforeEquals);
        const initPart = ' = ' + (r.initLines[0] || '').trim();
        if (r.initLines.length <= 1) {
          // Single-line init: align semicolon if within line length limit
          const lineBeforeSemi = r.indent + paddedBase + initPart;
          const wouldExceedLimit = (lineBeforeSemi.length + 1 + (r.comment ? r.comment.length + 1 : 0)) > cfg.lineLength;
          if (wouldExceedLimit) {
            // Line too long, don't pad - put semicolon right after
            const firstLine = lineBeforeSemi + ';' + (r.comment ? ' ' + r.comment : '');
            out.push(firstLine);
          } else {
            // Within limit, align semicolon
            const padding = ' '.repeat(Math.max(0, maxSemicolonPos - lineBeforeSemi.length));
            const firstLine = lineBeforeSemi + padding + ';' + (r.comment ? ' ' + r.comment : '');
            out.push(firstLine);
          }
        } else {
          // Multi-line init: no semicolon on first line
          const firstLine = r.indent + paddedBase + initPart;
          out.push(firstLine);
        }
        // Multi-line initialization: align continuation with the first character after '='
        if (r.initLines.length > 1) {
          const contIndentLen = (r.indent + paddedBase + ' = ').length;
          const contIndentSpaces = ' '.repeat(contIndentLen);
          r.initLines.slice(1).forEach((ln, idx) => {
            const trimmed = ln.trim();
            const isLastInitLine = idx === r.initLines.length - 2; // idx is in sliced array, so length-2 is the last
            let cont = contIndentSpaces + trimmed;
            if (isLastInitLine) {
              cont += ';' + (r.comment ? ' ' + r.comment : '');
            }
            out.push(cont);
          });
        }
      } else {
        const lineBeforeSemi = r.indent + baseDecl;
        const wouldExceedLimit = (lineBeforeSemi.length + 1 + (r.comment ? r.comment.length + 1 : 0)) > cfg.lineLength;
        if (wouldExceedLimit) {
          const firstLine = lineBeforeSemi + ';' + (r.comment ? ' ' + r.comment : '');
          out.push(firstLine);
        } else {
          const padding = ' '.repeat(Math.max(0, maxSemicolonPos - lineBeforeSemi.length));
          const firstLine = lineBeforeSemi + padding + ';' + (r.comment ? ' ' + r.comment : '');
          out.push(firstLine);
        }
      }
    }
  });
  return out;
}

function formatModuleInstantiations(lines: string[], indentSize: number): string[] {
  const unit = ' '.repeat(indentSize);
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Detect module instantiation start: module_name #( or module_name instance_name (
    // Must not be a module declaration
    // Must not be an else if statement
    // Must not be generate if/for/case
    const instMatch = line.match(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s+#\s*\(/);
    const simpleInstMatch = !instMatch && !line.trim().startsWith('else ') && !line.trim().startsWith('generate ') && line.match(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);

    // Also detect module_name # on one line with ( on next line (for parameterized instantiations)
    let splitParamMatch = null;
    if (!instMatch && !simpleInstMatch) {
      const moduleHashMatch = line.match(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s+#\s*$/);
      if (moduleHashMatch && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (/^\s*\(/.test(nextLine)) {
          splitParamMatch = moduleHashMatch;
        }
      }
    }

    // Also detect module_name on one line with instance on next line (for simple instantiations)
    let splitInstMatch = null;
    if (!instMatch && !simpleInstMatch && !splitParamMatch) {
      const moduleOnlyMatch = line.match(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)$/);
      if (moduleOnlyMatch && i + 1 < lines.length) {
        const moduleName = moduleOnlyMatch[2];
        // Exclude Verilog keywords that shouldn't be treated as module names
        const keywords = ['begin', 'end', 'if', 'else', 'case', 'endcase', 'for', 'while', 'repeat', 'forever', 'initial', 'always', 'always_ff', 'always_comb', 'always_latch', 'function', 'task', 'endfunction', 'endtask', 'module', 'endmodule', 'input', 'output', 'inout', 'wire', 'reg', 'logic', 'integer', 'parameter', 'localparam', 'generate', 'endgenerate'];
        if (!keywords.includes(moduleName.toLowerCase())) {
          const nextLine = lines[i + 1];
          const instOnNext = nextLine.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
          if (instOnNext && !line.trim().startsWith('module')) {
            splitInstMatch = moduleOnlyMatch;
          }
        }
      }
    }

    if ((instMatch || simpleInstMatch || splitInstMatch || splitParamMatch) && !line.trim().startsWith('module ')) {
      const match = (instMatch || simpleInstMatch || splitInstMatch || splitParamMatch) as RegExpMatchArray;
      let baseIndent = match[1];

      // Determine proper indentation from surrounding context
      // Look at nearby wire/assign/reg declarations to determine module-level indentation
      // But if inside if/else/always blocks, preserve the current indentation
      let foundContext = false;
      let insideControlBlock = false;

      for (let lookback = i - 1; lookback >= Math.max(0, i - 10); lookback--) {
        const prevLine = lines[lookback];
        const prevTrimmed = prevLine.trim();
        // Skip blank lines and comments
        if (!prevTrimmed || prevTrimmed.startsWith('//')) continue;

        // Check if we're inside a control block (if/else/always/begin)
        if (/^\s*(begin|always|always_ff|always_comb|always_latch|initial|if|else)\b/.test(prevLine)) {
          insideControlBlock = true;
          break;
        }

        // Look for declarations that indicate module-level indentation
        if (/^\s*(wire|reg|logic|assign|input|output|inout|parameter|localparam)\b/.test(prevLine)) {
          const contextIndent = (prevLine.match(/^(\s*)/)?.[1]) || '';
          baseIndent = contextIndent;
          foundContext = true;
          break;
        }
      }

      // If inside control block, keep original indentation from the instantiation line
      if (insideControlBlock) {
        baseIndent = match[1];
      }

      // Collect the entire instantiation
      let instLines: string[] = [line];
      let braceCount = (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
      let j = i + 1;

      // Special case: if this is a split param match (module_name # on one line),
      // we need to continue collecting even though braceCount is 0
      const needsContinuation = splitParamMatch !== null;

      while (j < lines.length && (braceCount > 0 || needsContinuation || !/;\s*$/.test(instLines[instLines.length - 1]))) {
        instLines.push(lines[j]);
        braceCount += (lines[j].match(/\(/g) || []).length - (lines[j].match(/\)/g) || []).length;
        j++;

        // Once we've added more lines for split param match, check normally
        if (braceCount === 0 && /;\s*$/.test(instLines[instLines.length - 1])) {
          break;
        }
      }

      // If instantiation is all on one line, split it first
      if (instLines.length === 1 && instLines[0].includes('#') && instLines[0].includes(';')) {
        instLines = splitSingleLineInstantiation(instLines[0], baseIndent);
      }
      
      // Format the instantiation
      const formatted = formatSingleInstantiation(instLines, baseIndent, unit);
      formatted.forEach(l => result.push(l));
      i = j;
    } else {
      result.push(line);
      i++;
    }
  }

  return result;
}

function splitSingleLineInstantiation(line: string, baseIndent: string): string[] {
  // Split a single-line instantiation like:
  // my_fifo #(.DEPTH(16),.WIDTH(8)) u_fifo (.clk(clk),.data_in(din),.data_out(dout));
  // Into multiple lines for easier processing
  
  const trimmed = line.trim();
  const result: string[] = [];
  
  // Extract module name and check for parameters
  const hasParams = /#/.test(trimmed);
  
  if (hasParams) {
    // Find the # and split parameters
    const hashIdx = trimmed.indexOf('#');
    const moduleName = trimmed.substring(0, hashIdx).trim();
    result.push(baseIndent + moduleName + ' #(');
    
    // Extract parameter block (everything between #( and ) before instance name)
    const afterHash = trimmed.substring(hashIdx + 1).trim();
    if (afterHash.startsWith('(')) {
      // Find matching ) for parameters
      let depth = 0;
      let paramEndIdx = -1;
      for (let i = 0; i < afterHash.length; i++) {
        if (afterHash[i] === '(') depth++;
        if (afterHash[i] === ')') {
          depth--;
          if (depth === 0) {
            paramEndIdx = i;
            break;
          }
        }
      }
      
      if (paramEndIdx !== -1) {
        // Extract parameters content (between the parentheses)
        const paramsContent = afterHash.substring(1, paramEndIdx);
        // Split by comma (simple split - doesn't handle nested parens perfectly but works for most cases)
        const params = paramsContent.split(',').map(p => p.trim()).filter(p => p.length > 0);
        params.forEach(p => result.push(baseIndent + '  ' + p + ','));
        
        // Remove trailing comma from last parameter
        if (result.length > 1) {
          const lastParam = result[result.length - 1];
          result[result.length - 1] = lastParam.replace(/,\s*$/, '');
        }
        
        result.push(baseIndent + ')');
        
        // Now handle the port list
        const afterParams = afterHash.substring(paramEndIdx + 1).trim();
        // afterParams should be: instance_name (.clk(clk),.data_in(din),... );
        const instMatch = afterParams.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
        if (instMatch) {
          result.push(baseIndent + instMatch[1] + ' (');
          
          // Find matching ) for ports
          const afterInst = afterParams.substring(afterParams.indexOf('(') + 1);
          let portDepth = 0;
          let portEndIdx = -1;
          for (let i = 0; i < afterInst.length; i++) {
            if (afterInst[i] === '(') portDepth++;
            if (afterInst[i] === ')') {
              portDepth--;
              if (portDepth === -1) {
                portEndIdx = i;
                break;
              }
            }
          }
          
          if (portEndIdx !== -1) {
            const portsContent = afterInst.substring(0, portEndIdx);
            // Split ports by comma (simple - doesn't handle nested parens perfectly)
            const ports = portsContent.split(/,(?![^()]*\))/).map(p => p.trim()).filter(p => p.length > 0);
            ports.forEach(p => result.push(baseIndent + '  ' + p + ','));
            
            // Remove trailing comma from last port
            if (ports.length > 0) {
              const lastPort = result[result.length - 1];
              result[result.length - 1] = lastPort.replace(/,\s*$/, '');
            }
            
            result.push(baseIndent + ');');
          }
        }
      }
    }
  }
  
  return result.length > 0 ? result : [line];
}

function formatSingleInstantiation(lines: string[], baseIndent: string, unit: string): string[] {
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
            // Match signal, numeric literal, or expression in parentheses
            const firstLineMatch = firstLine.match(/^\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+\d+|\([^)]+\))\s*[,}]/);
            if (firstLineMatch && firstLineMatch[2].length > paramMaxSignalLen) {
              paramMaxSignalLen = firstLineMatch[2].length;
            }

            // Check continuation lines for values
            for (const origLine of multilineLines) {
              const trimmed = origLine.trim();
              if (trimmed.startsWith('`') || trimmed.startsWith('//')) continue;

              // Match signal, numeric literal, or expression in parentheses
              const signalMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+\d+|\([^)]+\))\s*[,}]/);
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
            const firstLineMatch = firstLine.match(/^\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+\d+)\s*[,}]/);
            if (firstLineMatch && firstLineMatch[2].length > portMaxSignalLen) {
              portMaxSignalLen = firstLineMatch[2].length;
            }
            const firstLineContinuedMatch = firstLine.match(/^\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?)\s*$/);
            if (firstLineContinuedMatch && firstLineContinuedMatch[2].length > portMaxSignalLen) {
              portMaxSignalLen = firstLineContinuedMatch[2].length;
            }
            const nestedFirstMatch = firstLine.match(/^\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\{(\{[^,}]+|[a-zA-Z_][a-zA-Z0-9_\[\]\-:]+|\d+'\w+\d+)\s*[,}]/);
            if (nestedFirstMatch && nestedFirstMatch[2].length > portMaxSignalLen) {
              portMaxSignalLen = nestedFirstMatch[2].length;
            }

            // Check continuation lines for signals
            for (const origLine of multilineLines) {
              const trimmed = origLine.trim();
              if (trimmed.startsWith('`') || trimmed.startsWith('//')) continue;

              const signalMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+\d+)\s*[,}]/);
              if (signalMatch && signalMatch[1].length > portMaxSignalLen) {
                portMaxSignalLen = signalMatch[1].length;
              }
              const commaLeftMatch = trimmed.match(/^,\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+\d+)(?:\s*,|\s*$)?/);
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
              const firstLineContent = contentMatch[1].trim();
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
              // For concatenations, track signal name length (including numeric literals like 8'd0 and array indices like signal[0])
              const signalMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+\d+)\s*[,}]/);
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
              // Strip closing paren/comma before measuring
              let content = trimmed;
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
    // Based on the longest actual content
    const paramContentIndent = (baseIndent + unit).length + 1 + maxParamPort + 2; // Position where content starts: "." + name + " ("
    // For concatenations: add 1 for '{', for others just use content length
    const maxConcatLen = globalMaxParamSignalLen > 0 ? globalMaxParamSignalLen + 1 : 0; // +1 for '{'
    const paramClosingParenCol = paramContentIndent + Math.max(maxParamConn, maxConcatLen, globalMaxParamContentLen);

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
          const paramMaxSignalLen = p.maxSignalLen; // Use per-parameter max signal length

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

              // Type 1: Concatenation pattern ".PARAM ({value ," (value can be signal name, array index, numeric literal, or expression in parentheses)
              const concatMatch = trimmedWithoutComment.match(/^\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+\d+|\([^)]+\))\s*(.*)$/);
              if (concatMatch) {
                isConcatenation = true;
                paramContinuationIndent = ' '.repeat((baseIndent + unit).length + 1 + maxParamPort + 2); // +2 for "({"
                const paramName = concatMatch[1];
                const firstValue = concatMatch[2];
                const remainder = concatMatch[3].trim();
                const paramPadded = paramName.padEnd(maxParamPort);
                let formattedRemainder = remainder;
                if (remainder.startsWith(',')) {
                  // Subtract 1 because continuation lines with { have that { included in their length,
                  // but the first line doesn't have { as part of the value (it's part of the opening ({)
                  const spacesBeforeComma = Math.max(0, paramMaxSignalLen - firstValue.length - 1);
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
            } else if (/}\s*\),?$/.test(origTrimmed)) {
              // Closing line like "value })," or "value})" or standalone "})"
              // Handle this BEFORE general value matching
              const closingMatch = lineWithoutComment.trim().match(/^([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+\d+)(\s*.*)$/);
              if (closingMatch) {
                const valueName = closingMatch[1];
                const fullRemainder = closingMatch[2];
                const hasComma = fullRemainder.trimEnd().endsWith(',');
                const closingStr = hasComma ? '}),' : '})';
                // Align ) to paramClosingParenCol
                // First align the value's comma, then position }), similar to signal lines
                const spacesBeforeClosing = paramMaxSignalLen - valueName.length;
                const padding = spacesBeforeClosing > 0 ? ' '.repeat(spacesBeforeClosing) : '';
                // Then calculate padding to align ) at paramClosingParenCol
                const braceCol = paramContinuationIndent.length + valueName.length + padding.length; // position of }
                const parenPadding = Math.max(0, paramClosingParenCol - braceCol - 1); // -1 for }
                const baseLine = paramContinuationIndent + valueName + padding + '}' + ' '.repeat(parenPadding) + ')' + (hasComma ? ',' : '');
                paramLineInfos.push({ line: baseLine, comment: lineComment, isMultiline: true, lineIndex: lineIdx });
              } else {
                // Standalone closing "})," or "})" - align } at comma position, ) at closing paren position
                const trimmed = lineWithoutComment.trim();
                const hasComma = trimmed.endsWith(',');
                const closingStr = hasComma ? '}),' : '})';

                // Calculate padding: } should be at paramMaxSignalLen position
                // Position calculation: paramContinuationIndent + padding + }
                const bracePadding = Math.max(0, paramMaxSignalLen);
                const parenPadding = Math.max(0, paramClosingParenCol - paramContinuationIndent.length - bracePadding - 1); // -1 for }
                const baseLine = paramContinuationIndent + ' '.repeat(bracePadding) + '}' + ' '.repeat(parenPadding) + ')' + (hasComma ? ',' : '');
                paramLineInfos.push({ line: baseLine, comment: lineComment, isMultiline: true, lineIndex: lineIdx });
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
              // Match: signal_name, signal_name[index], numeric literals like 8'd0, or expressions in parentheses like (A-1)
              const signalMatch = trimmedWithoutComment.match(/^([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+\d+|\([^)]+\))\s*(.*)$/);
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
            // Try to match simple signal, array index, or numeric literal first: .portname ({signalname , or .portname ({signal[0] , or .portname ({8'd0 ,
            const firstLineMatch = origTrimmed.match(/^\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+\d+)\s*(.*)$/);
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
              const replicationFirstMatch = origTrimmed.match(/^\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\{(\{\{?[^,}]+\{[^}]+\}\}|[a-zA-Z_][a-zA-Z0-9_\[\]\-:]+|\d+'\w+\d+)\s*(.*)$/);
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
            // Signal lines: align commas (includes signal names, array indices, and numeric literals)
            const signalMatch = origTrimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?|\d+'\w+\d+)\s*(.*)$/);
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

/**
 * Align multiline if/for/while conditions
 * Lines within parentheses should align with the column after the opening parenthesis
 * Excludes module declarations to avoid interfering with parameter/port formatting
 */
function alignMultilineConditions(lines: string[]): string[] {
  const result: string[] = [];
  let parenStack: number[] = []; // Stack to track column positions of opening parentheses
  let insideModuleDecl = false; // Skip alignment inside module declarations
  let moduleDepth = 0; // Track nested parentheses in module header

  // Check if we're starting inside a module declaration (for selection formatting)
  // Look for module keyword or parameter/port declarations with standard 2-space indent
  if (lines.length > 0) {
    let hasModuleKeyword = false;
    let hasClosingParen = false;
    let hasStandardParamIndent = false;

    for (let i = 0; i < Math.min(lines.length, 50); i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (/^\s*module\s+\w+/.test(line)) {
        hasModuleKeyword = true;
      }
      if (/\)\s*;\s*$/.test(line)) {
        hasClosingParen = true;
      }
      // Check for parameter/port with exactly 2 spaces indent (formatModuleHeader style)
      // Skip lines starting with ` (compiler directives)
      if (!line.startsWith('`') && /^  (parameter|input|output|inout)\b/.test(line) && !line.startsWith('   ')) {
        hasStandardParamIndent = true;
      }
    }

    // If we see standard 2-space parameter/port indent, we're in a formatted module header
    if (hasStandardParamIndent) {
      insideModuleDecl = true;
      // Initialize moduleDepth by counting parentheses in the first few lines
      for (let i = 0; i < Math.min(lines.length, 50); i++) {
        const line = lines[i];
        for (let j = 0; j < line.length; j++) {
          if (line[j] === '(') moduleDepth++;
          if (line[j] === ')') moduleDepth--;
        }
        // Stop counting if we hit the closing );
        if (/\)\s*;\s*$/.test(line)) {
          break;
        }
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('`')) {
      result.push(line);
      continue;
    }

    // Detect module declaration start
    if (/^\s*module\s+\w+/.test(line)) {
      // Only reset moduleDepth if we weren't already tracking from pre-scan
      if (!insideModuleDecl) {
        moduleDepth = 0;
      }
      insideModuleDecl = true;
      result.push(line);
      continue;
    }

    // Track parentheses depth in module declaration
    if (insideModuleDecl) {
      for (let j = 0; j < line.length; j++) {
        if (line[j] === '(') moduleDepth++;
        if (line[j] === ')') moduleDepth--;
      }

      // Exit module declaration when we see ); at the end
      if (moduleDepth <= 0 && /\)\s*;\s*$/.test(line)) {
        insideModuleDecl = false;
      }

      result.push(line);
      continue;
    }

    // Check if this is an if/for/while statement
    const isControlStatement = /^\s*(if|for|while)\s*\(/.test(line);

    if (isControlStatement) {
      result.push(line);

      // Find the position of the opening parenthesis and track parentheses
      const match = line.match(/^(\s*)(if|for|while)\s*\(/);
      if (match) {
        const alignColumn = match[0].length; // Column after the opening (
        parenStack = []; // Reset stack for new statement

        // Count parentheses in the line to track if statement continues
        let openCount = 0;
        let closeCount = 0;
        for (let j = 0; j < line.length; j++) {
          if (line[j] === '(') openCount++;
          if (line[j] === ')') closeCount++;
        }

        // If there are unclosed parentheses, track the alignment column
        if (openCount > closeCount) {
          parenStack.push(alignColumn);
        }
      }
      continue;
    }

    // If we're inside a multiline condition (parenStack not empty)
    if (parenStack.length > 0) {
      const alignColumn = parenStack[0];

      // Count parentheses in this line
      let openCount = 0;
      let closeCount = 0;
      for (let j = 0; j < trimmed.length; j++) {
        if (trimmed[j] === '(') openCount++;
        if (trimmed[j] === ')') closeCount++;
      }

      // Align this line to the column after the opening parenthesis
      const alignedLine = ' '.repeat(alignColumn) + trimmed;
      result.push(alignedLine);

      // If all parentheses are now closed, clear the stack
      closeCount -= openCount;
      if (closeCount >= parenStack.length) {
        parenStack = [];
      }
      continue;
    }

    // Not in a multiline condition, just pass through
    result.push(line);
  }

  return result;
}

function indentAlwaysBlocks(lines: string[], indentSize: number): string[] {
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
      let nestingLevel = beginEndStack.length;

      // If we're expecting a single statement (from previous if/else/for without begin), add one more level
      if (expectSingleStatement && !isElse && !isIf && !isFor) {
        nestingLevel++;
        expectSingleStatement = false; // Reset after applying
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
        const newLine = currentLineIndent + trimmed;
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

/**
 * Move standalone "begin" to the previous line if it ends with ")"
 * This handles multi-line if conditions where begin should be on same line as closing )
 * Example:
 *   if (a && b
 *       || c)
 *   begin  ← should move to line above
 */
function moveBeginToSameLine(lines: string[]): string[] {
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if this is a standalone "begin" keyword
    if (trimmed === 'begin' && result.length > 0) {
      // Look backwards to find the most recent non-blank line
      let targetIdx = result.length - 1;
      while (targetIdx >= 0 && result[targetIdx].trim() === '') {
        targetIdx--;
      }

      if (targetIdx >= 0) {
        const targetLine = result[targetIdx];
        const targetTrimmed = targetLine.trim();

        // Match lines ending with ) or ) followed by comment
        if (/\)\s*(?:\/\/.*)?$/.test(targetTrimmed)) {
          // Move begin to the target line
          result[targetIdx] = targetLine.replace(/\s*(?:\/\/.*)?$/, ' begin');
          // Remove any blank lines between ) and begin
          while (result.length > targetIdx + 1) {
            result.pop();
          }
          // Skip adding the current standalone begin line
          continue;
        }
      }
    }

    result.push(line);
  }

  return result;
}

/**
 * Fix invalid "end if" syntax by splitting into two lines: "end" and "if"
 * This handles malformed code like: "end if (condition) begin"
 * which should be either "end else if" or "end" followed by "if" on next line
 */
function fixEndIfPattern(lines: string[]): string[] {
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect "end if" pattern (not "end else if" which is valid)
    // Match: "end" followed by "if" on the same line
    const match = trimmed.match(/^end\s+(if\s*\(.*)/);
    if (match && !/^end\s+else\s+if/.test(trimmed)) {
      // Extract the indentation and the if part
      const indent = line.match(/^(\s*)/)?.[1] || '';
      const ifPart = match[1];

      // Split into two lines: "end" and "if (...) begin"
      result.push(indent + 'end');
      result.push(indent + ifPart);
    } else {
      result.push(line);
    }
  }

  return result;
}

function fixModuleLevelIndentation(lines: string[], indentSize: number): string[] {
  const unit = ' '.repeat(indentSize);
  const result: string[] = [];
  let insideModule = false;
  let insideModuleHeader = false;
  let insideAlwaysOrInitial = false;
  let blockDepth = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Track module boundaries
    if (/^module\s+\w+/.test(trimmed)) {
      insideModule = true;
      insideModuleHeader = true; // Module header starts
      result.push(line);
      continue;
    }

    // Module header ends with closing );
    if (insideModuleHeader && /^\);/.test(trimmed)) {
      insideModuleHeader = false;
      result.push(line);
      continue;
    }

    if (/^endmodule\b/.test(trimmed)) {
      insideModule = false;
      result.push(line);
      continue;
    }

    // Track always/initial blocks
    if (/^always\b|^initial\b/.test(trimmed)) {
      insideAlwaysOrInitial = true;
      result.push(line);
      continue;
    }

    // Track begin/end depth
    if (/\bbegin\b/.test(trimmed) && !/\/\/.*\bbegin\b/.test(line)) {
      blockDepth++;
      result.push(line);
      continue;
    }
    if (/^end\b/.test(trimmed) && !/^endmodule\b|^endcase\b|^endgenerate\b/.test(trimmed)) {
      blockDepth--;
      if (blockDepth < 0) blockDepth = 0; // Safety: prevent negative depth
      if (blockDepth === 0) {
        insideAlwaysOrInitial = false;
      }
      result.push(line);
      continue;
    }
    if (/^endcase\b/.test(trimmed)) {
      result.push(line);
      continue;
    }

    // Fix indentation for module-level declarations (wire/reg/logic/input/output/inout)
    // BUT skip if we're still in the module header (port declarations)
    if (insideModule && !insideModuleHeader && !insideAlwaysOrInitial && blockDepth === 0) {
      if (/^(wire|reg|logic|input|output|inout)\b/.test(trimmed)) {
        // This is a module-level declaration - fix indentation to module unit
        result.push(unit + trimmed);
        continue;
      }
    }

    result.push(line);
  }

  return result;
}

function indentCaseStatements(lines: string[], indentSize: number): string[] {
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
        result.push(caseInfo.caseItemIndent + trimmed);

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
        result.push(contentIndent + trimmed);

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

/**
 * Normalize ifdef/ifndef/else/endif directive indentation to align with the code they protect.
 * This ensures directives have the same indentation as the statements within their blocks.
 */
function normalizeIfdefIndentation(lines: string[]): string[] {
  const result: string[] = [];

  // Track ifdef indentation for matching endif
  interface IfdefBlock {
    indent: string;
    lineIndex: number;
  }
  const ifdefStack: IfdefBlock[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if this is an ifdef-related directive
    if (trimmed.startsWith('`ifdef') || trimmed.startsWith('`ifndef') ||
        trimmed.startsWith('`elsif') || trimmed.startsWith('`else') ||
        trimmed.startsWith('`endif')) {

      // Skip normalization if this directive is part of a multiline parameter/port block
      // Indicated by the next line being a closing paren or closing brace
      const nextNonBlank = lines.slice(i + 1).find(l => l.trim() !== '');
      if (nextNonBlank && /^\s*[\)\}]/.test(nextNonBlank)) {
        // This directive is followed by a closing paren/brace - likely part of a parameter block
        // Keep the original indentation
        result.push(line);
        continue;
      }

      // Handle endif - align with its matching ifdef
      if (trimmed.startsWith('`endif')) {
        if (ifdefStack.length > 0) {
          const matchingIfdef = ifdefStack.pop()!;
          result.push(matchingIfdef.indent + trimmed);
        } else {
          // No matching ifdef - keep original
          result.push(line);
        }
        continue;
      }

      // Handle else/elsif - align with its matching ifdef
      if (trimmed.startsWith('`else') || trimmed.startsWith('`elsif')) {
        if (ifdefStack.length > 0) {
          const matchingIfdef = ifdefStack[ifdefStack.length - 1];
          result.push(matchingIfdef.indent + trimmed);
        } else {
          // No matching ifdef - keep original
          result.push(line);
        }
        continue;
      }

      // Handle ifdef/ifndef - find indentation from next code line
      let targetIndent: string | null = null;

      // Look ahead for the first actual code line
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j];
        const nextTrimmed = nextLine.trim();

        // Skip blank lines and other directives
        if (!nextTrimmed || nextTrimmed.startsWith('`')) {
          continue;
        }

        // Found a code line - use its indentation
        const indent = nextLine.match(/^(\s*)/)?.[1] || '';
        targetIndent = indent;
        break;
      }

      // If no code found after, look backward for the last code line before this directive
      if (targetIndent === null) {
        for (let j = i - 1; j >= 0; j--) {
          const prevLine = lines[j];
          const prevTrimmed = prevLine.trim();

          // Skip blank lines and other directives
          if (!prevTrimmed || prevTrimmed.startsWith('`')) {
            continue;
          }

          // Found a code line - use its indentation
          const indent = prevLine.match(/^(\s*)/)?.[1] || '';
          targetIndent = indent;
          break;
        }
      }

      // Apply the target indentation and push to stack
      if (targetIndent !== null) {
        result.push(targetIndent + trimmed);
        ifdefStack.push({ indent: targetIndent, lineIndex: i });
      } else {
        result.push(line); // Keep original if no reference found
        const currentIndent = line.match(/^(\s*)/)?.[1] || '';
        ifdefStack.push({ indent: currentIndent, lineIndex: i });
      }
    } else {
      result.push(line);
    }
  }

  return result;
}

function enforceIfBlocks(lines: string[], indentSize: number): string[] {
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

function enforceForLoopBlocks(lines: string[], indentSize: number): string[] {
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

// Export for testing
export function formatVerilogText(text: string, indentSize: number = 2): string {
  // Create a mock document
  const mockDoc = {
    getText: () => text,
    positionAt: (offset: number) => {
      let line = 0, char = 0;
      for (let i = 0; i < offset; i++) {
        if (text[i] === '\n') {
          line++;
          char = 0;
        } else {
          char++;
        }
      }
      return { line, character: char };
    }
  };

  const mockOptions = {
    insertSpaces: true,
    tabSize: indentSize
  };

  // Call the actual formatDocument function
  const edits = formatDocument(mockDoc as any, mockOptions);

  if (edits && edits.length > 0) {
    return edits[0].newText;
  }

  return text;
}

function alignPortDeclLines(lines: string[]): string[] {
  // Format input/output/inout declarations in module body like port list
  if (!lines.length) return [];

  // Extract base indentation from the first actual port declaration
  const baseIndent = (lines[0].match(/^(\s*)/)?.[1]) || '';
  const unit = '  '; // 2 spaces

  interface PortDecl {
    dir: string;      // input, output, inout
    type: string;     // wire, reg, logic, etc. (if present)
    range: string;    // [7:0] etc. (if present)
    name: string;
    comment: string;  // trailing comment (if any)
  }

  const portDecls: PortDecl[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Match: direction [type] [range] name [, name] [//comment]
    // Examples:
    //   input wire [7:0] data_in, // comment
    //   output logic [15:0] result
    //   inout clk
    const m = trimmed.match(/^(input|output|inout)\s+(wire|reg|logic|bit)?\s*(\[[^\]]+\])?\s*([A-Za-z_][A-Za-z0-9_]*(?:\s*,\s*[A-Za-z_][A-Za-z0-9_]*)*)\s*(\/\/.*)?$/);
    if (m) {
      const dir = m[1];
      const type = m[2] || '';
      const range = m[3] || '';
      const names = m[4];
      const comment = m[5] || '';

      // Split multiple names on same line
      for (const name of names.split(',').map(n => n.trim())) {
        portDecls.push({ dir, type, range, name, comment });
      }
    }
  }

  if (portDecls.length === 0) {
    return lines;
  }

  // Calculate max widths for alignment
  const maxDir = Math.max(...portDecls.map(p => p.dir.length));
  const maxType = Math.max(...portDecls.map(p => p.type.length));
  const maxRange = Math.max(...portDecls.map(p => p.range.length));
  const maxName = Math.max(...portDecls.map(p => p.name.length));

  // Format each port declaration
  const formatted: string[] = [];
  for (const p of portDecls) {
    const dirPadded = p.dir.padEnd(maxDir);
    const typePadded = p.type ? p.type.padEnd(maxType) + ' ' : ''.padEnd(maxType + 1);
    const rangePadded = p.range ? p.range.padStart(maxRange) + ' ' : ''.padEnd(maxRange + 1);
    const namePadded = p.name.padEnd(maxName);

    const line = baseIndent + dirPadded + ' ' + typePadded + rangePadded + namePadded + ';' + (p.comment ? ' ' + p.comment : '');
    formatted.push(line);
  }

  return formatted;
}

/**
 * Format only a specific range of lines from a document
 * Calculates alignment values based only on the selected range
 */
export function formatRange(document: vscode.TextDocument, range: vscode.Range, options: vscode.FormattingOptions): vscode.TextEdit[] {
  const startLine = range.start.line;
  const endLine = range.end.line;

  // Extract just the selected lines
  const selectedLines: string[] = [];
  for (let i = startLine; i <= endLine; i++) {
    selectedLines.push(document.lineAt(i).text);
  }

  // Get the full text to pass through for configuration
  const fullText = document.getText();
  
  // Use tabSize from FormattingOptions (reflects current editor setting from bottom bar)
  const workspaceTabSize = options.tabSize || 2;
  
  // Get configuration
  const wcfg = vscode.workspace.getConfiguration('verilogFormatter');
  // Check if user has explicitly set indentSize (not just using default)
  const indentInspect = wcfg.inspect<number>('indentSize');
  let indentSize = workspaceTabSize;
  
  // Use explicitly set value (workspace, workspace folder, or global)
  if (indentInspect?.workspaceFolderValue !== undefined) {
    indentSize = indentInspect.workspaceFolderValue;
  } else if (indentInspect?.workspaceValue !== undefined) {
    indentSize = indentInspect.workspaceValue;
  } else if (indentInspect?.globalValue !== undefined) {
    indentSize = indentInspect.globalValue;
  }
  // Otherwise use workspace tabSize (already set above)
  
  const cfg: Config = {
    indentSize: indentSize,
    maxBlankLines: wcfg.get<number>('maxBlankLines', 2),
    alignAssignments: wcfg.get<boolean>('alignAssignments', true),
    alignPortList: wcfg.get<boolean>('alignPortList', true),
    alignWireDeclSemicolons: wcfg.get<boolean>('alignWireDeclSemicolons', true),
    alignParameters: wcfg.get<boolean>('alignParameters', true),
    wrapPortList: wcfg.get<boolean>('wrapPortList', false),
    lineLength: wcfg.get<number>('lineLength', 120),
    removeTrailingWhitespace: wcfg.get<boolean>('removeTrailingWhitespace', true),
    commentColumn: wcfg.get<number>('commentColumn', 40),
    formatModuleHeaders: wcfg.get<boolean>('formatModuleHeaders', true),
    formatModuleInstantiations: wcfg.get<boolean>('formatModuleInstantiations', true),
    indentAlwaysBlocks: wcfg.get<boolean>('indentAlwaysBlocks', true),
    enforceBeginEnd: wcfg.get<boolean>('enforceBeginEnd', true),
    indentCaseStatements: wcfg.get<boolean>('indentCaseStatements', true),
    annotateIfdefComments: wcfg.get<boolean>('annotateIfdefComments', true),
  };

  // Format the selected lines
  const formattedLines = formatVerilogRange(selectedLines, indentSize, cfg);

  // Detect the line ending used in the document
  const docText = document.getText();
  const eol = docText.includes('\r\n') ? '\r\n' : '\n';

  // Create the edit using the document's line ending
  const newText = formattedLines.join(eol);

  return [vscode.TextEdit.replace(range, newText)];
}/**
 * Format a range of Verilog lines with alignment based only on those lines
 */
function formatVerilogRange(lines: string[], indentSize: number, cfg: Config): string[] {
  const unit = ' '.repeat(indentSize);
  let result = [...lines];

  // Check if we have complete structures that can be safely re-indented
  const hasCompleteAlwaysBlock = hasCompleteStructure(result, 'always', 'begin', 'end');
  const hasCompleteInitialBlock = hasCompleteStructure(result, 'initial', 'begin', 'end');
  const hasCompleteGenerateBlock = hasCompleteStructure(result, 'generate', '', 'endgenerate');
  const hasCompleteForBlock = hasCompleteStructure(result, 'for', 'begin', 'end');
  const hasCompleteCaseBlock = hasCompleteStructure(result, 'case|casez|casex', '', 'endcase');
  const hasCompleteIfBlock = hasCompleteIfElseStructure(result);

  // If we have complete structural blocks, apply full formatting including indentation
  if (hasCompleteAlwaysBlock || hasCompleteInitialBlock || hasCompleteGenerateBlock ||
      hasCompleteForBlock || hasCompleteCaseBlock || hasCompleteIfBlock) {
    // Create a minimal document with just these lines to pass through full formatter
    const tempText = result.join('\n');
    const formattedText = formatVerilogText(tempText, indentSize);
    result = formattedText.split(/\r?\n/);
  } else {
    // Apply only alignment-based formatting (no indentation changes)

    // 0. Annotate macro directives if enabled
    if (cfg.annotateIfdefComments) {
      const globalMacroStack: string[] = [];
      const annotateRangeMacro = (line: string): string => {
        const leading = line.match(/^\s*/)?.[0] || '';
        const trimmed = line.trim();

        // Check if directive appears mid-line (like "{`ifdef SYMBOL")
        const midLineMatch = trimmed.match(/^(.+?)(`ifn?def\s+(\w+)|`else\b|`endif\b.*)$/);
        if (midLineMatch && !trimmed.startsWith('`')) {
          // Directive is mid-line, not at start
          const beforeDirective = midLineMatch[1];
          const directivePart = midLineMatch[2];

          // Handle ifdef/ifndef
          const ifdefMatch = directivePart.match(/^`ifn?def\s+(\w+)/);
          if (ifdefMatch) {
            globalMacroStack.push(ifdefMatch[1]);
            return line; // Don't annotate ifdef
          }

          // Handle else
          if (/^`else\b/.test(directivePart)) {
            const current = globalMacroStack[globalMacroStack.length - 1];
            if (current) {
              return leading + beforeDirective + '`else // ' + current;
            }
            return line;
          }

          // Handle endif
          if (/^`endif\b/.test(directivePart)) {
            const popped = globalMacroStack.pop();
            if (popped) {
              const afterEndif = directivePart.replace(/^`endif\s*/, '');
              return leading + beforeDirective + '`endif // ' + popped + (afterEndif ? ' ' + afterEndif : '');
            }
            return line;
          }
        }

        // ifdef / ifndef at start of line
        const ifdefM = trimmed.match(/^`ifn?def\s+(\w+)/);
        if (ifdefM) {
          globalMacroStack.push(ifdefM[1]);
          return line;
        }

        // else at start of line
        if (/^`else\b/.test(trimmed)) {
          const current = globalMacroStack[globalMacroStack.length - 1];
          if (current) {
            if (/\/\//.test(trimmed)) {
              if (!new RegExp(`//\\s*${current}$`).test(trimmed)) {
                return leading + '`else // ' + current;
              }
              return leading + trimmed.replace(/`else.*?(\/\/\s*.*)$/,'`else // ' + current);
            }
            return leading + '`else // ' + current;
          }
          return line;
        }

        // endif at start of line
        if (/^`endif\b/.test(trimmed)) {
          const popped = globalMacroStack.pop();
          if (popped) {
            const afterEndif = trimmed.replace(/^`endif\s*/, '');
            const hasExistingComment = /\/\//.test(afterEndif);
            if (hasExistingComment) {
              const parts = afterEndif.split('//');
              const beforeComment = parts[0].trim();
              return leading + '`endif ' + (beforeComment ? beforeComment + ' ' : '') + '// ' + popped;
            } else {
              return leading + '`endif // ' + popped + (afterEndif ? ' ' + afterEndif : '');
            }
          }
          return line;
        }

        return line;
      };

      result = result.map(line => {
        if (/`(ifn?def|else|endif)\b/.test(line)) {
          return annotateRangeMacro(line);
        }
        return line;
      });
    }

    // 1. Trim trailing whitespace
    result = result.map(line => line.trimEnd());

    // 1a. Normalize indentation for ifdef/endif directives to match the code they protect
    // Find the minimum indentation of non-directive, non-blank lines
    let minCodeIndent = Infinity;
    for (const line of result) {
      const trimmed = line.trim();
      // Skip directives, comments, blank lines, and module declaration line
      if (trimmed && !trimmed.startsWith('`') && !trimmed.startsWith('//') && !trimmed.startsWith('module ')) {
        const indent = line.match(/^\s*/)?.[0] || '';
        if (indent.length < minCodeIndent) {
          minCodeIndent = indent.length;
        }
      }
    }

    // If we found code lines, normalize directive indentation to match
    if (minCodeIndent !== Infinity) {
      const normalizedIndent = ' '.repeat(minCodeIndent);
      result = result.map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('`ifdef') || trimmed.startsWith('`ifndef') ||
            trimmed.startsWith('`else') || trimmed.startsWith('`endif') ||
            trimmed.startsWith('`elsif')) {
          return normalizedIndent + trimmed;
        }
        return line;
      });
    }

    // 2. Check if this looks like a module instantiation block
    // Look for module name followed by instance name and opening paren, or port connections
    const hasModuleInst = result.some(line => {
      const trimmed = line.trim();
      // Match patterns:
      // - module_name #( - parameters start
      // - module_name instance_name( - no parameters
      // - module_name instance_name[range]( - no parameters with array instance
      // - .port_name( - port connection
      return /^[A-Za-z_][A-Za-z0-9_]*\s+#\s*\(/.test(trimmed) || // module_name #(params...)
             /^[A-Za-z_][A-Za-z0-9_]*\s+[A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?\s*\(/.test(trimmed) || // module_name instance(
             /^\.\w+\s*\(/.test(trimmed); // .port_name(
    });

    // Check if selection contains only port/parameter connections (not full instantiation)
    // This needs to handle multiline port connections where continuation lines may contain
    // signal names, expressions, concatenations, or just closing parens
    const hasOnlyConnections = result.every(line => {
      const trimmed = line.trim();
      return !trimmed || // blank line
             trimmed.startsWith('//') || // comment
             /^`(ifdef|ifndef|elsif|else|endif)/.test(trimmed) || // compiler directives
             /^\.\w+\s*\(/.test(trimmed) || // .port_name( or .PARAM( - start of connection
             /^\w+\s*\)/.test(trimmed) || // closing paren with instance name
             /^\);?\s*$/.test(trimmed) || // just closing paren
             /^\)\s*[,;]/.test(trimmed) || // closing paren with delimiter
             /^}/.test(trimmed) || // closing brace (end of concatenation)
             /^\{/.test(trimmed) || // opening brace (start of concatenation)
             (/^[A-Za-z_0-9\[\]\.\+\-\*\/\&\|\^\~\<\>\=\!\s\(\)\{\}`]+[,;]?\s*(\/\/.*)?$/.test(trimmed) &&
              !trimmed.includes('module') &&
              !/^[A-Za-z_][A-Za-z0-9_]*\s+[A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?\s*\(/.test(trimmed)); // exclude module instance declaration
    });

    // 4. Check if this looks like a module header
    const hasModuleHeader = result.some(line => /^\s*module\s+\w+/.test(line));

    // 5. Format module instantiation if detected (full instantiation)
    if (cfg.formatModuleInstantiations && hasModuleInst && !hasModuleHeader && !hasOnlyConnections) {
      try {
        result = formatModuleInstantiations(result, indentSize);
      } catch (e) {
        // If formatting fails, continue with other formatting
        console.error('Range formatting: module instantiation error', e);
      }
    }

    // 5b. Align port/parameter connections if only connections are selected
    if (cfg.formatModuleInstantiations && hasModuleInst && hasOnlyConnections) {
      result = alignInstantiationConnectionsInRange(result);
    }

    // 5c. Align multiline if/for/while conditions (must run BEFORE formatModuleHeader)
    result = alignMultilineConditions(result);

    // 6. Format module header if detected
    // Always format module headers when formatModuleHeaders is enabled
    if (cfg.formatModuleHeaders && hasModuleHeader) {
      try {
        result = formatModuleHeader(result, cfg);
      } catch (e) {
        // If formatting fails, continue with other formatting
        console.error('Range formatting: module header error', e);
      }
    }

    // 7. Align assignments if requested
    if (cfg.alignAssignments) {
      result = alignAssignmentsInRange(result);
    }

    // 8. Align wire/reg declarations if requested
    if (cfg.alignWireDeclSemicolons) {
      result = alignWireDeclarationsInRange(result);
    }

    // 9. Align parameters if requested (only if not inside module header - module header handles its own params)
    if (cfg.alignParameters && !hasModuleHeader) {
      result = alignParametersInRange(result);
    }

    // 10. Align input/output port declarations if requested (only if not inside module header)
    if (cfg.alignPortList && !hasModuleHeader) {
      result = alignPortDeclarationsInRange(result);
    }

    // 11. Apply comment column alignment if requested
    if (cfg.commentColumn > 0) {
      result = result.map(line => applyCommentColumn(line, cfg));
    }

    // 12. Compress blank lines if requested
    if (cfg.maxBlankLines < 100) {
      const compressed: string[] = [];
      let blankCount = 0;
      for (const line of result) {
        if (line.trim() === '') {
          blankCount++;
          if (blankCount <= cfg.maxBlankLines) {
            compressed.push(line);
          }
          // Skip excess blank lines
        } else {
          blankCount = 0;
          compressed.push(line);
        }
      }
      result = compressed;
    }
  }

  return result;
}

/**
 * Check if the lines contain a complete structure (balanced begin/end or similar)
 */
function hasCompleteStructure(lines: string[], startKeyword: string, beginKeyword: string, endKeyword: string): boolean {
  let hasStart = false;
  let depth = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for start keyword (e.g., "always")
    if (new RegExp(`^${startKeyword}\\b`).test(trimmed)) {
      hasStart = true;
    }

    // Track depth of begin/end (or generate/endgenerate)
    if (beginKeyword && new RegExp(`\\b${beginKeyword}\\b`).test(trimmed)) {
      depth++;
    }
    if (new RegExp(`\\b${endKeyword}\\b`).test(trimmed)) {
      depth--;
    }
  }

  // Complete structure means: we saw the start keyword and all begin/end pairs are balanced
  return hasStart && depth === 0;
}

/**
 * Check if the lines contain a complete if/else structure
 * This is more complex than other structures because if/else can be nested
 */
function hasCompleteIfElseStructure(lines: string[]): boolean {
  let hasIf = false;
  let depth = 0;
  let inIfElse = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for if statement
    if (/\bif\s*\(/.test(trimmed)) {
      hasIf = true;
      inIfElse = true;
    }

    // Track begin/end depth
    if (/\bbegin\b/.test(trimmed)) {
      depth++;
    }
    if (/\bend\b/.test(trimmed)) {
      depth--;
      // If we're in an if/else and depth returns to 0, we might be complete
      if (inIfElse && depth === 0) {
        // Check if this is after an if/else block
        return true;
      }
    }

    // For single-line if/else without begin/end
    if (hasIf && !inIfElse && /\belse\b/.test(trimmed)) {
      return true;
    }
  }

  // Complete if we found an if and all begin/end pairs are balanced
  return hasIf && depth === 0;
}

/**
 * Align assignments within a range of lines
 */
function alignAssignmentsInRange(lines: string[]): string[] {
  const assignLines: { index: number; indent: string; lhs: string; rhs: string; comment: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Match: assign lhs = rhs; or lhs <= rhs;
    const assignMatch = trimmed.match(/^assign\s+(.+?)\s*(=|<=)\s*(.+?)\s*;(.*)$/);
    if (assignMatch) {
      const indent = line.match(/^(\s*)/)?.[1] || '';
      const lhs = assignMatch[1].trim();
      const op = assignMatch[2];
      const rhsAndComment = assignMatch[3] + assignMatch[4];
      const commentMatch = rhsAndComment.match(/^(.*?)(\/\/.*)$/);
      const rhs = commentMatch ? commentMatch[1].trim() : rhsAndComment.trim();
      const comment = commentMatch ? commentMatch[2] : '';

      assignLines.push({ index: i, indent, lhs, rhs: op + ' ' + rhs, comment });
    }
  }

  if (assignLines.length === 0) return lines;

  // Find minimum indentation
  const minIndent = assignLines.reduce((min, assign) => {
    return assign.indent.length < min.length ? assign.indent : min;
  }, assignLines[0].indent);

  // Calculate max lengths
  const maxLhs = Math.max(...assignLines.map(a => a.lhs.length));
  const maxRhs = Math.max(...assignLines.map(a => a.rhs.length));

  // Build lines without comments and calculate max length for comment alignment
  const linesWithoutComments = assignLines.map(assign => {
    const lhsPadded = assign.lhs.padEnd(maxLhs);
    const rhsPadded = assign.rhs.padEnd(maxRhs);
    return minIndent + 'assign ' + lhsPadded + ' ' + rhsPadded + ';';
  });
  const maxLineLength = Math.max(...linesWithoutComments.map(l => l.length));

  // Apply alignment
  const result = [...lines];
  for (let i = 0; i < assignLines.length; i++) {
    const assign = assignLines[i];
    result[assign.index] = linesWithoutComments[i].padEnd(maxLineLength) + (assign.comment ? ' ' + assign.comment : '');
  }

  return result;
}

/**
 * Align wire/reg/logic declarations within a range
 */
function alignWireDeclarationsInRange(lines: string[]): string[] {
  const declLines: { index: number; indent: string; type: string; range: string; name: string; arrayDim: string; init: string; comment: string; continuationComments?: number[] }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Match: wire/reg/logic [range] name [arrayDim] [= init];
    // arrayDim is for multidimensional arrays like: reg [7:0] data[15:0] or reg [7:0] data [15:0];
    const declMatch = trimmed.match(/^(wire|reg|logic)\s+(\[[^\]]+\])?\s*([A-Za-z_][A-Za-z0-9_]*)\s*(\[[^\]]+\])?\s*(=\s*.+?)?\s*;(.*)$/);
    if (declMatch) {
      const indent = line.match(/^(\s*)/)?.[1] || '';
      const type = declMatch[1];
      const range = declMatch[2] || '';
      const name = declMatch[3];
      const arrayDim = declMatch[4] || '';
      const init = declMatch[5] || '';
      const comment = declMatch[6].trim();

      // Check for continuation comment lines (lines that only contain comments)
      const continuationComments: number[] = [];
      let j = i + 1;
      while (j < lines.length) {
        const nextTrimmed = lines[j].trim();
        if (nextTrimmed.startsWith('//')) {
          continuationComments.push(j);
          j++;
        } else {
          break;
        }
      }

      declLines.push({ index: i, indent, type, range, name, arrayDim, init, comment, continuationComments: continuationComments.length > 0 ? continuationComments : undefined });
    }
  }

  if (declLines.length === 0) return lines;

  // Find minimum indentation
  const minIndent = declLines.reduce((min, decl) => {
    return decl.indent.length < min.length ? decl.indent : min;
  }, declLines[0].indent);

  // Check if all declarations are simple (no ranges, no arrayDim, no init)
  const allSimple = declLines.every(d => !d.range && !d.arrayDim && !d.init);
  if (allSimple) {
    // Calculate max name length for simple declarations
    const maxSimpleName = Math.max(...declLines.map(d => d.name.length));
    const types = declLines.map(d => d.type);
    const allSameType = types.every(t => t === types[0]);

    // Calculate the length of each line before the comment for comment alignment
    const lineWithoutComment = declLines.map(decl => {
      const typePart = allSameType ? decl.type : decl.type.padEnd(Math.max(...declLines.map(d => d.type.length)));
      const namePadded = decl.name.padEnd(maxSimpleName);
      return minIndent + typePart + ' ' + namePadded + ';';
    });
    const maxLineLength = Math.max(...lineWithoutComment.map(l => l.length));

    // Check if already aligned
    let alreadyAligned = true;
    for (let i = 0; i < declLines.length; i++) {
      const decl = declLines[i];
      const expectedLine = lineWithoutComment[i].padEnd(maxLineLength) + (decl.comment ? ' ' + decl.comment : '');
      if (lines[decl.index] !== expectedLine) {
        alreadyAligned = false;
        break;
      }
    }

    if (alreadyAligned) {
      return lines;
    }

    const result = [...lines];
    for (let i = 0; i < declLines.length; i++) {
      const decl = declLines[i];
      result[decl.index] = lineWithoutComment[i].padEnd(maxLineLength) + (decl.comment ? ' ' + decl.comment : '');
    }
    return result;
  }  // Calculate max lengths
  const maxType = Math.max(...declLines.map(d => d.type.length));
  const maxRange = Math.max(...declLines.map(d => d.range.length));
  const maxName = Math.max(...declLines.map(d => (d.name + d.arrayDim).length));
  const maxInit = Math.max(...declLines.map(d => d.init.length));

  // Build lines without comments and calculate max length for comment alignment
  const linesWithoutComments = declLines.map(decl => {
    const typePadded = decl.type.padEnd(maxType);
    const rangePadded = decl.range ? decl.range.padStart(maxRange) + ' ' : ''.padEnd(maxRange + 1);
    const nameWithArray = decl.name + decl.arrayDim;
    const namePadded = nameWithArray.padEnd(maxName);
    const initPadded = decl.init ? ' ' + decl.init.padEnd(maxInit) : (maxInit > 0 ? ''.padEnd(maxInit + 1) : '');
    return minIndent + typePadded + ' ' + rangePadded + namePadded + initPadded + ';';
  });
  const maxLineLength = Math.max(...linesWithoutComments.map(l => l.length));

  // Apply alignment
  const result = [...lines];
  const processedLines = new Set<number>();

  for (let i = 0; i < declLines.length; i++) {
    const decl = declLines[i];
    result[decl.index] = linesWithoutComments[i].padEnd(maxLineLength) + (decl.comment ? ' ' + decl.comment : '');
    processedLines.add(decl.index);

    // Handle continuation comment lines
    if (decl.continuationComments) {
      for (const commentLineIndex of decl.continuationComments) {
        const commentLine = lines[commentLineIndex].trim();
        result[commentLineIndex] = ''.padEnd(maxLineLength) + ' ' + commentLine;
        processedLines.add(commentLineIndex);
      }
    }
  }

  return result;
}

/**
 * Align parameter declarations within a range
 */
function alignParametersInRange(lines: string[]): string[] {
  const paramLines: {
    index: number;
    indent: string;
    keyword: string;
    type: string;
    range: string;
    name: string;
    value: string;
    comment: string;
    continuationLines?: { lineIndex: number; content: string }[];
    semicolonLineIndex?: number;
  }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Match: parameter [type] [range] name = value (possibly multiline)
    const paramMatch = trimmed.match(/^(parameter|localparam)\s+(?:(int|bit|logic|string)\s+)?(\[[^\]]+\])?\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (paramMatch) {
      const indent = line.match(/^(\s*)/)?.[1] || '';
      const keyword = paramMatch[1];
      const type = paramMatch[2] || '';
      const range = paramMatch[3] || '';
      const name = paramMatch[4];
      const restOfLine = paramMatch[5];

      // Check if this is a single-line parameter (ends with ;)
      const singleLineMatch = restOfLine.match(/^(.+?)\s*;(.*)$/);
      if (singleLineMatch) {
        // Single line parameter
        const valueAndComment = singleLineMatch[1] + singleLineMatch[2];
        const commentMatch = valueAndComment.match(/^(.*?)(\/\/.*)$/);
        const value = commentMatch ? commentMatch[1].trim() : valueAndComment.trim();
        const comment = commentMatch ? commentMatch[2] : '';
        paramLines.push({ index: i, indent, keyword, type, range, name, value, comment });
      } else {
        // Multiline parameter - collect continuation lines
        const continuationLines: { lineIndex: number; content: string }[] = [];
        let firstLineValue = restOfLine;
        let j = i + 1;
        let semicolonLineIndex = -1;

        // Collect all continuation lines until we find the semicolon
        while (j < lines.length) {
          const contLine = lines[j];
          const contTrimmed = contLine.trim();

          if (contTrimmed.includes(';')) {
            // Found the ending semicolon
            semicolonLineIndex = j;
            const beforeSemi = contTrimmed.substring(0, contTrimmed.indexOf(';'));
            if (beforeSemi.trim()) {
              continuationLines.push({ lineIndex: j, content: beforeSemi });
            }
            break;
          } else if (contTrimmed) {
            // Regular continuation line
            continuationLines.push({ lineIndex: j, content: contTrimmed });
          }
          j++;
        }

        // Extract comment from first line if present
        const commentMatch = firstLineValue.match(/^(.*?)(\/\/.*)$/);
        const value = commentMatch ? commentMatch[1].trim() : firstLineValue.trim();
        const comment = commentMatch ? commentMatch[2] : '';

        paramLines.push({
          index: i,
          indent,
          keyword,
          type,
          range,
          name,
          value,
          comment,
          continuationLines: continuationLines.length > 0 ? continuationLines : undefined,
          semicolonLineIndex
        });
      }
    }
  }

  if (paramLines.length === 0) return lines;

  // Calculate max lengths (only for the first line components)
  const maxKeyword = Math.max(...paramLines.map(p => p.keyword.length));
  const maxType = Math.max(...paramLines.map(p => p.type.length));
  const maxRange = Math.max(...paramLines.map(p => p.range.length));
  const maxName = Math.max(...paramLines.map(p => p.name.length));

  // Apply alignment
  const result = [...lines];
  const processedLines = new Set<number>();

  for (const param of paramLines) {
    const keywordPadded = param.keyword.padEnd(maxKeyword);
    const typePart = param.type ? param.type.padEnd(maxType) + ' ' : ''.padEnd(maxType + (maxType > 0 ? 1 : 0));
    const rangePadded = param.range ? param.range.padStart(maxRange) + ' ' : ''.padEnd(maxRange + (maxRange > 0 ? 1 : 0));
    const namePadded = param.name.padEnd(maxName);

    if (!param.continuationLines) {
      // Single line parameter
      result[param.index] = param.indent + keywordPadded + ' ' + typePart + rangePadded + namePadded + ' = ' + param.value + ';' + (param.comment ? ' ' + param.comment : '');
      processedLines.add(param.index);
    } else {
      // Multiline parameter
      // Calculate the position of the equals sign
      const firstLinePart = param.indent + keywordPadded + ' ' + typePart + rangePadded + namePadded + ' ';
      const equalsPosition = firstLinePart.length; // Position where '=' will be

      // Format first line
      result[param.index] = firstLinePart + '= ' + param.value + (param.comment ? ' ' + param.comment : '');
      processedLines.add(param.index);

      // Format continuation lines - align operators with equals sign
      for (const contLine of param.continuationLines) {
        const trimmedContent = contLine.content.trim();

        // Check if line starts with an operator
        const operatorMatch = trimmedContent.match(/^([+\-*\/&|^~<>=!?:])/);
        if (operatorMatch) {
          // Align operator with equals sign - pad to equals position then add content
          const paddingNeeded = equalsPosition - param.indent.length;
          const alignedLine = param.indent + ''.padEnd(paddingNeeded) + trimmedContent;
          result[contLine.lineIndex] = alignedLine;
        } else {
          // Not an operator line, indent a bit more
          const paddingNeeded = equalsPosition - param.indent.length + 2;
          result[contLine.lineIndex] = param.indent + ''.padEnd(paddingNeeded) + trimmedContent;
        }
        processedLines.add(contLine.lineIndex);
      }

      // Find and format the semicolon line
      if (param.continuationLines.length > 0 && param.semicolonLineIndex !== undefined) {
        const lastContIndex = param.continuationLines[param.continuationLines.length - 1].lineIndex;

        // Check if semicolon is on a separate line (semicolonLineIndex > lastContIndex)
        if (param.semicolonLineIndex > lastContIndex) {
          // Semicolon is on its own line - align it with the first character of the previous line
          const lastLine = result[lastContIndex];
          const firstNonSpaceIndex = lastLine.search(/\S/);
          if (firstNonSpaceIndex !== -1) {
            const semiIndent = ''.padEnd(firstNonSpaceIndex);
            result[param.semicolonLineIndex] = semiIndent + ';';
          }
          processedLines.add(param.semicolonLineIndex);
        } else if (lines[lastContIndex].includes(';')) {
          // Semicolon is on the same line as the last continuation
          const afterSemi = lines[lastContIndex].substring(lines[lastContIndex].indexOf(';') + 1).trim();
          result[lastContIndex] = result[lastContIndex] + ';' + (afterSemi ? ' ' + afterSemi : '');
        }
      }
    }
  }

  return result;
}

/**
 * Align input/output/inout port declarations within a range
 */
function alignPortDeclarationsInRange(lines: string[]): string[] {
  const portLines: { index: number; indent: string; dir: string; type: string; range: string; name: string; delimiter: string; comment: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Match: input/output/inout [type] [range] name[,;]? - delimiter is optional for last port
    const portMatch = trimmed.match(/^(input|output|inout)\s+(?:(wire|reg|logic|bit)\s+)?(\[[^\]]+\])?\s*([A-Za-z_][A-Za-z0-9_]*)\s*([,;]?)(.*)$/);
    if (portMatch) {
      const indent = line.match(/^(\s*)/)?.[1] || '';
      const dir = portMatch[1];
      const type = portMatch[2] || '';
      const range = portMatch[3] || '';
      const name = portMatch[4];
      const delimiter = portMatch[5];  // Can be ',', ';', or empty string
      const comment = portMatch[6].trim();

      portLines.push({ index: i, indent, dir, type, range, name, delimiter, comment });
    }
  }

  if (portLines.length === 0) return lines;

  // Calculate max lengths for dir, type, range (but not name yet)
  const maxDir = Math.max(...portLines.map(p => p.dir.length));
  const maxType = Math.max(...portLines.map(p => p.type.length));
  const maxRange = Math.max(...portLines.map(p => p.range.length));

  // Apply alignment - build base content first, then add delimiter
  const result = [...lines];

  // First pass: build base without delimiter and without padding the name
  const portBases: { index: number; base: string; delimiter: string; comment: string }[] = [];
  for (const port of portLines) {
    const dirPadded = port.dir.padEnd(maxDir);
    const typePart = port.type ? port.type.padEnd(maxType) + ' ' : ''.padEnd(maxType + (maxType > 0 ? 1 : 0));
    const rangePart = port.range ? port.range.padStart(maxRange) + ' ' : ''.padEnd(maxRange + (maxRange > 0 ? 1 : 0));
    const base = port.indent + dirPadded + ' ' + typePart + rangePart + port.name;  // Don't pad name yet
    portBases.push({ index: port.index, base, delimiter: port.delimiter, comment: port.comment });
  }

  // Calculate max base length (this ensures the last port is included even if it has no delimiter)
  const maxBaseLength = Math.max(...portBases.map(p => p.base.length));

  // Second pass: pad bases and add delimiter
  for (const portBase of portBases) {
    const basePadded = portBase.base.padEnd(maxBaseLength);
    result[portBase.index] = basePadded + portBase.delimiter;
  }

  // Third pass: add aligned comments if present
  // Comments should align at position maxBaseLength + 1 (for comma/semicolon) + 1 (for space)
  const commentAlignPos = maxBaseLength + 1;
  for (const portBase of portBases) {
    if (portBase.comment) {
      result[portBase.index] = result[portBase.index].padEnd(commentAlignPos) + ' ' + portBase.comment;
    }
  }

  return result;
}

/**
 * Align port/parameter connections in module instantiations within a range
 * This handles:
 * - Port connections: .port_name(connection)
 * - Parameter overrides: .PARAM(value)
 * - Module body parameters: parameter PARAM = value
 * Supports multiline connections and concatenations
 */
function alignInstantiationConnectionsInRange(lines: string[]): string[] {
  interface ConnLine {
    startIndex: number;
    endIndex: number;
    indent: string;
    portName: string;
    connection: string;
    delimiter: string;
    comment: string;
    isMultiline: boolean;
    isConcatenation: boolean;
    isParameter: boolean;
    originalLines?: string[];
  }

  const connLines: ConnLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip blank lines and comments
    if (!trimmed || trimmed.startsWith('//')) {
      continue;
    }

    // Check if this line starts a port/parameter connection: .port_name( or .PARAM(
    const multilinePortMatch = trimmed.match(/^\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
    if (multilinePortMatch) {
      const portName = multilinePortMatch[1];
      const multilineLines: string[] = [line];
      let foundClosing = false;
      let parenDepth = 1; // We've seen one opening (

      // Count remaining parens on first line
      const firstLineAfterPort = trimmed.substring(trimmed.indexOf('(') + 1);
      for (const ch of firstLineAfterPort) {
        if (ch === '(') parenDepth++;
        if (ch === ')') parenDepth--;
      }

      if (parenDepth === 0) {
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
        // Check if this is a concatenation pattern: .port({...})
        const isConcatenation = trimmed.includes('({') ||
                                (multilineLines.length > 1 && /^\.\w+\s*\(\s*\{/.test(multilineLines[0].trim()));

        // Extract the connection value from all lines
        let fullText = multilineLines.map(l => l.trim()).join(' ');
        const connMatch = fullText.match(/^\.([A-Za-z_][A-Za-z0-9_]*)\s*\((.*)\)\s*([,;]?)(.*)$/);

        if (connMatch) {
          const indent = line.match(/^(\s*)/)?.[1] || '';
          const connection = connMatch[2].trim();
          const delimiter = connMatch[3] || '';
          const comment = connMatch[4].trim();

          connLines.push({
            startIndex: i,
            endIndex: j - 1,
            indent,
            portName: '.' + portName,
            connection,
            delimiter,
            comment,
            isMultiline: multilineLines.length > 1,
            isConcatenation: isConcatenation,
            isParameter: false,
            originalLines: multilineLines
          });
          i = j - 1; // Skip the lines we just processed
          continue;
        }
      }
    }
  }

  if (connLines.length === 0) return lines;

  // Calculate max port name length
  const maxPortName = Math.max(...connLines.map(c => c.portName.length));

  // Calculate max connection length (only for single-line ports)
  const singleLineConns = connLines.filter(c => !c.isMultiline);
  const maxConnection = singleLineConns.length > 0
    ? Math.max(...singleLineConns.map(c => c.connection.length))
    : 0;

  // For multiline ports, track concatenation signals and expression content separately
  let globalMaxSignalLen = 0;
  let globalMaxContentLen = 0;

  for (const conn of connLines) {
    if (conn.isMultiline && conn.originalLines) {
      // Detect if this is a concatenation or expression
      const firstLineTrimmed = conn.originalLines[0].trim();
      const isConcatenation = /\(\{/.test(firstLineTrimmed);

      for (let lineIdx = 0; lineIdx < conn.originalLines.length; lineIdx++) {
        const origLine = conn.originalLines[lineIdx];
        const trimmed = origLine.trim();

        // Check first line for the first signal in concatenation
        if (lineIdx === 0 && isConcatenation) {
          // Try simple signal first
          const firstSignalMatch = trimmed.match(/\(\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*[,}]/);
          if (firstSignalMatch && firstSignalMatch[1].length > globalMaxSignalLen) {
            globalMaxSignalLen = firstSignalMatch[1].length;
          }
          // Also try nested concatenation or array index patterns
          const nestedFirstMatch = trimmed.match(/\(\{(\{[^,}]+|[a-zA-Z_][a-zA-Z0-9_\[\]\-:]+)\s*[,}]/);
          if (nestedFirstMatch && nestedFirstMatch[1].length > globalMaxSignalLen) {
            globalMaxSignalLen = nestedFirstMatch[1].length;
          }
          continue;
        }

        // Skip first line (has port name), closing lines, and directives
        if (lineIdx === 0) continue;
        if (/^[`]/.test(trimmed)) continue;
        if (/^\}\s*\)/.test(trimmed) || /^\)/.test(trimmed)) continue;

        if (isConcatenation) {
          // Check for simple signal names
          const signalMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*[,}]/);
          if (signalMatch && signalMatch[1].length > globalMaxSignalLen) {
            globalMaxSignalLen = signalMatch[1].length;
          }
          // Check for replication patterns
          const replicationMatch = trimmed.match(/^(\{[^}]+\{[^}]+\}\})/);
          if (replicationMatch && replicationMatch[1].length > globalMaxSignalLen) {
            globalMaxSignalLen = replicationMatch[1].length;
          }
          // Check for double-opening replication like {{COUNT{signal}}
          const doubleReplicationMatch = trimmed.match(/^(\{\{[^}]+\{[^}]+\}\})/);
          if (doubleReplicationMatch && doubleReplicationMatch[1].length > globalMaxSignalLen) {
            globalMaxSignalLen = doubleReplicationMatch[1].length;
          }
          // Check for nested concatenations like {signal[bit]
          const nestedMatch = trimmed.match(/^(\{[a-zA-Z_][a-zA-Z0-9_\[\]\-:]+)\s*[,}]/);
          if (nestedMatch && nestedMatch[1].length > globalMaxSignalLen) {
            globalMaxSignalLen = nestedMatch[1].length;
          }
        } else {
          // Only track content for expressions
          const contentLen = trimmed.length;
          if (contentLen > globalMaxContentLen) {
            globalMaxContentLen = contentLen;
          }
        }
      }
    }
  }

  // Calculate unified closing parenthesis column
  // For single-line: baseIndent + maxPortName + " (" + maxConnection + ")"
  // For multiline concat: baseIndent + maxPortName + " ({" + globalMaxSignalLen + "})"
  // For multiline expr: baseIndent + maxPortName + " (" + globalMaxContentLen + ")"
  const baseIndent = connLines[0]?.indent || '';
  const maxConcatLen = globalMaxSignalLen > 0 ? globalMaxSignalLen + 1 : 0; // +1 for '{'
  const unifiedClosingParenCol = baseIndent.length + maxPortName + 2 + Math.max(maxConnection, maxConcatLen, globalMaxContentLen); // +2 for " ("

  // Apply alignment
  const result: string[] = [];
  let lastEndIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    // Skip lines that are part of a processed multiline connection
    if (i > lastEndIndex) {
      const conn = connLines.find(c => c.startIndex === i);

      if (conn) {
        if (conn.isConcatenation && conn.isMultiline && conn.originalLines) {
          // Preserve and align multiline concatenation
          const portPadded = conn.portName.padEnd(maxPortName);

          for (let lineIdx = 0; lineIdx < conn.originalLines.length; lineIdx++) {
            const origLine = conn.originalLines[lineIdx];
            const origTrimmed = origLine.trim();

            if (lineIdx === 0) {
              // First line: .port ({signal, or .port ({{COUNT{signal}}
              // Try simple signal first
              const firstLineMatch = origTrimmed.match(/^\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(.*)$/);
              if (firstLineMatch) {
                const firstSignal = firstLineMatch[2];
                const remainder = firstLineMatch[3].trim();
                let formattedRemainder = remainder;
                if (remainder.startsWith(',')) {
                  const spacesBeforeComma = globalMaxSignalLen - firstSignal.length;
                  const padding = spacesBeforeComma > 0 ? ' '.repeat(spacesBeforeComma) : '';
                  formattedRemainder = padding + remainder;
                }
                result.push(conn.indent + portPadded + ' ({' + firstSignal + formattedRemainder);
              } else {
                // Try replication or nested concatenation: .portname ({{COUNT{signal}} or .portname ({signal[bit]
                const replicationFirstMatch = origTrimmed.match(/^\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\{(\{\{?[^,}]+\{[^}]+\}\}|[a-zA-Z_][a-zA-Z0-9_\[\]\-:]+)\s*(.*)$/);
                if (replicationFirstMatch) {
                  const firstExpr = replicationFirstMatch[2];
                  const remainder = replicationFirstMatch[3].trim();
                  let formattedRemainder = remainder;
                  if (remainder.startsWith(',')) {
                    const spacesBeforeComma = globalMaxSignalLen - firstExpr.length;
                    const padding = spacesBeforeComma > 0 ? ' '.repeat(spacesBeforeComma) : '';
                    formattedRemainder = padding + remainder;
                  }
                  result.push(conn.indent + portPadded + ' ({' + firstExpr + formattedRemainder);
                } else {
                  // Fallback: preserve original
                  result.push(conn.indent + portPadded + ' ' + origTrimmed.substring(origTrimmed.indexOf('(')));
                }
              }
            } else {
              // Continuation lines
              const continuationIndent = ' '.repeat(conn.indent.length + maxPortName + 3); // +3 for " ({"

              if (/}\s*\),?$/.test(origTrimmed)) {
                // Closing line like "signal })," or "signal})" or "signal}})"
                // Handle this BEFORE checking for just }
                const closingMatch = origTrimmed.match(/^([a-zA-Z_][a-zA-Z0-9_[\]_]*)(\s*)(}+)(\s*\))(,?)$/);
                if (closingMatch) {
                  const signalName = closingMatch[1];
                  const closingBraces = closingMatch[3]; // Preserve all closing braces (}, }}, }}}, etc.)
                  const hasComma = closingMatch[5] === ',';
                  const closingStr = closingBraces + ')' + (hasComma ? ',' : conn.delimiter);
                  // Calculate padding: we want ) to be at unifiedClosingParenCol
                  // If padding would be negative or zero, no spaces needed (this line is longest)
                  // unifiedClosingParenCol is the position of ), so subtract length of closing braces + 1 for ")"
                  const paddingNeeded = Math.max(0, unifiedClosingParenCol - continuationIndent.length - signalName.length - closingBraces.length - 1); // -1 for ")"
                  const padding = paddingNeeded > 0 ? ' '.repeat(paddingNeeded) : '';
                  result.push(continuationIndent + signalName + padding + closingStr);
                } else {
                  result.push(continuationIndent + origTrimmed);
                }
              } else if (/^}/.test(origTrimmed)) {
                // Just closing brace without signal on same line
                result.push(continuationIndent + origTrimmed);
              } else {
                // Middle signal lines
                const signalMatch = origTrimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*(.*)$/);
                if (signalMatch) {
                  const signalName = signalMatch[1];
                  const remainder = signalMatch[2].trim();
                  let formattedRemainder = remainder;
                  if (remainder.startsWith(',')) {
                    const spacesBeforeComma = globalMaxSignalLen - signalName.length;
                    const padding = spacesBeforeComma > 0 ? ' '.repeat(spacesBeforeComma) : '';
                    formattedRemainder = padding + remainder;
                  }
                  result.push(continuationIndent + signalName + formattedRemainder);
                } else {
                  // Lines starting with '{' for nested concatenations or replications
                  // Pattern 1: Replication like {COUNT{signal}} or double-replication {{COUNT{signal}}
                  const replicationMatch = origTrimmed.match(/^(\{\{?[^}]+\{[^}]+\}\})(.*?)$/);
                  if (replicationMatch) {
                    const replicationExpr = replicationMatch[1];
                    const remainder = replicationMatch[2].trim();
                    let formattedRemainder = remainder;
                    // Align commas and closing braces
                    if (remainder.startsWith(',')) {
                      const exprLength = replicationExpr.length;
                      const paddingNeeded = Math.max(0, globalMaxSignalLen - exprLength);
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
                        const paddingNeeded = Math.max(0, globalMaxSignalLen - exprLength);
                        const padding = paddingNeeded > 0 ? ' '.repeat(paddingNeeded) : '';
                        formattedRemainder = padding + closingBraces + ')' + rest;
                      } else {
                        // Just closing braces, no paren
                        const exprLength = replicationExpr.length;
                        const paddingNeeded = Math.max(0, globalMaxSignalLen - exprLength);
                        const padding = paddingNeeded > 0 ? ' '.repeat(paddingNeeded) : '';
                        formattedRemainder = padding + remainder;
                      }
                    }
                    result.push(continuationIndent + replicationExpr + formattedRemainder);
                  } else {
                    // Pattern 2: Nested concatenation like {signal[bit], or {signal,
                    const nestedMatch = origTrimmed.match(/^(\{[a-zA-Z_][a-zA-Z0-9_\[\]\-:]*)(.*?)$/);
                    if (nestedMatch) {
                      const signalPart = nestedMatch[1];
                      const remainder = nestedMatch[2].trim();
                      let formattedRemainder = remainder;
                      if (remainder.startsWith(',')) {
                        const exprLength = signalPart.length;
                        const paddingNeeded = Math.max(0, globalMaxSignalLen - exprLength);
                        const padding = paddingNeeded > 0 ? ' '.repeat(paddingNeeded) : '';
                        formattedRemainder = padding + remainder;
                      }
                      result.push(continuationIndent + signalPart + formattedRemainder);
                    } else {
                      result.push(continuationIndent + origTrimmed);
                    }
                  }
                }
              }
            }
          }
          lastEndIndex = conn.endIndex;
        } else if (conn.isMultiline && !conn.isConcatenation && conn.originalLines) {
          // Multiline expression (mathematical, ifdef, etc.)
          const portPadded = conn.portName.padEnd(maxPortName);
          const continuationIndent = ' '.repeat(conn.indent.length + maxPortName + 2); // +2 for " ("

          for (let lineIdx = 0; lineIdx < conn.originalLines.length; lineIdx++) {
            const origLine = conn.originalLines[lineIdx];
            const origTrimmed = origLine.trim();

            if (lineIdx === 0) {
              // First line: .port (expression
              result.push(conn.indent + portPadded + ' ' + origTrimmed.substring(origTrimmed.indexOf('(')));
            } else if (/^\)\s*[,;]?\s*$/.test(origTrimmed)) {
              // Closing line: )
              const hasComma = origTrimmed.includes(',');
              const closingStr = hasComma ? '),' : ')' + conn.delimiter;
              // Align ) to unifiedClosingParenCol
              const paddingNeeded = Math.max(0, unifiedClosingParenCol - conn.indent.length);
              result.push(conn.indent + ' '.repeat(paddingNeeded) + closingStr);
            } else if (/^[`]/.test(origTrimmed)) {
              // Compiler directives - align with continuation indent
              result.push(continuationIndent + origTrimmed);
            } else {
              // Expression continuation lines
              result.push(continuationIndent + origTrimmed);
            }
          }
          lastEndIndex = conn.endIndex;
        } else {
          // Single line - format on one line
          // Pad connection so closing ) aligns with multiline ports
          const portPadded = conn.portName.padEnd(maxPortName);
          const currentPos = conn.indent.length + portPadded.length + 2 + conn.connection.length; // +2 for " ("
          const paddingNeeded = Math.max(0, unifiedClosingParenCol - currentPos);
          const connPadded = conn.connection + ' '.repeat(paddingNeeded);
          result.push(conn.indent + portPadded + ' (' + connPadded + ')' + conn.delimiter + (conn.comment ? ' ' + conn.comment : ''));
          lastEndIndex = conn.endIndex;
        }
      } else {
        // Not a port connection line - keep as is
        result.push(lines[i]);
      }
    }
  }

  return result;
}
