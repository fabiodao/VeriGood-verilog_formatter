# Verilog Formatter Quick Reference

## Before and After Examples

### Example 1: Case Statement in Else Block
**Before:**
```verilog
always @(*) begin
if (a) begin
x = 1;
end else begin
case (b)
1'b0: y = 0;
1'b1: y = 1;
endcase
end
end
```

**After:**
```verilog
always @(*) begin
  if (a) begin
    x       = 1;
  end else begin
    case (b)
      1'b0: y = 0;
      1'b1: y = 1;
    endcase
  end
end
```

### Example 2: Nested If/Else with Case
**Before:**
```verilog
always @(posedge HClk or negedge Reset_n) begin
if(!Reset_n) begin
hcfes   <= #(P_Delay) 1'b0;
end else begin
case(curr_state)
P_ERROR: begin
if(hcfError)
hcfes   <= #(P_Delay) 1'b1;
end
endcase
end
end
```

**After:**
```verilog
always @(posedge HClk or negedge Reset_n) begin
  if(!Reset_n) begin
    hcfes   <= #(P_Delay) 1'b0;
  end else begin
    case(curr_state)
      P_ERROR: begin
        if(hcfError)
        hcfes   <= #(P_Delay) 1'b1;
      end
    endcase
  end
end
```

### Example 3: Multiple End-Else-Begin Patterns
**Before:**
```verilog
case (state)
2'b00: begin
if (condition1) begin
out = 1'b1;
end else begin
out = 1'b0;
end
end
2'b01: begin
if (condition2) begin
out = 1'b0;
end else begin
out = 1'b1;
end
end
endcase
```

**After:**
```verilog
case (state)
  2'b00: begin
    if (condition1) begin
      out     = 1'b1;
    end else begin
      out     = 1'b0;
    end
  end
  2'b01: begin
    if (condition2) begin
      out     = 1'b0;
    end else begin
      out     = 1'b1;
    end
  end
endcase
```

## Key Features

### ✅ Proper Indentation
- Consistent 2-space indentation (configurable)
- Correct nesting for all block types
- Proper alignment of case items

### ✅ Assignment Alignment
- Aligns `=` operators in consecutive assignments
- Works correctly inside nested blocks
- Preserves non-blocking assignment delays

### ✅ End-Else-Begin Pattern
- Always keeps "end else begin" on the same line
- Correct indentation relative to parent block
- Works at any nesting level

### ✅ Case Statement Handling
- Proper indentation inside else blocks
- Correct alignment of case items
- Handles nested case statements

### ✅ Comment Preservation
- Maintains end-of-line comments
- Preserves comment indentation
- Keeps block comments intact

## Configuration Options

Edit in VS Code Settings (`Ctrl+,` or `Cmd+,`):

```json
{
  "verilogFormatter.indentSize": 2,           // Spaces per indent level
  "verilogFormatter.alignAssignments": true,  // Align assignment operators
  "verilogFormatter.maxBlankLines": 1,        // Max consecutive blank lines
  "verilogFormatter.alignPortList": true,     // Align module port declarations
  "verilogFormatter.alignParameters": true,   // Align parameter declarations
  "verilogFormatter.removeTrailingWhitespace": true
}
```

## Usage Tips

### Format Entire File
- **Windows/Linux**: `Shift+Alt+F`
- **macOS**: `Shift+Option+F`
- Or: Right-click → "Format Document"

### Format Selection
- Select code block
- **Windows/Linux**: `Ctrl+K Ctrl+F`
- **macOS**: `Cmd+K Cmd+F`
- Or: Right-click → "Format Selection"

### Format on Save
Enable in settings:
```json
{
  "[verilog]": {
    "editor.formatOnSave": true
  },
  "[systemverilog]": {
    "editor.formatOnSave": true
  }
}
```

## Testing Your Formatting

Use the included test script:
```bash
node test_formatter.js your_file.v
```

This will show:
- Original input
- Formatted output
- Save formatted version to `your_file_formatted.v`

## Troubleshooting

### Issue: Indentation looks wrong
- **Check**: Is the code properly terminated with `end`/`endcase`?
- **Solution**: Ensure all blocks have matching `begin`/`end` pairs

### Issue: Assignments not aligning
- **Check**: Are they consecutive with no blank lines?
- **Solution**: Remove blank lines between assignments to group them

### Issue: Format command does nothing
- **Check**: Is file extension `.v` or `.sv`?
- **Solution**: Verify file is recognized as Verilog/SystemVerilog

## Best Practices

1. **Format Early, Format Often**: Format code as you write
2. **Enable Format on Save**: Ensures consistent style
3. **Review Formatted Output**: Check that logic is preserved
4. **Use Test Cases**: Create test files for complex scenarios
5. **Keep Blocks Clean**: Avoid mixing statements and comments excessively

## Version Information
- **Extension**: Verilog Guidelines Formatter v0.0.1
- **Last Updated**: December 2024
- **Status**: Production Ready ✅
