# VeriGood - Verilog Formatter

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/FabioOliveira.verigood-verilog-formatter?label=VS%20Code%20Marketplace&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=FabioOliveira.verigood-verilog-formatter)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/FabioOliveira.verigood-verilog-formatter?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=FabioOliveira.verigood-verilog-formatter)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **[中文文档 / Chinese README](README_zh.md)**

A powerful Verilog/SystemVerilog code formatter for VS Code with **granular control** over every formatting feature. Unlike other formatters that force a specific style, VeriGood lets you enable or disable each feature independently.

## Why VeriGood?

- **Granular Control** - Enable only the features you want
- **Production Ready** - Handles complex real-world RTL code with `ifdef`, multi-line expressions, and nested concatenations
- **UVM Testbench Support** - Automatic detection and independent formatting for UVM/SystemVerilog testbenches
- **Non-Destructive** - Preserves your code structure while improving readability
- **Selection Formatting** - Format just the code you select, not the entire file
- **Zero Configuration** - Works out of the box with sensible defaults

## Features

### Module Header Formatting
Automatically aligns ports and parameters in module declarations:

```verilog
// Before
module my_module #(
parameter WIDTH=8,
parameter DEPTH = 16
)(
input wire clk,
input wire [WIDTH-1:0] data_in,
output reg [WIDTH-1:0] data_out
);

// After
module my_module #(
  parameter WIDTH = 8 ,
  parameter DEPTH = 16
  )
  (
  input  wire             clk     ,
  input  wire [WIDTH-1:0] data_in ,
  output reg  [WIDTH-1:0] data_out
  );
```

### Assignment Alignment
Aligns the operators of consecutive assignments for improved readability, while keeping each semicolon tight to the right-hand side:

```verilog
// Before
assign data_out = data_in;
assign valid = enable & ready;
assign count_next = count + 1;

// After
assign data_out   = data_in;
assign valid      = enable & ready;
assign count_next = count + 1;
```

### Wire/Reg Declaration Alignment
Aligns signal declarations within groups:

```verilog
// Before
wire [7:0] data;
wire valid;
wire [31:0] address;

// After
wire  [7:0] data   ;
wire        valid  ;
wire [31:0] address;
```

### Module Instantiation Formatting
Formats module instantiations with aligned ports and parameters:

```verilog
// Before
my_fifo #(
  .DEPTH(16),
  .WIDTH(8)
  ) u_fifo (
  .clk(clk  ),
   .data_in(din),
  .data_out(dout )
);

// After
my_fifo #(
  .DEPTH (16),
  .WIDTH (8 )
  ) u_fifo (
    .clk      (clk ),
    .data_in  (din ),
    .data_out (dout)
    );
```

### Instantiation Style Control
Control how module instantiations are formatted with three configuration options:

#### Expand Single-Line Modules
Force specific modules to always be formatted as multi-line, even if they were originally single-line:

```json
{
  "verilogFormatter.expandSingleLineModules": ["ILF_REG", "DFF"]
}
```

```verilog
// Before (single-line)
ILF_REG #(.BITS(8)) u_reg (.Q(out), .D(in), .CLK(clk));

// After (expanded to multi-line)
ILF_REG #(
  .BITS (8)
  ) u_reg (
    .Q   (out),
    .D   (in ),
    .CLK (clk)
    );
```

#### Collapse Single-Line Modules
Force specific modules to always be formatted as single-line:

```json
{
  "verilogFormatter.collapseSingleLineModules": ["DFF"]
}
```

```verilog
// Before (multi-line)
DFF u_ff (
  .Q   (out),
  .D   (in ),
  .CLK (clk)
);

// After (collapsed to single-line)
DFF u_ff (.Q(out),.D(in),.CLK(clk));
```

#### Preserve Original Style
Keep the original formatting style: single-line stays single-line, multi-line stays multi-line:

```json
{
  "verilogFormatter.preserveInstantiationStyle": true
}
```

```verilog
// Single-line stays single-line
ILF_REG #(.BITS(8)) u_reg (.Q(out), .D(in), .CLK(clk));

// Multi-line stays multi-line (with proper alignment)
DFF u_ff (
  .Q   (out),
  .D   (in ),
  .CLK (clk)
  );
```

