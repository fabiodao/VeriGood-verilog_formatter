import { Config } from '../types';

/**
 * Applies comment column alignment to a line
 */
export function applyCommentColumn(line: string, cfg: Config): string {
  if (cfg.commentColumn <= 0) return line;
  const idx = line.indexOf('//');
  if (idx === -1) return line;
  const prefix = line.substring(0, idx).replace(/\s+$/, '');
  const comment = line.substring(idx).replace(/\/\/\s?/, '// ');
  if (prefix.length >= cfg.commentColumn) return prefix + ' ' + comment;
  const spaces = ' '.repeat(cfg.commentColumn - prefix.length);
  return prefix + spaces + comment;
}

/**
 * Wraps long comments to fit within max line length
 */
export function wrapComment(line: string, maxLen: number): string {
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
