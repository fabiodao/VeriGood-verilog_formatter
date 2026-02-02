/**
 * Module header formatting module
 * 
 * Formats module declarations with parameter and port lists
 */

import { Config } from '../types';
import { alignModuleHeaderParameterLines } from './moduleHeaderParams';

export function formatModuleHeader(lines: string[], cfg: Config): string[] {
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
    // We look at the original lines to determine the existing alignment
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
