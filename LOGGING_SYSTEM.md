# Test Logging System

## Overview

The test runner now automatically creates detailed log files for every test run. This helps track test results, debug failures, and maintain a history of test executions.

## Log File Location

Log files are saved in: `tests/logs/`

Each log file is named with a timestamp: `test-run-YYYY-MM-DD_HH-MM-SS-mmm.log`

Example: `test-run-2026-02-20_12-33-38-787.log`

## What's Logged

Each log file contains:

1. **Test Run Header**
   - Timestamp when tests started
   - Log file path

2. **Per-Test Information**
   - Test name and file
   - Configuration used (e.g., `indentAlwaysBlocks` setting)
   - Pass/Fail status

3. **Failure Details** (for failed tests)
   - First line where difference occurs
   - Expected vs Actual output comparison
   - Context lines around the difference
   - **Full diff** showing all expected and actual lines

4. **Test Summary**
   - Total number of tests
   - Number passed/failed
   - Completion timestamp

## Output Files

In addition to logs, the test runner also saves:

- **Actual formatted outputs**: `tests/outputs/` directory
- Each test's actual output is saved as `<test-name>.v`
- These can be compared with expected outputs in `tests/expected/`

## Git Ignore

The following directories are ignored by git:
- `tests/logs/` - Log files
- `tests/outputs/` - Actual test outputs

This prevents cluttering the repository with test artifacts.

## Usage

Simply run the tests as usual:

```bash
npm test
```

The log file path will be displayed in the console output:
```
Log file: C:\Users\fabioo\verilog-formatter\tests\logs\test-run-2026-02-20_12-33-38-787.log
```

## Benefits

1. **Debugging**: Full diffs in log files make it easy to understand why tests fail
2. **History**: Keep track of test runs over time
3. **Comparison**: Actual outputs saved for easy file comparison
4. **CI/CD**: Logs can be archived in continuous integration systems
5. **Analysis**: Can analyze patterns in test failures across multiple runs

## Log File Structure

```
╔════════════════════════════════════════════════════════════╗
║        Verilog Formatter - Comprehensive Test Suite        ║
╚════════════════════════════════════════════════════════════╝

Test run started at: 2026-02-20T12:33:38.791Z
Log file: C:\Users\fabioo\verilog-formatter\tests\logs\test-run-2026-02-20_12-33-38-787.log


Testing: module declarations (01_module_declarations.v)
  Config: {"indentAlwaysBlocks":false}
  ✗ FAIL

Testing: module instantiations (02_module_instantiations.v)
  Config: {"indentAlwaysBlocks":false}
  ✓ PASS

...

============================================================
Total:  11 tests
Passed: 3 ✓
Failed: 8 ✗
============================================================

╔════════════════════════════════════════════════════════════╗
║                      FAILURE DETAILS                       ║
╚════════════════════════════════════════════════════════════╝

[1] module declarations (01_module_declarations.v)
------------------------------------------------------------
First difference at line 43:
  Expected: "  parameter INIT_VALUE = {32'h00000000,"
  Actual:   "  parameter INIT_VALUE = {"

Context (lines 41-46):
  E[41]: "// Test 5: Module with multi-line parameter values"
  A[41]: "// Test 5: Module with multi-line parameter values"
  ...

--- Full Diff for 01_module_declarations.v ---
Expected output (73 lines):
E[1]: module test_declarations;
E[2]: 
...

Actual output (73 lines):
A[1]: module test_declarations;
A[2]: 
...
--- End Diff ---

...

Test run completed at: 2026-02-20T12:33:39.017Z
```

## Maintenance

Log files accumulate over time. You may want to periodically clean old logs:

```bash
# Windows PowerShell
Remove-Item tests\logs\*.log -Force

# Linux/Mac
rm tests/logs/*.log
```

Or keep only recent logs:

```bash
# Keep only logs from last 7 days (Windows PowerShell)
Get-ChildItem tests\logs\*.log | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-7)} | Remove-Item
```
