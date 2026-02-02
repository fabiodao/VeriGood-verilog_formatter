# Verilog Formatter Test Suite

Comprehensive test suite to ensure the formatter maintains stability and quality across all features.

## Directory Structure

```
tests/
├── inputs/          # Test input files (unformatted Verilog)
├── expected/        # Expected formatted outputs
├── generate_expected.js  # Generate expected outputs from current formatter
├── run_tests.js     # Run full test suite
└── README.md        # This file
```

## Test Categories

### 01_module_declarations.v
- Simple modules without parameters/ports
- Modules with inline ports
- Modules with parameters and ports (multi-line)
- Modules with `ifdef` in parameters
- Multi-line parameter values
- Comments in parameters and ports
- Edge cases with empty modules

### 02_module_instantiations.v
- Simple single-line instances
- Complex instances with parameters and ports
- Multi-line parameter values
- `ifdef` directives in instances
- Multiple instances
- Mixed short and long port names

### 03_always_blocks.v
- Always blocks without begin/end (should enforce)
- Proper always blocks with begin/end
- Combinational always blocks
- Nested if/else inside always
- Case statements inside always
- Multiple always blocks
- For loops inside always
- Deeply nested conditions

### 04_case_statements.v
- Simple case statements
- Case with begin/end blocks
- Nested case statements
- Case with comments
- Case inside if statement
- Multiple statements per case item

### 05_multiline_conditions.v
- Multi-line if conditions with various operators
- Multi-line if with else/else if
- Nested multi-line conditions
- Multi-line for/while loop conditions
- Very long multi-line conditions
- Complex parentheses in conditions
- Multi-line ternary assignments

### 06_assignments.v
- Assign statements (alignment)
- Blocking assignments in always blocks
- Non-blocking assignments
- Mixed simple and complex expressions
- Multi-line assignments (concatenations)
- Assignments with comments
- Conditional (ternary) assignments

### 07_wire_reg_declarations.v
- Wire declarations with various bit widths
- Reg declarations
- Declarations with initialization
- Multi-bit declarations
- Declarations with comments
- Multiple declarations on one line
- Signed declarations
- Packed/unpacked array declarations

### 08_parameters_ports.v
- Parameter declarations (alignment)
- Port declarations with various types
- Localparam declarations
- Mixed parameter and localparam
- Ports with different types (wire/reg/inout)
- Ports with packed arrays

### 09_comments_edge_cases.v
- Block comments preservation
- `ifdef`/`endif` with annotation
- Multiple blank lines (compression)
- Trailing whitespace removal
- Complex nested structures
- Mixed tabs and spaces normalization
- Inline comments preservation
- Empty always blocks
- Single-line if (should add begin/end)
- Complex bit manipulations
- Replication and concatenation
- Nested concatenation with replication

## Usage

### Running Tests

Before publishing the extension, always run the test suite:

```bash
# Run all tests (compiles first)
npm test

# If tests fail, check the detailed output for:
# - Which test failed
# - Line-by-line comparison of expected vs actual
# - Context around the failure
```

### Generating Expected Outputs

When you add new features or fix bugs, regenerate expected outputs:

```bash
# Generate expected outputs from current formatter
npm run test:generate

# Then run tests to verify
npm test
```

**⚠️ Important:** Only regenerate expected outputs after verifying the formatter produces correct output manually!

### Adding New Tests

1. Create a new test file in `tests/inputs/` following the naming convention:
   - Format: `##_descriptive_name.v`
   - Example: `10_generate_blocks.v`

2. Write comprehensive test cases covering:
   - Normal cases
   - Edge cases
   - Corner cases with unusual formatting
   - Mixed features

3. Generate expected output:
   ```bash
   npm run test:generate
   ```

4. Manually verify the expected output is correct:
   - Check `tests/expected/##_descriptive_name.v`
   - Ensure formatting is as intended

5. Run the full test suite:
   ```bash
   npm test
   ```

### Automated Testing in CI/CD

The test suite automatically runs:
- **Before packaging**: `npm run package` (via `prepackage` hook)
- **Before publishing**: `npm run publish` (via `prepublish` hook)

This ensures you never publish a broken version.

## Test Philosophy

### What Makes a Good Test?

1. **Focused**: Each test file focuses on one feature area
2. **Comprehensive**: Covers normal, edge, and corner cases
3. **Unformatted Input**: Input should be intentionally badly formatted
4. **Verifiable**: Expected output should be manually verified
5. **Documented**: Comments explain what each test checks

### Coverage Goals

- ✓ All configuration options exercised
- ✓ All formatting features tested
- ✓ Edge cases covered (empty blocks, single lines, deep nesting)
- ✓ Corner cases tested (mixed tabs/spaces, unusual whitespace)
- ✓ Regression prevention (past bugs tested)

## Interpreting Test Failures

When a test fails, the output shows:

```
✗ FAIL: multiline conditions

[1] multiline conditions (05_multiline_conditions.v)
------------------------------------------------------------
First difference at line 7:
  Expected: "      condition2 &&"
  Actual:   "    condition2 &&"

Context (lines 5-9):
  > E[7]: "      condition2 &&"
  > A[7]: "    condition2 &&"
```

This tells you:
- Which test failed
- Which file
- The first line that differs
- Context around the difference
- Expected vs actual output

### Common Failure Causes

1. **Indentation mismatch**: Check indent size configuration
2. **Alignment off**: Check alignment-related config options
3. **Missing spaces**: Check whitespace normalization
4. **Extra blank lines**: Check `maxBlankLines` configuration
5. **Trailing whitespace**: Check `removeTrailingWhitespace`

## Maintenance

### Regular Maintenance Tasks

- **After adding features**: Add corresponding tests
- **After fixing bugs**: Add regression test
- **Before release**: Run full test suite
- **Periodically**: Review and expand corner case coverage

### Updating Test Suite

When formatter behavior intentionally changes:

1. Update relevant test input if needed
2. Regenerate expected output: `npm run test:generate`
3. Manually verify the new output is correct
4. Document the change in CHANGELOG.md
5. Run full suite to check for regressions: `npm test`

## Best Practices

✓ **Always run tests before publishing**
✓ **Add tests for every bug fix**
✓ **Add tests for every new feature**
✓ **Manually verify expected outputs**
✓ **Don't skip failing tests** - fix the issue
✓ **Keep tests fast** - entire suite should run in seconds
✓ **Document unusual test cases**

## Troubleshooting

### Tests fail after regenerating expected outputs

- Manually review the expected output files
- Check if the formatter behavior changed unintentionally
- If behavior is correct, the tests should pass now
- If behavior is wrong, fix the formatter first

### New test always fails

- Verify the input file is valid Verilog
- Check that expected output exists
- Run formatter manually to see actual output
- Compare with expected line by line

### Tests pass locally but fail in CI

- Check Node.js version consistency
- Verify all dependencies are installed
- Check for platform-specific issues (line endings)

## Questions?

If you encounter issues with the test suite, check:
1. This README
2. Test failure output (very detailed)
3. Individual test files for examples
4. The formatter documentation in `/docs`
