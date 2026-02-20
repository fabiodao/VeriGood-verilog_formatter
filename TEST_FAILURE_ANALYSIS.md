# Test Failure Analysis

## Test 1: module declarations (01_module_declarations.v)

### Issue: Multi-line parameter value formatting

**Location:** Lines 43-45

**Input:**
```verilog
module multiline_param_value #(
parameter INIT_VALUE={32'h00000000,
32'hFFFFFFFF,
32'hAAAAAAAA},
parameter DEPTH=8
)
```

**Expected Output:**
```verilog
module multiline_param_value #(
  parameter INIT_VALUE = {32'h00000000,
                          32'hFFFFFFFF,
                          32'hAAAAAAAA},
  parameter DEPTH      = 8
```

**Actual Output:**
```verilog
module multiline_param_value #(
  parameter INIT_VALUE = {
32'h00000000,
32'hFFFFFFFF,
```

**Root Cause:**
The module header parameter formatter (`src/formatter/formatting/moduleHeaderParams.ts`) is not properly handling multi-line parameter values. When it encounters a multi-line value starting with `{`, it's breaking the line incorrectly and not indenting continuation lines to align with the opening brace.

**Fix Required:**
- The continuation lines (lines after the first line of a multi-line parameter) need to be indented to align with the character after the `=` sign
- For `parameter INIT_VALUE = {32'h00000000,`, continuation lines should start at column position matching the `{` character
- This requires calculating the proper indentation: `indentSpaces + leftPadded.length + ' = '.length`

---

## Test 2: always blocks (03_always_blocks.v)

### Issue: Single-statement always block indentation

**Location:** Lines 4-6

**Input:**
```verilog
always @(posedge clk)
data <= 1;
```

**Expected Output:**
```verilog
always @(posedge clk)
  data <= 1;
```

**Actual Output:**
```verilog
always @(posedge clk)
data <= 1;
```

**Root Cause:**
The always block indentation code (`src/formatter/indentation/alwaysBlocks.ts`) has a flag `expectSingleStatement` that should add extra indentation for single statements after `always` without `begin/end`, but it's not being triggered correctly for this case.

The issue is at line 73 where it tracks `expectSingleStatement`, but the logic only applies when inside an always block (`insideAlways` is true). For always blocks without `begin`, the code needs to detect that the next non-empty line after `always` should be indented.

**Fix Required:**
- When an `always` line is detected without `begin` on the same line, set `expectSingleStatement = true`
- The next non-empty, non-comment, non-directive line should get extra indentation (one `unit` level)
- After formatting that single statement, reset `expectSingleStatement = false`

---

## Test 3: case statements (04_case_statements.v)

### Issue: Assignment alignment within case items

**Location:** Lines 6-10

**Input:**
```verilog
case (state)
2'b00: output=0;
2'b01: output=1;
2'b10: output=2;
default: output=3;
endcase
```

**Expected Output:**
```verilog
  case (state)
    2'b00: output   = 0;
    2'b01: output   = 1;
    2'b10: output   = 2;
    default: output = 3;
  endcase
```

**Actual Output:**
```verilog
  case (state)
    2'b00: output = 0;
    2'b01: output = 1;
    2'b10: output = 2;
    default: output = 3;
  endcase
```

**Root Cause:**
The case statement indentation code (`src/formatter/indentation/caseStatements.ts`) is normalizing spaces around `=` to single spaces, but the expected output shows that assignments within case items should be ALIGNED.

Looking at the expected output:
- `2'b00: output   = 0;` has 3 spaces before `=`
- `2'b01: output   = 1;` has 3 spaces before `=`
- `2'b10: output   = 2;` has 3 spaces before `=`
- `default: output = 3;` has 1 space before `=`

This means the `=` signs should align at the same column position for all case items. The longest left-hand side is `output` (6 chars), so all should pad to that length.