#### Priority Order
When multiple options conflict, the priority is:
1. `collapseSingleLineModules` (highest priority)
2. `expandSingleLineModules`
3. `preserveInstantiationStyle` (lowest priority)

### Additional Features
- **Always/Initial Block Indentation** - Proper nesting inside procedural blocks
- **Case Statement Formatting** - Correct indentation for case items
- **Begin/End Enforcement** - Adds begin/end to single-line if/else/for statements
- **Ifdef Annotation** - Adds comments to `else and `endif directives
- **Comment Alignment** - Aligns trailing comments to a specified column
- **Blank Line Control** - Limits consecutive blank lines
- **Trailing Whitespace Removal** - Cleans up line endings

## Installation

1. Open VS Code
2. Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on macOS)
3. Search for "VeriGood"
4. Click **Install**

Or install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=FabioOliveira.verigood-verilog-formatter).

## Usage

### Format Document
- **Keyboard**: `Shift+Alt+F` (Windows/Linux) or `Shift+Option+F` (macOS)
- **Context Menu**: Right-click → "Format Document"
- **Command Palette**: `Ctrl+Shift+P` → "Format Document"

### Format Selection
Select the code you want to format, then:
- **Keyboard**: `Ctrl+K Ctrl+F` (Windows/Linux) or `Cmd+K Cmd+F` (macOS)
- **Context Menu**: Right-click → "Format Selection"

**Important**: Selection formatting calculates alignment based ONLY on the selected lines. This means:
- Semicolons, assignments, and declarations are aligned within the selection
- Groups are separated by the same rules as document formatting (e.g., wires with initialization are separate from wires without)
- Alignment may differ from document formatting if the selection doesn't include all related declarations
- This is intentional - selection formatting doesn't look at lines outside your selection

### Recommended Keybinding
Add this to your `keybindings.json` for smart formatting (formats selection if text is selected, otherwise formats the whole document):

```json
{
  "key": "shift+alt+f",
  "command": "editor.action.formatDocument",
  "when": "editorTextFocus && !editorHasSelection"
},
{
  "key": "shift+alt+f",
  "command": "editor.action.formatSelection",
  "when": "editorTextFocus && editorHasSelection"
}
```

## Configuration

All settings are prefixed with `verilogFormatter.` and can be configured in VS Code settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `indentSize` | `editor.tabSize` | Spaces per indent level (inherits from editor settings) |
| `maxBlankLines` | `1` | Maximum consecutive blank lines |
| `alignPortList` | `true` | Align ports in module headers |
| `alignParameters` | `true` | Align parameters in module headers |
| `alignAssignments` | `true` | Align consecutive assignments |
| `alignWireDeclSemicolons` | `true` | Align wire/reg declarations |
| `formatModuleHeaders` | `true` | Format module declarations |
| `formatModuleInstantiations` | `true` | Format module instantiations |
| `indentAlwaysBlocks` | `true` | Indent always/initial blocks |
| `indentCaseStatements` | `true` | Indent case statements |
| `enforceBeginEnd` | `true` | Add begin/end to if/else/for |
| `annotateIfdefComments` | `true` | Annotate `else/`endif directives |
| `commentColumn` | `0` | Column for comment alignment (0 = disabled) |
| `lineLength` | `160` | Maximum line length guideline |
| `removeTrailingWhitespace` | `true` | Remove trailing whitespace |
| `expandSingleLineModules` | `[]` | List of module names whose single-line instantiations should be expanded to multi-line format |
| `collapseSingleLineModules` | `[]` | List of module names whose instantiations should be collapsed to single-line format |
| `preserveInstantiationStyle` | `false` | Preserve original instantiation style: single-line stays single-line, multi-line stays multi-line |

### Example Settings

```json
{
  "editor.tabSize": 2,
  "verilogFormatter.alignAssignments": true,
  "verilogFormatter.formatModuleHeaders": true,
  "verilogFormatter.commentColumn": 60
}
```

> **Note:** The formatter automatically uses your `editor.tabSize` setting for indentation. You only need to set `verilogFormatter.indentSize` if you want a different value specifically for Verilog files.

## UVM Testbench Support

VeriGood automatically detects and formats UVM/SystemVerilog testbenches differently from RTL code:

### Auto-Detection

