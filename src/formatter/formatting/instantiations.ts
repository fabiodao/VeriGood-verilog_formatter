/**
 * Module instantiation formatting module
 *
 * Formats module instantiations (both parameterized and simple)
 */

import { formatSingleInstantiation } from './singleInstantiation';

export function formatModuleInstantiations(lines: string[], indentSize: number): string[] {
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
