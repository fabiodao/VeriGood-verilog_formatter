# Pre-Publish Checklist

Use this checklist before publishing any version of the extension.

## ✅ Mandatory Steps

### 1. Run Complete Test Suite
```bash
npm test
```
**Status**: ⬜ Not run / ✅ All passed / ❌ Failed

**If failed**: Fix issues before proceeding. Do not publish with failing tests.

---

### 2. Manual Smoke Test

Test the extension in VS Code:

- [ ] Open a Verilog file (`.v` or `.sv`)
- [ ] Run format document (Shift+Alt+F or Cmd+Shift+I)
- [ ] Verify formatting looks correct
- [ ] Test format selection (select code, format selection)
- [ ] Verify selection formatting works

---

### 3. Version Number Updated

Check `package.json`:

- [ ] Version number incremented appropriately
  - Patch (1.4.4 → 1.4.5): Bug fixes
  - Minor (1.4.4 → 1.5.0): New features
  - Major (1.4.4 → 2.0.0): Breaking changes

---

### 4. Changelog Updated

Check `CHANGELOG.md`:

- [ ] New version section added
- [ ] All changes documented
- [ ] Date included
- [ ] Changes categorized:
  - Added (new features)
  - Changed (changes in existing functionality)
  - Fixed (bug fixes)
  - Deprecated (soon-to-be removed features)

---

### 5. Code Quality

- [ ] No console.log statements in production code
- [ ] No commented-out code blocks
- [ ] All TypeScript errors resolved
- [ ] Linter warnings addressed
- [ ] Code compiles without errors: `npm run compile`

---

## ⚙️ Optional but Recommended

### Documentation Review

- [ ] README.md reflects current features
- [ ] Configuration options documented
- [ ] Examples are accurate
- [ ] Links work correctly

### Test Coverage

- [ ] New features have tests
- [ ] Bug fixes have regression tests
- [ ] Edge cases covered
- [ ] Test suite runs in < 10 seconds

### Performance

- [ ] No noticeable performance regressions
- [ ] Large files (>1000 lines) format reasonably fast
- [ ] No infinite loops or hangs

---

## 📦 Publishing Steps

### Automated (Recommended)

```bash
npm run publish
```

This will:
1. ✓ Run all tests automatically
2. ✓ Compile TypeScript
3. ✓ Package extension
4. ✓ Publish to marketplace

### Manual (If Needed)

```bash
# 1. Ensure tests pass
npm test

# 2. Compile
npm run compile

# 3. Package
npm run package

# 4. Test the VSIX locally
code --install-extension verigood-verilog-formatter-X.X.X.vsix

# 5. Publish
vsce publish
```

---

## 🚨 Red Flags - Do Not Publish If

- ❌ Tests are failing
- ❌ Extension doesn't activate in VS Code
- ❌ Format command doesn't work
- ❌ TypeScript compilation errors
- ❌ Version not updated
- ❌ Changelog not updated
- ❌ Known critical bugs present

---

## 📊 Post-Publish Verification

After publishing:

- [ ] Check marketplace page loads correctly
- [ ] Install extension from marketplace in clean VS Code
- [ ] Verify extension works as expected
- [ ] Monitor for user issues/bug reports
- [ ] Update GitHub repository if needed

---

## 🔄 Version History

Track your publications:

| Version | Date | Tests | Notes |
|---------|------|-------|-------|
| 1.4.4 | 2026-02-02 | ✅ 9/9 | Multi-line condition fixes |
| | | | |
| | | | |

---

## 📝 Quick Reference

### Test Commands
- `npm test` - Run all tests
- `npm run test:generate` - Regenerate expected outputs

### Build Commands
- `npm run compile` - Compile TypeScript
- `npm run watch` - Compile with watch mode

### Package Commands
- `npm run package` - Create VSIX (runs tests first)
- `npm run publish` - Publish to marketplace (runs tests first)

---

## 💡 Tips

1. **Test early, test often** - Run tests during development, not just before publish
2. **Keep tests updated** - Add tests for every bug fix and feature
3. **Manual testing matters** - Automated tests catch most issues, but manual testing catches UX problems
4. **Version strategically** - Use semantic versioning consistently
5. **Document everything** - Future you will thank present you

---

## ⚡ Emergency Hotfix Process

If you need to publish a critical fix immediately:

1. Fix the bug
2. Add regression test
3. Run `npm test` (must pass)
4. Update version (patch increment)
5. Update changelog
6. `npm run publish`

Even for hotfixes, **never skip the tests**.

---

**Last Updated**: 2026-02-02
**Test Suite Version**: 1.0 (72+ test cases)
