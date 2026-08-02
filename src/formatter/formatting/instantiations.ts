/**
 * Module instantiation formatting module
 *
 * Formats module instantiations (both parameterized and simple)
 */

import { formatSingleInstantiation } from './singleInstantiation';
import { Config } from '../types';

export function formatModuleInstantiations(lines: string[], indentSize: number, config?: Config): string[] {
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
      // An enclosing block opener (begin/always/if/for/generate/...) indents this
      // instantiation one unit deeper; a module-level declaration matches its own
      // indent; a closing keyword (end/endgenerate/...) stops the search.
      for (let lookback = i - 1; lookback >= Math.max(0, i - 10); lookback--) {
        const prevLine = lines[lookback];
        const prevTrimmed = prevLine.trim();
        // Skip blank lines and comments
        if (!prevTrimmed || prevTrimmed.startsWith('//')) continue;
        const codePart = prevTrimmed.replace(/\/\/.*$/, '').trim();
        if (!codePart) continue;
        if (/^(end|endgenerate|endcase|endfunction|endtask|endmodule)\b/.test(codePart)) {
          break;
        }
        const isBlockOpener = /^(begin|always|always_ff|always_comb|always_latch|initial|if|else|for|while|foreach|generate)\b/.test(codePart) || /\bbegin\b(\s*:\s*\w+)?$/.test(codePart);
        if (isBlockOpener) {
          const openerIndent = (prevLine.match(/^(\s*)/)?.[1]) || '';
          baseIndent = openerIndent + unit;
          break;
        }
        if (/^(wire|reg|logic|assign|input|output|inout|parameter|localparam)\b/.test(codePart)) {
          baseIndent = (prevLine.match(/^(\s*)/)?.[1]) || '';
          break;
        }
      }

      // Collect the entire instantiation
      const instLines: string[] = [line];
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

      // Check if this module should be expanded or collapsed based on config
      const moduleName = extractModuleName(instLines);
      let shouldExpand = false;
      let shouldCollapse = false;
      let shouldPreserveStyle = false;

      if (config && moduleName) {
        const expandList = config.expandSingleLineModules || [];
        const collapseList = config.collapseSingleLineModules || [];
        
        // Priority: collapseSingleLineModules > expandSingleLineModules > preserveInstantiationStyle
        if (collapseList.includes(moduleName)) {
          shouldCollapse = true;
        } else if (expandList.includes(moduleName)) {
          shouldExpand = true;
        } else if (config.preserveInstantiationStyle) {
          shouldPreserveStyle = true;
        }
      }

      // Format the instantiation
      let formatted: string[];
      if (shouldCollapse) {
        formatted = collapseToSingleLine(instLines, baseIndent);
      } else if (shouldExpand) {
        formatted = formatSingleInstantiation(instLines, baseIndent, unit, true);
      } else if (shouldPreserveStyle) {
        // Preserve original style: single-line stays single-line, multi-line stays multi-line
        const isOriginalSingleLine = instLines.length === 1;
        if (isOriginalSingleLine) {
          // Keep as single line but format it properly
          formatted = collapseToSingleLine(instLines, baseIndent);
        } else {
          // Keep as multi-line and format it properly
          formatted = formatSingleInstantiation(instLines, baseIndent, unit);
        }
      } else {
        formatted = formatSingleInstantiation(instLines, baseIndent, unit);
      }
      
      formatted.forEach(l => result.push(l));
      i = j;
    } else {
      result.push(line);
      i++;
    }
  }

  return result;
}

/**
 * Extract module name from instantiation lines
 */
function extractModuleName(lines: string[]): string | null {
  if (!lines || lines.length === 0) return null;
  const firstLine = lines[0].trim();
  
  // Match module_name #( or module_name instance_name (
  const match = firstLine.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+(?:#|([A-Za-z_][A-Za-z0-9_]*)\s*\()/);
  if (match) {
    return match[1];
  }
  
  // Match just module_name (for split instantiations)
  const simpleMatch = firstLine.match(/^([A-Za-z_][A-Za-z0-9_]*)$/);
  if (simpleMatch) {
    return simpleMatch[1];
  }
  
  return null;
}

/**
 * Collapse a multi-line instantiation to a single line
 */
function collapseToSingleLine(lines: string[], baseIndent: string): string[] {
  if (!lines || lines.length === 0) return lines;
  
  // If already single line, return as-is
  if (lines.length === 1) {
    return lines;
  }
  
  // Join all lines and normalize whitespace
  const fullText = lines.map(l => l.trim()).join(' ');
  
  // Remove extra whitespace
  const normalized = fullText
    .replace(/\s+/g, ' ')
    .replace(/\s*\(\s*/g, '(')
    .replace(/\s*\)\s*/g, ')')
    .replace(/\s*,\s*/g, ',')
    .replace(/\s*;\s*$/, ';');
  
  return [baseIndent + normalized];
}
