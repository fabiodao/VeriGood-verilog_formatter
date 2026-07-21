/**
 * Assignment/equals parsing utilities.
 *
 * These helpers are string-, comment- and depth-aware so that formatting does
 * not get confused by `==`/`!=`/`>=`, by `=`/`<=` that appear inside strings or
 * comments, or by operators nested inside parentheses/brackets/braces.
 */

/**
 * Splits a statement on its top-level assignment operator (`=` or `<=`).
 *
 * Returns a tuple shaped like a RegExp match: `[full, lhs, op, rhs]`, or `null`
 * when there is no top-level assignment. Unlike a naive
 * `/^(.*?)\s*(<=|=)\s*(.*)$/` match it:
 *   - ignores operators inside strings and line comments,
 *   - ignores operators nested inside (), [] or {},
 *   - never mistakes `==`, `!=`, `>=` (or the `=` of `<=`) for an assignment.
 */
export function splitTopLevelAssign(s: string): [string, string, string, string] | null {
  let depth = 0;
  let inStr = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (inStr) {
      if (ch === '\\') { i++; continue; }
      if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === '/' && s[i + 1] === '/') break;

    if (ch === '(' || ch === '[' || ch === '{') { depth++; continue; }
    if (ch === ')' || ch === ']' || ch === '}') { depth--; continue; }
    if (depth !== 0) continue;

    if (ch === '=') {
      const prev = s[i - 1];
      if (s[i + 1] === '=') { i++; continue; }              // skip ==
      if (prev === '!' || prev === '>' || prev === '=') continue; // skip !=, >=, ==
      if (prev === '<') {
        return [s, s.slice(0, i - 1).trim(), '<=', s.slice(i + 1).trim()];
      }
      return [s, s.slice(0, i).trim(), '=', s.slice(i + 1).trim()];
    }
  }

  return null;
}

/**
 * Normalizes spacing around `=` and `<=` to a single space on each side,
 * without touching `==`/`!=`/`<=`/`>=` in the "=" pass and without altering
 * text inside line comments, block comments or string literals.
 */
export function normalizeEqSpacing(s: string): string {
  const masks: string[] = [];
  let masked = s.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"/g, (m) => {
    masks.push(m);
    return '\0' + (masks.length - 1) + '\0';
  });
  masked = masked.replace(/([^=!<>])\s*=\s*([^=])/g, '$1 = $2');
  masked = masked.replace(/([^<])\s*<=\s*/g, '$1 <= ');
  return masked.replace(/\0(\d+)\0/g, (_m, i) => masks[+i]);
}

/**
 * Classifies a declaration line into a "variable kind" used only as a grouping
 * key when deciding whether consecutive declarations may be column-aligned
 * together. Currently every declaration is treated as the same kind.
 */
export function declVarKind(s: string): string {
  return 'signal';
}
