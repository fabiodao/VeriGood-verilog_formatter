/**
 * Wire/reg/logic declaration alignment module
 * 
 * Aligns wire, reg, logic, input, output, inout, and integer declarations
 */

import { Config } from '../types';

export function alignWireDeclGroup(lines: string[], cfg: Config): string[] {
  // Enhanced: comments and macro directives inside a declaration block do NOT break alignment; they pass through.
  interface DeclRow { indent: string; keyword: string; typeKeyword: string; range: string; name: string; unpackedDim: string; initLines: string[]; hasInit: boolean; comment: string; originalLines: string[]; isMultiNames: boolean; namesList: string; isPassthrough: boolean; }

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
      return { indent, keyword: '', typeKeyword: '', range: '', name: '', unpackedDim: '', initLines: [], hasInit: false, comment: '', originalLines: block, isMultiNames: false, namesList: '', isPassthrough: true };
    }
    const commentMatchLast = block[block.length - 1].match(/(.*?)(\/\/.*)$/);
    const endComment = commentMatchLast ? commentMatchLast[2].replace(/\/\/\s?/, '// ').trim() : '';
    const bodyFirst = first.replace(/(\/\/.*)$/, '').trim();
    // Match: (input|output|inout|integer)? (wire|reg|logic)? (signed|unsigned)? [range]? name
    // Note: integer is a standalone type without range
    const declMatch = bodyFirst.match(/^(input|output|inout|wire|reg|logic|integer)\s*(?:(wire|reg|logic)\s*)?(?:(signed|unsigned)\s*)?(\[[^\]]+\])?\s*(.*)$/);
    if (declMatch) {
      const firstKeyword = declMatch[1];
      const secondKeyword = declMatch[2] || '';
      const signKeyword = declMatch[3] || '';
      // If first is input/output/inout, that's direction, second is type
      // If first is wire/reg/logic/integer and no second, that's type
      const keyword = /^(input|output|inout)$/.test(firstKeyword) ? firstKeyword : firstKeyword;
      const typeKeyword = /^(input|output|inout)$/.test(firstKeyword) ? (secondKeyword + (signKeyword ? ' ' + signKeyword : '')) : signKeyword;
      const range = declMatch[4] ? declMatch[4].trim() : '';
      let remainder = declMatch[5].trim();
      // Check for initialization BEFORE checking for comma (comma might be in the init expression)
      const hasEquals = /\=/.test(remainder);
      if (!hasEquals && /,/.test(remainder)) {
        // Multi-name declaration (no equals sign, but has comma)
        const namesList = remainder.replace(/;\s*$/, '') + (block.length > 1 ? ' ' + block.slice(1, -1).map(b => b.trim()).join(' ') : '');
        return { indent, keyword, typeKeyword, range, name: '', unpackedDim: '', initLines: [], hasInit: false, comment: endComment, originalLines: block, isMultiNames: true, namesList: namesList.replace(/;\s*$/, ''), isPassthrough: false };
      }
      let name = remainder.replace(/;\s*$/, '').trim();
      let unpackedDim = '';
      
      // Extract unpacked dimension (second range) from name
      // Keep the space before the unpacked dimension
      const unpackedMatch = name.match(/^([A-Za-z_][A-Za-z0-9_$]*)(\s+\[.+\])$/);
      if (unpackedMatch) {
        name = unpackedMatch[1];
        unpackedDim = unpackedMatch[2];
      }
      
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

      return { indent, keyword, typeKeyword, range, name, unpackedDim, initLines, hasInit, comment: endComment, originalLines: block, isMultiNames: false, namesList: '', isPassthrough: false };
    }
    return { indent, keyword: '', typeKeyword: '', range: '', name: first.trim(), unpackedDim: '', initLines: [], hasInit: false, comment: endComment, originalLines: block, isMultiNames: false, namesList: '', isPassthrough: true };
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

  // For declarations WITHOUT init, calculate their own max name width (including unpacked dimensions)
  const declsWithoutInit = singleRows.filter(r => !r.hasInit);
  const maxSingleNameNoInit = declsWithoutInit.length ? Math.max(...declsWithoutInit.map(r => (r.name + r.unpackedDim).length)) : 0;

  const multiNamesLengths = multiNameRows.map(r => {
    const keywordCol = r.keyword.padEnd(maxKeyword);
    const typeKeywordCol = maxTypeKeyword ? r.typeKeyword.padEnd(maxTypeKeyword) : '';
    const rangeCol = maxRange ? r.range.padStart(maxRange) : '';
    const namesCol = r.namesList.padEnd(maxNamesList);
    const segs = [keywordCol]; if (r.typeKeyword) segs.push(typeKeywordCol); if (maxRange) segs.push(rangeCol); segs.push(namesCol);
    return segs.join(' ').length;
  });
  const noInitLengths = declsWithoutInit.map(r => {
    const keywordCol = r.keyword.padEnd(maxKeyword);
    const typeKeywordCol = maxTypeKeyword ? r.typeKeyword.padEnd(maxTypeKeyword) : '';
    const rangeCol = maxRange ? r.range.padStart(maxRange) : '';
    const nameCol = (r.name + r.unpackedDim).padEnd(maxSingleNameNoInit);
    const segs = [keywordCol]; if (r.typeKeyword) segs.push(typeKeywordCol); if (maxRange) segs.push(rangeCol); segs.push(nameCol);
    return segs.join(' ').length;
  });
  const maxBodyLenNoInit = [...multiNamesLengths, ...noInitLengths].length ? Math.max(...[...multiNamesLengths, ...noInitLengths]) : 0;

  // For declarations WITH init, calculate their own max name width (including unpacked dimensions) and align the '=' sign
  const declsWithInit = singleRows.filter(r => r.hasInit);
  const maxSingleNameWithInit = declsWithInit.length ? Math.max(...declsWithInit.map(r => (r.name + r.unpackedDim).length)) : 0;

  const maxDeclBeforeEquals = declsWithInit.length ? Math.max(...declsWithInit.map(r => {
    const keywordCol = r.keyword.padEnd(maxKeyword);
    const typeKeywordCol = maxTypeKeyword ? r.typeKeyword.padEnd(maxTypeKeyword) : '';
    const rangeCol = maxRange ? r.range.padStart(maxRange) : '';
    const nameCol = (r.name + r.unpackedDim).padEnd(maxSingleNameWithInit);
    const segs = [keywordCol]; if (r.typeKeyword) segs.push(typeKeywordCol); if (maxRange) segs.push(rangeCol); segs.push(nameCol);
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
      const segs = [keywordCol]; 
      if (r.typeKeyword) segs.push(typeKeywordCol); // Only add if this row has typeKeyword
      if (maxRange) segs.push(rangeCol); // Always add if maxRange > 0
      segs.push(namesCol);
      const pos = r.indent.length + segs.join(' ').length;
      // Exclude if adding semicolon would exceed line length
      return (pos + 1 + (r.comment ? r.comment.length + 1 : 0) <= cfg.lineLength) ? pos : 0;
    } else {
      const nameCol = r.name + r.unpackedDim;
      const segs = [keywordCol]; 
      if (r.typeKeyword) segs.push(typeKeywordCol); // Only add if this row has typeKeyword
      if (maxRange) segs.push(rangeCol); // Always add if maxRange > 0
      segs.push(nameCol);
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
        // For non-init declarations, use the actual length without name padding
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
      const segs = [expectedKeywordCol]; 
      if (r.typeKeyword) segs.push(expectedTypeKeywordCol); 
      if (maxRange) segs.push(expectedRangeCol); // Always add if maxRange > 0
      segs.push(expectedNamesCol);
      const lineBeforeSemi = r.indent + segs.join(' ');
      const padding = ' '.repeat(Math.max(0, maxSemicolonPos - lineBeforeSemi.length));
      const expectedLine = lineBeforeSemi + padding + ';' + (r.comment ? ' ' + r.comment : '');
      if (r.originalLines[0] !== expectedLine) {
        alreadyAligned = false;
        break;
      }
    } else {
      const expectedNameCol = r.name + r.unpackedDim;
      const segs = [expectedKeywordCol]; 
      if (r.typeKeyword) segs.push(expectedTypeKeywordCol); 
      if (maxRange) segs.push(expectedRangeCol); // Always add if maxRange > 0
      segs.push(expectedNameCol);
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
      const segs = [keywordCol]; 
      if (r.typeKeyword) segs.push(typeKeywordCol); 
      if (maxRange) segs.push(rangeCol); // Always add if maxRange > 0, even if empty
      segs.push(namesCol);
      const lineBeforeSemi = r.indent + segs.join(' ');
      const wouldExceedLimit = (lineBeforeSemi.length + 1 + (r.comment ? r.comment.length + 1 : 0)) > cfg.lineLength;
      if (wouldExceedLimit) {
        out.push(lineBeforeSemi + ';' + (r.comment ? ' ' + r.comment : ''));
      } else {
        const padding = ' '.repeat(Math.max(0, maxSemicolonPos - lineBeforeSemi.length));
        out.push(lineBeforeSemi + padding + ';' + (r.comment ? ' ' + r.comment : ''));
      }
    } else {
      const nameCol = r.name + r.unpackedDim;
      const segs = [keywordCol]; 
      if (r.typeKeyword) segs.push(typeKeywordCol); 
      if (maxRange) segs.push(rangeCol); // Always add if maxRange > 0, even if empty
      segs.push(nameCol);
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
