import { Config } from '../types';

/**
 * Manages macro annotation for ifdef/else/endif directives
 */
export class MacroAnnotator {
  private macroStack: string[] = [];

  /**
   * Annotates a line with macro comments if it contains ifdef directives
   */
  annotate(line: string, cfg: Config): string {
    if (!cfg.annotateIfdefComments) return line;

    const leading = line.match(/^\s*/)?.[0] || '';
    const trimmed = line.trim();

    // Check if directive appears mid-line (like "{`ifdef SYMBOL")
    const midLineMatch = trimmed.match(/^(.+?)(`ifn?def\s+(\w+)|`else\b|`endif\b.*)$/);
    if (midLineMatch && !trimmed.startsWith('`')) {
      return this.handleMidLineDirective(leading, midLineMatch);
    }

    // Handle ifdef / ifndef at start of line
    const ifdefM = trimmed.match(/^`ifn?def\s+(\w+)/);
    if (ifdefM) {
      const name = ifdefM[1];
      this.macroStack.push(name);
      return leading + trimmed; // do not append comment on ifdef lines per style
    }

    // Handle else
    if (/^`else\b/.test(trimmed)) {
      const current = this.macroStack[this.macroStack.length - 1];
      if (current) {
        if (/\/\//.test(trimmed)) {
          // Normalize existing comment
          if (!new RegExp(`//\\s*${current}$`).test(trimmed)) {
            return leading + '`else // ' + current; // replace any existing comment
          }
          return leading + trimmed.replace(/`else.*?(\/\/\s*.*)$/, '`else // ' + current);
        }
        return leading + '`else // ' + current;
      }
      return leading + trimmed;
    }

    // Handle endif
    if (/^`endif\b/.test(trimmed)) {
      const popped = this.macroStack.pop();
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
          // No comment yet - add comment THEN preserve any trailing content
          return leading + '`endif // ' + popped + (afterEndif ? ' ' + afterEndif : '');
        }
      }
      return leading + '`endif';
    }

    return line;
  }

  private handleMidLineDirective(leading: string, match: RegExpMatchArray): string {
    const beforeDirective = match[1];
    const directivePart = match[2];

    // Handle ifdef/ifndef
    const ifdefMatch = directivePart.match(/^`ifn?def\s+(\w+)/);
    if (ifdefMatch) {
      this.macroStack.push(ifdefMatch[1]);
      return leading + beforeDirective + directivePart; // Don't annotate ifdef
    }

    // Handle else
    if (/^`else\b/.test(directivePart)) {
      const current = this.macroStack[this.macroStack.length - 1];
      if (current) {
        return leading + beforeDirective + '`else // ' + current;
      }
      return leading + beforeDirective + directivePart;
    }

    // Handle endif
    if (/^`endif\b/.test(directivePart)) {
      const popped = this.macroStack.pop();
      if (popped) {
        const afterEndif = directivePart.replace(/^`endif\s*/, '');
        return leading + beforeDirective + '`endif // ' + popped + (afterEndif ? ' ' + afterEndif : '');
      }
      return leading + beforeDirective + directivePart;
    }

    return leading + beforeDirective + directivePart;
  }
}