**Fix Required:**
- Before formatting case items, scan all case items in the current case statement
- Find the longest left-hand side (variable name) before the `=` or `<=`
- Pad all left-hand sides to that length before adding ` = ` or ` <= `
- This requires a two-pass approach: first pass to collect all case items and find max length, second pass to format with alignment

---

## Test 4: multiline conditions (05_multiline_conditions.v)

### Issue: Assignment alignment within if blocks

**Location:** Lines 5-10

**Input:**
```verilog
if (signal_a &&
signal_b &&
signal_c) begin
result = 1;
end
```

**Expected Output:**
```verilog
  if (signal_a &&
      signal_b &&
      signal_c) begin
    result  = 1;
  end
```

**Actual Output:**
```verilog
  if (signal_a &&
      signal_b &&
      signal_c) begin
    result = 1;
  end
```

**Root Cause:**
Similar to the case statement issue, assignments within if blocks should be aligned. The expected output shows `result  = 1;` with 2 spaces before `=`, suggesting that if there were multiple assignments in this if block, they would all align their `=` signs.

However, looking at this specific example, there's only ONE assignment in the if block, so the extra space might be for consistency with other blocks in the same always block, or it might be a formatting preference.

**Fix Required:**
- Within each control block (if/else/for), scan for all assignments
- Find the longest left-hand side variable name
- Pad all left-hand sides to align the `=` or `<=` operators
- This requires block-level alignment, not just line-by-line normalization

---

## Test 5: assignments (06_assignments.v)

### Issue: Assignment alignment within always blocks

**Location:** Lines 17-20

**Input:**
```verilog
always @(posedge clk) begin
reg1<=data1;
reg2<=data2;
long_register_name<=short;
end
```

**Expected Output:**
```verilog
always @(posedge clk) begin
  reg1               <= data1;
  reg2               <= data2;
  long_register_name <= short;
end
```

**Actual Output:**
```verilog
always @(posedge clk) begin
  reg1 <= data1;
  reg2 <= data2;
  long_register_name <= short;
end
```

**Root Cause:**
The always block indentation code is adding spaces around `<=`, but it's not aligning the operators. The expected output shows that all `<=` operators should align at the same column position.

The longest variable name is `long_register_name` (18 chars), so all variable names should be padded to 18 characters before adding ` <= `.

**Fix Required:**
- Within each always block, scan for all assignments (both `=` and `<=`)
- Find the longest left-hand side variable name
- Pad all left-hand sides to that length before adding the operator
- This requires a two-pass approach within the always block indentation code

---

## Test 6: wire reg declarations (07_wire_reg_declarations.v)

### Issue: Wire/reg declaration grouping and alignment

**Location:** Lines 10-14

**Input:**
```verilog
// Test 2: Reg declarations - unaligned semicolons
reg valid;
reg [15:0] counter;
reg [7:0] state;
reg done;
```

**Expected Output:**
```verilog
// Test 2: Reg declarations - unaligned semicolons
reg         valid        ;
reg  [15:0] counter      ;
reg   [7:0] state        ;
reg         done         ;
```

**Actual Output:**
```verilog
// Test 2: Reg declarations - unaligned semicolons
reg        valid  ;
reg [15:0] counter;
reg  [7:0] state  ;
```

**Root Cause:**
The wire declaration grouping logic is not working correctly. The change I made to flush on the first blank line for non-IO declarations is causing the group to be broken up incorrectly. 

Looking at the actual output, it appears that some declarations are being formatted while others are not, suggesting that the group is being split mid-way through.

The issue is in `src/formatter/index.ts` at the blank line handling (lines 473-487). The condition `!firstPendingIsIO && wireGroupNonDeclCount > 0` is flushing immediately on the first blank line, but the comment line (line 10) is being counted as a non-declaration line, causing the flush to happen prematurely.

**Fix Required:**
- Comments should NOT cause a flush for wire declarations
- Only actual blank lines (empty lines) should cause a flush
- The `wireGroupNonDeclCount` should only count blank lines, not comments
- Comments should be included in the pending group to preserve them within the alignment

