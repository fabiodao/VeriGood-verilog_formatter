/**
 * Multiline condition alignment module
 *
 * Aligns continuation lines of multiline if/for/while conditions
 */

export function alignMultilineConditions(lines: string[]): string[] {
  const result: string[] = [];
  let parenStack: number[] = []; // Stack to track column positions of opening parentheses
  let parenBalance = 0; // Track cumulative balance of ( and )
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
      // Check if this is a parameterless module (module name;) - no need to skip subsequent lines
      if (/^\s*module\s+\w+\s*;\s*$/.test(line)) {
        // Parameterless module - just push this line and don't enter module mode
        result.push(line);
        continue;
      }

      // Module with parameters/ports - enter module mode
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
        parenBalance = 0; // Reset balance for new statement

        // Count parentheses in the line to track if statement continues
        let openCount = 0;
        let closeCount = 0;
        for (let j = 0; j < line.length; j++) {
          if (line[j] === '(') openCount++;
          if (line[j] === ')') closeCount++;
        }

        parenBalance = openCount - closeCount;

        // If there are unclosed parentheses, track the alignment column
        if (parenBalance > 0) {
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

      // Update cumulative balance
      parenBalance += openCount - closeCount;

      // Align this line to the column after the opening parenthesis
      const alignedLine = ' '.repeat(alignColumn) + trimmed;
      result.push(alignedLine);

      // If all parentheses are now balanced, clear the stack
      if (parenBalance <= 0) {
        parenStack = [];
        parenBalance = 0;
      }
      continue;
    }

    // Not in a multiline condition, just pass through
    result.push(line);
  }

  return result;
}