Files are identified as UVM testbenches when they contain:
- UVM macros (`` `uvm_component_utils``, `` `uvm_object_utils``, `` `uvm_field_*``, etc.)
- UVM base classes (`extends uvm_component`, `extends uvm_test`, `extends uvm_driver`, etc.)
- UVM phase methods (`build_phase`, `run_phase`, `connect_phase`, etc.)
- UVM factory/config calls (`uvm_config_db`, `uvm_factory`, etc.)

### UVM-Specific Formatting

The UVM formatter is **completely independent** from the RTL formatter to avoid conflicts:

- ✅ **Aligns assignments within functions/tasks** - Groups consecutive assignments for readability
- ✅ **Aligns constraint blocks** - Properly formats `constraint` blocks with `==` operators
- ✅ **No module-level alignment** - Wire/reg declarations and module-level assigns are not aligned
- ✅ **Editor-controlled indentation** - Uses your editor's tab size setting
- ✅ **Proper class/function/task indentation** - Handles nested structures correctly
- ✅ **Preserves function parameters** - Unlike RTL module headers

### Configuration

```json
{
  "verilogFormatter.enableUVMFormatting": true,  // Enable auto-detection (default: true)
  "verilogFormatter.uvmLineLength": 100          // Max line length for UVM (default: 100)
}
```

### Example

```systemverilog
// Before
class my_driver extends uvm_driver #(my_transaction);
`uvm_component_utils(my_driver)
function new(string name, uvm_component parent);
super.new(name, parent);
endfunction
task run_phase(uvm_phase phase);
forever begin
seq_item_port.get_next_item(req);
drive_transaction(req);
end
endtask
endclass

// After (properly indented, no alignment)
class my_driver extends uvm_driver #(my_transaction);
  `uvm_component_utils(my_driver)

  function new(string name, uvm_component parent);
    super.new(name, parent);
  endfunction

  task run_phase(uvm_phase phase);
    forever begin
      seq_item_port.get_next_item(req);
      drive_transaction(req);
    end
  endtask
endclass
```

## Handling Complex Code

VeriGood is designed to handle real-world RTL code:

### Ifdef Blocks
Preserves `ifdef/`else/`endif structure and optionally annotates them:

```verilog
`ifdef FEATURE_A
  wire feature_signal;
`else // FEATURE_A
  wire fallback_signal;
`endif // FEATURE_A
```

### Multi-line Expressions
Correctly handles parameters and ports spanning multiple lines:

```verilog
parameter P_LOOKUP_TABLE = (P_MODE == 0)
                           ? {4'h0, 4'h1, 4'h2, 4'h3}
                           : {4'hF, 4'hE, 4'hD, 4'hC}
```

### Nested Concatenations
Properly formats complex signal concatenations:

```verilog
.data_out ({
  {8{1'b0}},
  data_msb,
  data_lsb
})
```

## Supported File Types

- `.v` - Verilog
- `.vh` - Verilog Header
- `.sv` - SystemVerilog
- `.svh` - SystemVerilog Header

## Known Limitations

- Does not parse full Verilog grammar; uses pattern matching for speed
- Very long lines (>1000 characters) may not be optimally formatted
- Some edge cases with deeply nested generate blocks

## Testing

VeriGood includes a comprehensive test suite of **12 test suites** (one per feature area) covering all features and edge cases.

### Running Tests

Before publishing or after making changes:

```bash
npm test
```

The test suite validates:
- ✓ Module declarations and instantiations
- ✓ Always blocks and indentation
- ✓ Case statements
- ✓ Multi-line conditions (if/for/while)
- ✓ Assignment alignment
- ✓ Wire/reg declarations
- ✓ Parameters and ports
- ✓ Parameter alignment
- ✓ Comments and edge cases
- ✓ Nested ifdef/ifndef blocks
- ✓ UVM testbench formatting

Tests automatically run before packaging (`npm run package`) and publishing (`npm run publish`).

Test inputs live in `tests/inputs/` with golden outputs in `tests/expected/`. After an intentional formatting change, review the diffs and regenerate the golden outputs with `npm run test:generate`.

## Contributing

Issues and pull requests are welcome on [GitHub](https://github.com/fabiodao/VeriGood-verilog_formatter).

## License

MIT License - See [LICENSE](LICENSE) for details.
