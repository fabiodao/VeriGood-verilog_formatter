/**
 * Port declaration alignment module
 * 
 * Aligns input/output/inout port declarations in module headers
 */

export function alignPortDeclLines(lines: string[]): string[] {
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
