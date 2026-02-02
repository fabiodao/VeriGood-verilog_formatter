# Test Suite Quick Start

## Before Publishing - Always Run This

```bash
npm test
```

✅ **Only publish if all tests pass!**

## Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npm test` | Run all tests | Before every publish |
| `npm run test:generate` | Generate expected outputs | After fixing bugs or adding features |
| `npm run package` | Package extension | Tests run automatically first |
| `npm run publish` | Publish extension | Tests run automatically first |

## What Gets Tested

✓ Module declarations (9 variations)
✓ Module instantiations (6 variations)
✓ Always blocks (8 variations)
✓ Case statements (6 variations)
✓ Multi-line conditions (10 variations)
✓ Assignments (7 variations)
✓ Wire/Reg declarations (8 variations)
✓ Parameters and ports (6 variations)
✓ Comments and edge cases (12 variations)

**Total: 72+ test cases across 9 categories**

## Workflow

### Normal Development
1. Make changes to formatter
2. Run `npm test`
3. Fix any failures
4. Repeat until all pass
5. Publish

### After Bug Fix
1. Fix the bug
2. Add test case to relevant input file
3. Run `npm run test:generate`
4. Manually verify expected output
5. Run `npm test` to confirm
6. Publish

### After New Feature
1. Implement feature
2. Add comprehensive test cases
3. Run `npm run test:generate`
4. Manually verify expected outputs
5. Run `npm test` to ensure no regressions
6. Document feature
7. Publish

## Reading Test Results

### All Pass ✓
```
✓ PASS: module declarations
✓ PASS: always blocks
...
🎉 All tests passed! Extension is ready for publish.
```
**Action**: You can safely publish!

### Failure ✗
```
✗ FAIL: multiline conditions

First difference at line 7:
  Expected: "      condition2 &&"
  Actual:   "    condition2 &&"
```
**Action**: Fix the formatter issue before publishing!

## Safety Features

- **Automatic pre-publish testing**: Tests run before `npm run package` and `npm run publish`
- **Detailed failure output**: See exactly what failed and where
- **Expected output validation**: Catches regressions immediately
- **Comprehensive coverage**: 72+ test cases across all features

## Pro Tips

💡 Run `npm test` frequently during development to catch issues early

💡 If a test fails after your changes, that's expected - fix it!

💡 If a test fails when you didn't change that area, you found a regression!

💡 Always manually verify expected outputs after regenerating them

💡 Add tests for every bug fix to prevent regressions

## Questions?

See the full [tests/README.md](README.md) for detailed documentation.
