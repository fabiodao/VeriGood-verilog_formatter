## Version 1.6.3

### Fixed
- Fixed module instantiation formatting not working when `indentAlwaysBlocks` is enabled but file contains no always blocks
  - The formatter now detects if a file actually has always/initial blocks before deciding to skip instantiation formatting
  - This allows module-only files to be properly formatted with port alignment
- Fixed range formatting (format selection) not applying to module instantiations
  - Range formatter now detects complete module instantiations in the selection
  - Applies full formatting including port alignment when a complete instantiation is selected

### Verification
- All 11 test categories passing (72+ test cases)
- Tested with both full document and range formatting
- Works correctly with files containing only module instantiations

**Install:** [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=FabioOliveira.verigood-verilog-formatter)