---

## Test 7: parameters ports (08_parameters_ports.v)

### Issue: Inconsistent comma spacing in parameters

**Location:** Lines 3-6

**Input:**
```verilog
parameter WIDTH=8,
parameter DEPTH=16,
parameter INIT_VAL=0,
parameter MODE=1
```

**Expected Output:**
```verilog
  parameter WIDTH    = 8 ,
  parameter DEPTH    = 16,
  parameter INIT_VAL = 0 ,
  parameter MODE     = 1
```

**Actual Output:**
```verilog
  parameter WIDTH    = 8 ,
  parameter DEPTH    = 16 ,
  parameter INIT_VAL = 0 ,
  parameter MODE = 1
```

**Root Cause:**
The expected output shows inconsistent comma spacing:
- Line 3: `= 8 ,` (space before comma)
- Line 4: `= 16,` (NO space before comma)
- Line 5: `= 0 ,` (space before comma)
- Line 6: `= 1` (no comma)

This is INCONSISTENT in the expected output itself. The formatter is currently adding a space before all commas uniformly (` ,`), which is actually MORE consistent than the expected output.

**Fix Required:**
This appears to be an error in the expected output file. The user should either:
1. Make all commas consistent WITH space: `= 8 ,`, `= 16 ,`, `= 0 ,`, `= 1`
2. Make all commas consistent WITHOUT space: `= 8,`, `= 16,`, `= 0,`, `= 1`

The current formatter behavior (adding space before all commas) is reasonable and consistent.

**Recommendation:** Ask the user to clarify the expected comma spacing behavior.

---

## Test 8: comments edge cases (09_comments_edge_cases.v)

### Issue: Single wire declaration semicolon alignment

**Location:** Line 7-8

**Input:**
```verilog
/* This is a
   multi-line
   block comment */
wire data;
```

**Expected Output:**
```verilog
/* This is a
   multi-line
   block comment */
wire data        ;
```

**Actual Output:**
```verilog
/* This is a
   multi-line
   block comment */
wire data;
```

**Root Cause:**
Even a single wire declaration should have semicolon padding/alignment. The expected output shows `wire data        ;` with significant padding before the semicolon.

The wire alignment code (`src/formatter/alignment/wires.ts`) calculates `maxSemicolonPos` based on the longest declaration in the group, but for a single declaration, it's not adding any padding.

Looking at the expected output, there are 8 spaces between `data` and `;`, suggesting a minimum semicolon position or alignment to some standard column.

**Fix Required:**
- Even for single-wire declarations, apply semicolon alignment
- The semicolon should be at a minimum position (e.g., column 20 or based on some calculation)
- OR: Check if there are other wire declarations in the file and align to the same position as those
- The current code might be skipping alignment for single-item groups

---

## Summary of Required Changes

### High Priority (Breaking Functionality):
1. **Wire declaration grouping** - Comments breaking groups incorrectly
2. **Always block single statement** - Missing indentation for statements without begin/end
3. **Multi-line parameter values** - Continuation lines not indented correctly

### Medium Priority (Alignment Features):
4. **Case item assignment alignment** - Need two-pass alignment within case statements
5. **Always block assignment alignment** - Need two-pass alignment within always blocks
6. **If block assignment alignment** - Need two-pass alignment within if blocks

### Low Priority (Edge Cases):
7. **Single wire semicolon padding** - Need minimum padding even for single declarations
8. **Parameter comma spacing** - Inconsistent in expected output, needs clarification

### Architectural Changes Needed:
- The indentation code needs to be refactored to support **local alignment** of assignments
- This requires a two-pass approach:
  1. First pass: Scan the block to find all assignments and calculate max left-hand side length
  2. Second pass: Format with aligned operators
- This is a significant change that affects `alwaysBlocks.ts` and `caseStatements.ts`
