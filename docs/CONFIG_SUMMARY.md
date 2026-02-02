# Configuration Summary

## What's New: Granular Formatting Control

The Verilog formatter now gives you complete control over which formatting features to apply! All features are **enabled by default**, but you can selectively disable any group.

## Quick Start

Open VS Code Settings (`Ctrl+,`) and search for "verilog formatter" to see all options.

## Configuration Groups

### 1. Module Formatting
- **`formatModuleHeaders`** - Format module declarations with aligned ports/parameters
- **`formatModuleInstantiations`** - Format module instantiations with aligned connections

### 2. Control Structure Formatting
- **`enforceBeginEnd`** - Add begin/end blocks to if/else/for statements
- **`indentAlwaysBlocks`** - Properly indent always/initial block content
- **`indentCaseStatements`** - Properly indent case statements

### 3. Alignment Features
- **`alignAssignments`** - Align = and <= operators
- **`alignWireDeclSemicolons`** - Align semicolons in wire declarations
- **`alignPortList`** - Align ports vertically
- **`alignParameters`** - Align parameter assignments

### 4. Preprocessor Directives
- **`annotateIfdefComments`** - Add comments to `else/`endif

## Example Configurations

### Disable begin/end enforcement (keep compact code)
```json
{
  "verilogFormatter.enforceBeginEnd": false
}
```

### Disable module formatting (preserve manual formatting)
```json
{
  "verilogFormatter.formatModuleHeaders": false,
  "verilogFormatter.formatModuleInstantiations": false
}
```

### Only enable basic alignment
```json
{
  "verilogFormatter.formatModuleHeaders": false,
  "verilogFormatter.formatModuleInstantiations": false,
  "verilogFormatter.enforceBeginEnd": false,
  "verilogFormatter.indentCaseStatements": false,
  "verilogFormatter.alignAssignments": true,
  "verilogFormatter.alignWireDeclSemicolons": true
}
```

## Where to Configure

1. **User Settings** (applies to all projects):
   - `File → Preferences → Settings → Search "verilog formatter"`

2. **Workspace Settings** (applies to current project only):
   - Create/edit `.vscode/settings.json` in your project root

3. **Direct JSON editing**:
   - `Ctrl+Shift+P` → "Preferences: Open Settings (JSON)"

## Full Documentation

See [CONFIGURATION.md](CONFIGURATION.md) for detailed documentation with examples for each option.
