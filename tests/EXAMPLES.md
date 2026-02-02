# Test Examples

This document shows examples of test cases and how they validate the formatter.

## Example 1: Multi-line Condition Alignment

### Input (Unformatted)
```verilog
always @(*) begin
if (signal_a &&
signal_b &&
signal_c) begin
result = 1;
end
end
```

### Expected Output (Formatted)
```verilog
always @(*) begin
  if (signal_a &&
      signal_b &&
      signal_c) begin
    result  = 1;
  end
end
```

### What's Tested
✓ Base indentation (2 spaces for always block)
✓ Continuation line alignment (6 spaces, aligned after `(`)
✓ Inner block indentation (4 spaces)
✓ Assignment alignment

---

## Example 2: Module Declaration

### Input (Unformatted)
```verilog
module with_params #(
parameter WIDTH=8,
parameter DEPTH =16
)(
input clk,
output [WIDTH-1:0] data
);
endmodule
```

### Expected Output (Formatted)
```verilog
module with_params #(
  parameter WIDTH = 8 ,
  parameter DEPTH = 16
  )
  (
  input                clk ,
  output [WIDTH-1:0]   data
  );
endmodule
```

### What's Tested
✓ Parameter alignment (equals signs aligned)
✓ Port alignment (signal names aligned)
✓ Comma placement (consistent)
✓ Indentation (consistent 2-space)

---

## Example 3: Case Statement Indentation

### Input (Unformatted)
```verilog
always @(*) begin
case (state)
2'b00: output=0;
2'b01: output=1;
default: output=3;
endcase
end
```

### Expected Output (Formatted)
```verilog
always @(*) begin
  case (state)
    2'b00:   output = 0;
    2'b01:   output = 1;
    default: output = 3;
  endcase
end
```

### What's Tested
✓ Case statement indentation
✓ Case items indented relative to case
✓ Assignment alignment within case
✓ Default case handling

---

## Example 4: Assignment Alignment

### Input (Unformatted)
```verilog
assign a=b+c;
assign data=result;
assign output_signal=input_signal;
```

### Expected Output (Formatted)
```verilog
assign a             = b+c;
assign data          = result;
assign output_signal = input_signal;
```

### What's Tested
✓ Equals sign alignment across consecutive assigns
✓ Whitespace normalization
✓ Grouping of related assignments

---

## Example 5: Wire Declaration Alignment

### Input (Unformatted)
```verilog
wire a;
wire [7:0] data;
wire [31:0] long_data_bus;
wire clk;
```

### Expected Output (Formatted)
```verilog
wire        a            ;
wire [7:0]  data         ;
wire [31:0] long_data_bus;
wire        clk          ;
```

### What's Tested
✓ Semicolon alignment
✓ Signal name alignment
✓ Bit width formatting
✓ Consistent column spacing

---

## Example 6: Begin/End Enforcement

### Input (Unformatted)
```verilog
always @(posedge clk)
data <= 1;
```

### Expected Output (Formatted)
```verilog
always @(posedge clk) begin
  data <= 1;
end
```

### What's Tested
✓ Automatic begin/end addition
✓ Proper indentation after adding begin/end
✓ Single-statement blocks handled correctly

---

## Example 7: Complex Nesting

### Input (Unformatted)
```verilog
always @(*) begin
if (a) begin
if (b) begin
if (c) begin
result = 1;
end
end
end
end
```

### Expected Output (Formatted)
```verilog
always @(*) begin
  if (a) begin
    if (b) begin
      if (c) begin
        result = 1;
      end
    end
  end
end
```

### What's Tested
✓ Deep nesting (4 levels)
✓ Consistent 2-space indentation per level
✓ No indentation drift
✓ Proper end alignment

---

## Example 8: Ifdef with Comments

### Input (Unformatted)
```verilog
`ifdef DEBUG
wire debug_signal;
`endif
```

### Expected Output (Formatted)
```verilog
`ifdef DEBUG
wire debug_signal;
`endif // DEBUG
```

### What's Tested
✓ Ifdef annotation (comment added)
✓ Directive preservation
✓ Code inside ifdef properly formatted

---

## Example 9: Module Instantiation

### Input (Unformatted)
```verilog
complex_module #(
.WIDTH(8),
.DEPTH(16)
) u_complex (
.clk(clk),
.data(data)
);
```

### Expected Output (Formatted)
```verilog
complex_module #(
  .WIDTH (8) ,
  .DEPTH (16)
  ) u_complex (
  .clk  (clk) ,
  .data (data)
  );
```

### What's Tested
✓ Parameter alignment in instantiation
✓ Port alignment in instantiation
✓ Consistent spacing
✓ Comma placement

---

## Example 10: Edge Case - Empty Block

### Input (Unformatted)
```verilog
always @(*) begin
end
```

### Expected Output (Formatted)
```verilog
always @(*) begin
end
```

### What's Tested
✓ Empty blocks don't crash formatter
✓ Structure preserved
✓ No spurious additions

---

## How Tests Work

1. **Input files** contain intentionally badly-formatted Verilog
2. **Formatter runs** on each input with all features enabled
3. **Output compared** to pre-generated expected output
4. **Test passes** if output matches expected exactly
5. **Test fails** if there's any difference (shows exact line/column)

## Running These Examples

All these examples are in the test suite! Run:

```bash
npm test
```

To see all examples validated in seconds.

## Adding Your Own Examples

1. Add test case to appropriate input file (e.g., `tests/inputs/05_multiline_conditions.v`)
2. Run `npm run test:generate` to create expected output
3. Manually verify the expected output is correct
4. Run `npm test` to validate

---

**These examples represent just a fraction of the 72+ test cases in the suite!**
