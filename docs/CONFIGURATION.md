# Verilog Formatter Configuration Options

This extension provides granular control over which formatting features to apply to your Verilog/SystemVerilog code. You can enable or disable specific formatting groups based on your preferences.

## Configuration Settings

Access these settings through VS Code's Settings UI (`Ctrl+,`) or by editing your `settings.json` file.

### Basic Settings

#### `verilogFormatter.indentSize`
- **Type:** `number`
- **Default:** `2`
- **Description:** Number of spaces per indentation level.

#### `verilogFormatter.maxBlankLines`
- **Type:** `number`
- **Default:** `1`
- **Description:** Maximum number of consecutive blank lines allowed.

#### `verilogFormatter.lineLength`
- **Type:** `number`
- **Default:** `160`
- **Description:** Maximum line length guideline.

#### `verilogFormatter.removeTrailingWhitespace`
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Remove trailing whitespace from lines.

#### `verilogFormatter.commentColumn`
- **Type:** `number`
- **Default:** `0`
- **Description:** If greater than 0, aligns trailing `//` comments starting at this column.

---

### Alignment Features

#### `verilogFormatter.alignPortList`
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Align ports vertically in module declarations.
- **Example:**
  ```verilog
  // With alignPortList: true
  input  wire       clk,
  input  wire       rst,
  output wire [7:0] data
  ```

#### `verilogFormatter.alignParameters`
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Align parameter assignments inside module headers.
- **Example:**
  ```verilog
  // With alignParameters: true
  #(
    parameter WIDTH  = 8,
    parameter DEPTH  = 16,
    parameter SIGNED = 1
  )
  ```

#### `verilogFormatter.alignAssignments`
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Align `=` and `<=` operators in contiguous assignment groups.
- **Example:**
  ```verilog
  // With alignAssignments: true
  data_out  <= data_in;
  valid_out <= valid_in;
  ready     <= 1'b1;
  ```

#### `verilogFormatter.alignWireDeclSemicolons`
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Align semicolons in wire/reg/logic declaration groups.
- **Example:**
  ```verilog
  // With alignWireDeclSemicolons: true
  wire [7:0] data_a   ;
  wire [3:0] data_b   ;
  wire       valid    ;
  ```

#### `verilogFormatter.wrapPortList`
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Wrap long port lists that exceed the line length.

---

### Module Formatting

#### `verilogFormatter.formatModuleHeaders`
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Format module headers with properly aligned ports and parameters.
- **Effect:** When enabled, reformats module declarations to align parameters and ports vertically. When disabled, module headers are left unchanged.

#### `verilogFormatter.formatModuleInstantiations`
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Format module instantiations with aligned ports and parameters.
- **Effect:** When enabled, reformats module instantiations to align port connections and parameters vertically, including support for multiline concatenations. When disabled, module instantiations are left unchanged.
- **Example:**
  ```verilog
  // With formatModuleInstantiations: true
  my_module #(
    .WIDTH (8 ),
    .DEPTH (16)
  ) inst (
    .clk  (clk_in  ),
    .data (data_bus),
    .out  ({signal1,
            signal2,
            signal3})
  );
  ```

---

### Control Structure Formatting

#### `verilogFormatter.indentAlwaysBlocks`
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Properly indent content inside `always` and `initial` blocks.
- **Effect:** When enabled, ensures content within always/initial blocks is indented correctly. When disabled, always block content indentation is not modified.

#### `verilogFormatter.enforceBeginEnd`
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Enforce `begin`/`end` blocks for `if`/`else`/`for` statements.
- **Effect:** When enabled, automatically adds `begin`/`end` blocks to single-line if/else/for statements and ensures proper indentation. When disabled, these control structures are left unchanged.
- **Example:**
  ```verilog
  // With enforceBeginEnd: true
  if (condition) begin
    statement;
  end else begin
    other_statement;
  end

  for (i = 0; i < 10; i = i + 1) begin
    data[i] = 0;
  end
  ```

#### `verilogFormatter.indentCaseStatements`
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Properly indent case statements and case items.
- **Effect:** When enabled, ensures case statements, case items, and nested content are indented correctly. When disabled, case statement indentation is not modified.
- **Example:**
  ```verilog
  // With indentCaseStatements: true
  case (state)
    IDLE: begin
      output = 0;
    end
    ACTIVE: begin
      output = 1;
    end
  endcase
  ```

---

### Preprocessor Directives

#### `verilogFormatter.annotateIfdefComments`
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Add comments to `` `else`` and `` `endif`` directives.
- **Effect:** When enabled, automatically adds or updates comments on `` `else`` and `` `endif`` lines to indicate which `` `ifdef``/`` `ifndef`` they correspond to. When disabled, preprocessor directives are left unchanged.
- **Example:**
  ```verilog
  // With annotateIfdefComments: true
  `ifdef DEBUG
    // debug code
  `else // DEBUG
    // release code
  `endif // DEBUG
  ```

---

## Example Configuration

Here's an example `settings.json` configuration that enables only specific formatting features:

```json
{
  "verilogFormatter.indentSize": 2,
  "verilogFormatter.formatModuleHeaders": true,
  "verilogFormatter.formatModuleInstantiations": true,
  "verilogFormatter.enforceBeginEnd": true,
  "verilogFormatter.indentCaseStatements": true,
  "verilogFormatter.alignAssignments": true,
  "verilogFormatter.alignWireDeclSemicolons": false,
  "verilogFormatter.annotateIfdefComments": true,
  "verilogFormatter.indentAlwaysBlocks": true
}
```

## Disabling Specific Features

If you want to disable certain formatting features, simply set them to `false`:

```json
{
  // Disable begin/end enforcement to keep compact single-line statements
  "verilogFormatter.enforceBeginEnd": false,

  // Disable module instantiation formatting to preserve manual formatting
  "verilogFormatter.formatModuleInstantiations": false,

  // Disable ifdef comment annotation
  "verilogFormatter.annotateIfdefComments": false
}
```

## Tips

1. **Start with defaults**: All features are enabled by default. Try the formatter with default settings first.

2. **Incremental adoption**: If integrating into an existing codebase, consider enabling features one at a time.

3. **Team consistency**: Share your team's `settings.json` configuration to ensure consistent formatting across all developers.

4. **Workspace settings**: You can set these configurations per-workspace by editing `.vscode/settings.json` in your project root.

5. **Preview changes**: Always review formatted output before committing, especially when enabling new features.
