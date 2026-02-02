# Pre-Publishing Checklist

Use this checklist before publishing your extension.

## ✅ Required Steps

### 1. Update Personal Information

- [ ] Replace `"publisher": "internal"` in `package.json` with your publisher ID
- [ ] Update `"author": {"name": "Your Name"}` in `package.json` with your real name
- [ ] Replace `[Your Name]` in `LICENSE` with your real name
- [ ] Update repository URLs in `package.json` (if you have a GitHub repo)

### 2. Install vsce

```bash
npm install -g @vscode/vsce
```

### 3. Create Publisher Account

1. Go to https://marketplace.visualstudio.com/manage
2. Sign in with Microsoft account
3. Create a publisher (save your publisher ID!)

### 4. Create Personal Access Token (PAT)

1. Go to https://dev.azure.com/
2. User Settings → Personal Access Tokens → New Token
3. Scopes: **Marketplace → Manage**
4. **SAVE THE TOKEN SECURELY!**

### 5. Test Locally

```bash
# Compile the extension
npm run compile

# Package the extension (creates .vsix file)
vsce package

# Install and test locally
# In VS Code: Ctrl+Shift+P → "Extensions: Install from VSIX..."
```

## 🎨 Optional but Recommended

- [ ] Create a 128x128 PNG icon and add to package.json
- [ ] Create a GitHub repository and push your code
- [ ] Add screenshots to README.md showing the formatter in action
- [ ] Test with different Verilog files to ensure quality

## 📦 Ready to Publish!

Once everything is checked, publish with:

```bash
# Login (you'll be prompted for your PAT)
vsce login your-publisher-id

# Publish
vsce publish
```

Or if you prefer to package first and review:

```bash
# Create package
vsce package

# Review the .vsix file, then publish
vsce publish --packagePath ./verilog-guidelines-formatter-1.0.0.vsix
```

## 🚀 After Publishing

- [ ] Verify your extension appears at: https://marketplace.visualstudio.com/
- [ ] Search for it in VS Code marketplace
- [ ] Install it from the marketplace to test
- [ ] Share the link with others!

## 📝 Your Extension URLs

After publishing, your extension will be available at:

- **Marketplace**: `https://marketplace.visualstudio.com/items?itemName=your-publisher-id.verilog-guidelines-formatter`
- **VS Code**: Search "Verilog Guidelines Formatter" in Extensions

## ⚠️ Important Notes

1. **Version Number**: Currently set to `1.0.0` - perfect for first release
2. **Name Cannot Change**: The extension name in package.json cannot be changed after publishing
3. **Publisher Cannot Change**: Once published, the extension is tied to your publisher account
4. **Take Time**: The extension may take 5-10 minutes to appear in marketplace after publishing

## 📚 Full Documentation

See `PUBLISHING_GUIDE.md` for detailed step-by-step instructions.

---

**Current Status**: ✅ Extension is compiled and ready to package/publish!
