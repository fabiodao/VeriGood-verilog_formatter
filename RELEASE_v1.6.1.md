## Version 1.6.1

### Fixed
- Fixed range formatting (format selection) not working for always blocks and case statements
  - Structure detection logic was incorrectly counting begin/end pairs
  - Range formatting now properly applies indentation based on tab size settings

### Improved
- Cleaned up project structure by removing unnecessary documentation and archived files

### Verification
- All 11 test categories passing (72+ test cases)
- Verified range formatting works correctly with different tab sizes

**Install:** [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=FabioOliveira.verigood-verilog-formatter)
