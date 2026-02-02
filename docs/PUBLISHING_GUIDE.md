# Publishing Guide for Verilog Guidelines Formatter

This guide will walk you through publishing this VS Code extension to the marketplace.

## Prerequisites

### 1. Install vsce (Visual Studio Code Extension Manager)
```bash
npm install -g @vscode/vsce
```

### 2. Create a Publisher Account

1. Go to https://marketplace.visualstudio.com/manage
2. Sign in with your Microsoft account
3. Click "Create Publisher"
4. Fill in the details:
   - **Name**: Your display name (e.g., "Your Name" or "Your Company")
   - **ID**: A unique identifier (e.g., "yourname" - this will be in your extension URL)
   - **Email**: Your contact email

### 3. Create a Personal Access Token (PAT)

1. Go to https://dev.azure.com/
2. Sign in with the same Microsoft account
3. Click on your profile icon → "Personal access tokens"
4. Click "New Token"
5. Configure:
   - **Name**: "VS Code Extension Publishing"
   - **Organization**: Select "All accessible organizations"
   - **Expiration**: Choose duration (90 days, 1 year, or custom)
   - **Scopes**: Select "Custom defined" → Check **"Marketplace" → "Manage"**
6. Click "Create" and **SAVE THE TOKEN** (you won't see it again!)

## Before Publishing

### 1. Update package.json

Replace these placeholders in `package.json`:

```json
{
  "publisher": "your-publisher-id",  // Replace "internal" with your publisher ID
  "author": {
    "name": "Your Name"  // Your actual name
  },
  "homepage": "https://github.com/yourusername/verilog-formatter#readme",  // Your repo
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/verilog-formatter.git"  // Your repo
  },
  "bugs": {
    "url": "https://github.com/yourusername/verilog-formatter/issues"  // Your repo
  }
}
```

### 2. Update LICENSE

Replace `[Your Name]` in the LICENSE file with your actual name.

### 3. Create a GitHub Repository (Optional but Recommended)

1. Create a new repository on GitHub
2. Initialize git and push:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Verilog formatter v1.0.0"
   git branch -M main
   git remote add origin https://github.com/yourusername/verilog-formatter.git
   git push -u origin main
   ```

### 4. Add an Icon (Optional but Recommended)

Create a 128x128 PNG icon and save it as `icon.png` in the root directory.
Then add to `package.json`:
```json
{
  "icon": "icon.png"
}
```

## Publishing Steps

### Option 1: Publish to VS Code Marketplace (Public)

1. **Login to vsce**
   ```bash
   vsce login your-publisher-id
   ```
   Enter your PAT when prompted.

2. **Package the Extension** (Optional - to test first)
   ```bash
   npm run package
   ```
   This creates a `.vsix` file you can install locally to test.

3. **Publish the Extension**
   ```bash
   npm run publish
   ```
   Or manually:
   ```bash
   vsce publish
   ```

4. **Verify Publication**
   - Go to https://marketplace.visualstudio.com/manage/publishers/your-publisher-id
   - You should see your extension listed
   - It may take a few minutes to appear in the marketplace search

### Option 2: Package for Private Distribution

If you want to distribute privately without publishing to the marketplace:

1. **Package the Extension**
   ```bash
   npm run package
   ```

2. **Distribute the .vsix file**
   Share the `.vsix` file with your team.

3. **Install from .vsix**
   - In VS Code: `Ctrl+Shift+P` → "Extensions: Install from VSIX..."
   - Or via command line: `code --install-extension verilog-guidelines-formatter-1.0.0.vsix`

## Post-Publishing

### Update Your Extension

When you make changes:

1. Update version in `package.json` (use semantic versioning):
   - Patch: `1.0.1` (bug fixes)
   - Minor: `1.1.0` (new features, backward compatible)
   - Major: `2.0.0` (breaking changes)

2. Update `CHANGELOG.md` with changes

3. Compile and publish:
   ```bash
   npm run compile
   npm run publish
   ```

### Unpublish an Extension (if needed)

```bash
vsce unpublish your-publisher-id.verilog-guidelines-formatter
```

⚠️ **Warning**: Unpublishing removes the extension from all users!

## Troubleshooting

### "Publisher not found"
- Verify your publisher ID matches exactly
- Make sure you created a publisher account at marketplace.visualstudio.com/manage

### "Authentication failed"
- Your PAT may have expired - create a new one
- Ensure the PAT has "Marketplace: Manage" scope

### "Missing required field"
- Check all required fields in package.json are filled
- Ensure README.md exists

### Package is too large
- Check .vscodeignore is working
- The compiled dist/ folder should be small
- Test files and node_modules should be excluded

## Files Checklist

Before publishing, ensure these files are ready:

- ✅ `package.json` - Updated with your publisher info
- ✅ `README.md` - Clear description and usage instructions
- ✅ `CHANGELOG.md` - Document your changes
- ✅ `LICENSE` - Updated with your name
- ✅ `.vscodeignore` - Excludes unnecessary files
- ✅ `dist/extension.js` - Compiled TypeScript
- ✅ `icon.png` - (Optional) 128x128 extension icon

## Resources

- **VS Code Publishing Guide**: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- **vsce Documentation**: https://github.com/microsoft/vscode-vsce
- **Extension Manifest**: https://code.visualstudio.com/api/references/extension-manifest
- **Marketplace**: https://marketplace.visualstudio.com/vscode

## Quick Commands Reference

```bash
# Install vsce globally
npm install -g @vscode/vsce

# Update dependencies
npm install

# Compile TypeScript
npm run compile

# Login to publisher account
vsce login your-publisher-id

# Package extension (creates .vsix)
npm run package

# Publish to marketplace
npm run publish

# Publish a specific version
vsce publish minor  # 1.0.0 → 1.1.0
vsce publish 1.2.3  # Specific version

# Show info about packaged extension
vsce show your-publisher-id.verilog-guidelines-formatter
```

## Security Notes

- **Never commit your PAT** to version control
- Store PAT securely (password manager)
- Use GitHub Actions or CI/CD for automated publishing (store PAT as secret)
- Regularly rotate your PAT

---

Good luck with your publication! 🚀
