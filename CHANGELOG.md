# Change Log

All notable changes to the extension will be documented in this file.

## [1.7.1] - 2026-02-23

### Fixed
- Fixed wire/reg/logic declarations with unpacked dimensions being incorrectly padded (e.g., `mem          [0:255]` now correctly formats as `mem [0:255]`)
- Fixed selection formatting not respecting group boundaries (declarations with initialization now separate from declarations without)
- Fixed selection formatting using simplified alignment logic instead of proper grouping rules
- Normalized malformed input `mem[0:255]` (no space) to `mem [0:255]` (with space)

### Improved
- Selection formatting now uses the same alignment and grouping logic as document formatting
- Both document and selection formatting produce consistent results for wire/reg declarations

## [1.7.0] - 2026-02-20

### Fixed
- Fixed module-level `assign` statement alignment to properly group across comments and blank lines
- Fixed assignment alignment within `always` blocks, `case` items, and `if/else` structures
- Fixed single-statement block indentation for nested `always`/`if`/`for` without begin/end
- Fixed multi-line ternary assignment indentation to align with opening parenthesis
- Fixed multi-line concatenation assignment to not add trailing spaces on opening line
- Fixed operator spacing normalization stripping alignment padding from `assign` statements

### Improved
- Enhanced assignment alignment to respect "concurrent lines" rule across all block types
- Improved single-statement depth tracking for properly nested indentation
- Better handling of `always` blocks without begin/end keywords

## [1.6.3] - 2026-02-03

### Fixed
- Fixed module instantiation formatting not working when indentAlwaysBlocks is enabled but file has no always blocks
- Fixed range formatting not applying to module instantiations

## [1.6.1] - 2026-02-03

### Fixed
- Fixed range formatting (format selection) not working for always blocks and case statements

## [1.6.0] - 2026-02-03

### Fixed
- Fixed module instantiation parameter alignment - all closing parentheses now align consistently
- Fixed multiline concatenation formatting in parameters to match port behavior
- Fixed comma alignment in concatenations
- Inline comments no longer affect alignment calculations

### Improved
- Enhanced test suite with 11 comprehensive test categories (72+ test cases)
- Added nested ifdef/ifndef test coverage
- Cleaned up project structure and documentation

## [1.5.0] - 2026-02-02

### Added
- **Comprehensive Test Suite** - Added production-ready test suite with 72+ test cases covering all formatter features
  - 9 test categories: module declarations, instantiations, always blocks, case statements, multi-line conditions, assignments, wire/reg declarations, parameters/ports, and edge cases
  - Automated testing with `npm test` command
  - Tests run automatically before packaging and publishing
  - Detailed documentation in `tests/` directory
  - 100% test pass rate ensuring formatter stability

### Fixed
- **Multi-line Condition Alignment** - Fixed critical bug where multi-line if/for/while conditions were not properly aligned
  - Continuation lines now correctly align after opening parenthesis (e.g., 6 spaces for `if (`)
  - Fixed pipeline order: `indentAlwaysBlocks` now runs before `alignMultilineConditions`
  - Improved parenthesis balance tracking for complex nested conditions
- **Parameterless Module Detection** - Fixed bug where formatter would disable alignment for entire file after encountering `module name;` declaration
  - Parameterless modules no longer trigger module declaration mode
  - All code after parameterless module declarations now formats correctly
- **Case Statement Indentation** - Fixed conditional logic that prevented case statements from being indented when `indentAlwaysBlocks` was enabled
  - Case statements now indent correctly regardless of `indentAlwaysBlocks` setting

### Improved
- **Documentation** - Added extensive testing documentation
  - `TESTING_OVERVIEW.md` - Complete test suite overview
  - `tests/QUICK_START.md` - Quick reference for running tests
  - `tests/README.md` - Detailed test suite documentation
  - `tests/EXAMPLES.md` - 10 detailed test examples
  - `PRE_PUBLISH_CHECKLIST.md` - Publishing workflow checklist
- **Quality Assurance** - Publishing workflow now includes automated testing to prevent broken releases

## [1.4.0] - 2026-01-26

### Major Refactoring
- **Modular Architecture** - Complete refactoring of the monolithic formatter into a modular, maintainable structure
  - Extracted alignment logic into `formatter/alignment/` module (assignments, wires, parameters, ports)
  - Extracted formatting logic into `formatter/formatting/` module (module headers, instantiations)
  - Extracted indentation logic into `formatter/indentation/` module (always blocks, case statements, control flow, conditions)
  - Created utility modules for comments and macros
  - Centralized types and configuration in `formatter/types.ts`
  - All functionality preserved while significantly improving code maintainability and testability

### Improved
- **Code Organization** - Codebase is now organized into logical modules with clear separation of concerns
- **Maintainability** - Each formatting feature is now in its own module, making it easier to understand and modify
- **Testability** - Modular structure enables easier unit testing of individual formatting features
- **Extensibility** - New formatting features can now be added as new modules without modifying existing code

### Testing
- **Comprehensive Test Suite** - Added extensive test suite covering 23 real Verilog files and 7 feature tests
- **Test Coverage** - 93.3% test success rate (28/30 tests passed)
- All critical formatting features verified and working correctly

## [1.3.14] - 2026-01-26

### Fixed
- **Selection Formatting for Module Headers** - Fixed selection formatting to properly preserve module header indentation. The multiline condition alignment feature no longer interferes with module declaration formatting
- **Module Declaration Detection** - Improved detection of already-formatted module headers in selection formatting by checking for standard 2-space indentation pattern
- **Ifdef Indentation in Module Headers** - Fixed ifdef directive indentation in module headers by excluding the module keyword line from minimum indentation calculations

### Improved
- **Selection Formatting Pipeline** - Added `alignMultilineConditions` to the selection formatting path and implemented proper detection to skip reformatting of already-formatted module headers
- **Parentheses Depth Tracking** - Enhanced module declaration tracking to properly initialize and preserve parentheses depth across parameter and port lists

## [1.3.13] - 2026-01-23

### Added
- **Multiline Condition Alignment** - Multiline if/for/while statements now automatically align continuation lines to the column after the opening parenthesis using parentheses stack tracking

### Improved
- **For Loop Support in Stack Tracking** - For loops are now properly tracked in the begin/end stack within always blocks, ensuring correct indentation for nested structures
- **Case Statement Indentation** - Case statements inside for loops and other control structures now receive proper indentation based on nesting depth

## [1.3.12] - 2026-01-09

### Improved
- **End-Else Merging** - The formatter now merges `end` and `else` statements onto the same line within always blocks (when no ifdef directives are between them) for more compact code
- **Single-Statement Block Support** - If/else statements without begin/end keywords now properly indent their single statement
- **Ifdef Directive Alignment** - Ifdef directives (ifdef/ifndef/elsif/else/endif) now consistently align based on their nesting depth within always blocks, regardless of their original indentation

## [1.3.11] - 2026-01-09

### Fixed
- **Always Block Indentation with Ifdef Directives** - Fixed indentation of always blocks containing ifdef/ifndef/else/endif directives with nested if/else statements. The formatter now uses stack-based begin/end tracking to correctly identify block boundaries and maintains proper indentation for all code including ifdef-wrapped sections

### Improved
- **Begin/End Tracking** - Implemented proper stack-based tracking of begin/end pairs within always blocks to accurately determine nesting depth and indentation levels
- **Ifdef Directive Indentation** - Ifdef directives inside always blocks are now indented to match the surrounding code
- **Else Statement Alignment** - Else and else-if statements now align correctly with their corresponding if statements, even when separated by ifdef directives
- **Function Isolation** - When `indentAlwaysBlocks` is enabled, conflicting formatting functions (`enforceBeginEnd`, `formatModuleInstantiations`, `indentCaseStatements`, `normalizeIfdefIndentation`) are now automatically skipped to prevent indentation conflicts

## [1.3.10] - 2026-01-08

### Added
- **Multidimensional Array Support** - Wire/reg/logic declarations with multidimensional arrays (e.g., `reg [7:0] data[15:0]` or `reg [7:0] data [15:0]`) are now properly recognized and formatted

### Improved
- **Comment Alignment for Declarations** - Comments in wire/reg/logic declarations and assign statements now align to the same column across all lines in a selection
- **Continuation Comment Alignment** - Comment-only lines following declarations (continuation comments) now align with the comment column of the declaration above them

## [1.3.9] - 2026-01-06

### Improved
- **Unified Indentation for Wire/Assign Selection** - When formatting a selection of wire/reg/logic declarations or assign statements, all lines now use the minimum indentation level found in the selection for consistent alignment

## [1.3.8] - 2025-12-22

### Added
- **Multiline Parameter/Localparam Formatting** - Parameters and localparams spanning multiple lines now align continuation line operators with the equals sign
- **Range Support for Parameters** - Parameters and localparams can now have ranges (e.g., `parameter [7:0] NAME = value`) with proper alignment similar to wire declarations
- **Standalone Semicolon Alignment** - When a semicolon appears alone on the last line of a multiline parameter, it aligns with the first character of the previous line

### Improved
- **Parameter Alignment** - Enhanced `alignParametersInRange` to detect multiline parameters and collect all continuation lines until the semicolon
- **Operator Alignment** - Mathematical and logical operators (+, -, *, /, &, |, ^, ~, <, >, =, !, ?, :) at the start of continuation lines now align with the equals sign

## [1.3.7] - 2025-11-19

### Fixed
- **Selection Formatting for Modules Without Parameters** - Fixed detection of module instantiations without parameter blocks when using selection formatting. Pattern now properly matches `module_name instance_name(` declarations
- **Instance Declaration Spacing** - Removed unwanted space before opening parenthesis in module instance declarations (changed from `instance_name (` to `instance_name(`)
- **Instance Array Detection** - Enhanced selection detection to recognize module instances with array syntax (e.g., `instance_name[7:0](`)

### Improved
- **Full vs Connection-Only Detection** - Improved logic to distinguish between full module instantiation selections and connection-only selections by excluding instance declaration lines from the "connections only" check

## [1.3.6] - 2025-11-12

### Fixed
- **Module Header Selection Scope** - Fixed issue where selecting more lines than just the module header would cause duplicate closing `);` and incorrect formatting of code after the header. The formatter now correctly identifies where the module header ends and preserves any additional selected lines unchanged
- **Cast Expression Support** - Added support for SystemVerilog cast expressions (e.g., `TYPE'(expr)`) in parameter and port concatenations for proper alignment
- **First Line Value Detection** - Improved first line value extraction in concatenations to properly capture cast expressions and other complex patterns for accurate comma alignment calculation

### Improved
- **Selection Boundary Detection** - Enhanced module header formatter to detect the actual end of the module header (`);`) when processing selections, preventing incorrect processing of code beyond the header

## [1.3.5] - 2025-11-11

### Fixed
- **Per-Concatenation Alignment** - Parameters and ports now align independently based on the longest signal within each concatenation, rather than globally across all concatenations
- **Expression in Parentheses Support** - Parameter and port concatenations now properly recognize and align expressions in parentheses (e.g., `(P_L2_RXBUF_WIDTH-1)`) alongside signal names and numeric literals
- **Numeric Literal Closing Lines** - Fixed pattern matching for closing lines that end with numeric literals (e.g., `1'd0})`) to keep the value on the same line as the closing braces instead of removing it
- **First Line Comma Alignment** - Corrected alignment calculation for the first line of concatenations to account for the opening brace character included in continuation line measurements

### Improved
- **Independent Concatenation Formatting** - Each multiline concatenation in parameters and ports now has its closing brace `}` aligned with its own commas, while closing parentheses `)` align globally across all parameters/ports
- **Expression Pattern Matching** - Enhanced regex patterns to recognize expressions in parentheses `(expr)` as valid concatenation values during both parsing and formatting

## [1.3.3] - 2025-11-10

### Fixed
- **Directive with Closing Parenthesis** - Lines with preprocessor directives followed by closing parentheses or braces (e.g., `` `endif ),``, `` `endif })``) are now correctly split into two separate lines with proper alignment
- **Multiline Parameter/Port Alignment** - Fixed alignment calculation to include the first line of multiline parameter values and port concatenations when determining the longest content for closing parenthesis alignment
- **Array Index in Closing Lines** - Fixed pattern matching for signal names with array indices in closing lines (e.g., `signal[(PARAM-1):0]}),`) to properly recognize and align them
- **Standalone Closing Braces** - Added support for standalone closing brace-parenthesis patterns (e.g., `})`) without a preceding signal name
- **Mid-line Directive Annotation** - Preprocessor directives appearing mid-line (e.g., `{`ifdef SYMBOL`) are now properly annotated with their corresponding symbol names in comments
- **Selection Mode Annotation** - Fixed selection formatting to properly annotate preprocessor directives, including mid-line directives, matching full document mode behavior

### Improved
- **Directive Preservation** - Enhanced `annotateMacro` function to preserve trailing content (parentheses, braces) after preprocessor directives
- **First Line Content Analysis** - Improved content length calculation to analyze the first line of multiline parameter values and port concatenations that continue to the next line
- **Signal Pattern Matching** - Enhanced regex patterns to properly distinguish array index syntax from character classes in signal names

## [1.3.2] - 2025-11-10

### Fixed
- **Array Instance Name Support** - Module instances with array range syntax (e.g., `instance_name[7:0](`, `instance[(P_NR-1):0](`) are now properly recognized and their ports are correctly formatted instead of being eliminated

### Improved
- **Documentation** - Added comprehensive Notes section to README explaining module instantiation detection patterns, port/parameter concatenation detection, and supported signal patterns

## [1.3.1] - 2025-11-10

### Fixed
- **Ifdef Directive Alignment** - Preprocessor directives (`ifdef`, `ifndef`, `else`, `elsif`, `endif`) now align with the code they protect in both full document and selection formatting
- **Selection Formatting Directives** - When formatting a selection containing preprocessor directives, they are now normalized to match the indentation of the actual code lines

### Improved
- **Directive Indentation Normalization** - Added `normalizeIfdefIndentation` function that looks forward and backward to find nearby code lines and applies their indentation to directives, ensuring visual consistency

## [1.3.0] - 2025-11-07

### Fixed
- **Parenthesis Balance Check** - Parameters and ports with unbalanced parentheses on the first line (e.g., `.P_WL((expression)`) are now correctly identified as multiline and will collect all lines until the matching closing parenthesis, including content within `ifdef/endif` blocks
- **Multiline Parameter Closing Paren Alignment** - Closing parentheses in multiline parameter expressions (e.g., `+ value )`) now align correctly with other parameters' closing parentheses
- **Parameter Preservation** - Fixed issue where parameters following `ifdef` blocks were being eliminated during formatting

### Improved
- **Multiline Detection** - Enhanced single-line vs multiline detection by checking parenthesis balance before applying regex matching, preventing false positives on parameters with nested parentheses

## [1.2.10] - 2025-11-07

### Fixed
- **Array Index Support** - Concatenations now correctly recognize signal names with array indices (e.g., `signal[0]`, `signal[15:0]`) for proper comma alignment
- **Parameter Replication Patterns** - Added support for replication patterns (`{COUNT{signal}}`) and nested concatenations in parameters, matching port functionality

### Improved
- **Signal Pattern Matching** - All signal matching patterns now support array indices, numeric literals, replication patterns, and nested concatenations consistently across parameters and ports

## [1.2.9] - 2025-11-07

### Fixed
- **Control Block Instantiations** - Module instantiations inside if/else/always blocks are now properly detected and formatted with correct indentation
- **Numeric Literal Support** - Parameter and port concatenations now correctly handle Verilog numeric literals (e.g., `2'd0`, `8'hFF`, `16'd255`)
- **Concatenation Alignment** - Parameter concatenations now align continuation lines properly, matching port concatenation behavior

### Improved
- **Formatting Order** - Module instantiation formatting now runs after control block enforcement, ensuring proper detection of instantiations within if/else blocks
- **Numeric Literal Detection** - Improved pattern matching for signal names and numeric literals in concatenations for both parameters and ports

## [1.2.8] - 2025-11-06

### Fixed
- **Ifdef Comma Handling** - Formatter now preserves original comma state for parameters/ports followed by `ifdef` blocks, preventing unwanted comma additions or removals
- **Conditional Parameter Commas** - Fixed issue where formatter would add standalone commas before `ifdef` directives in module instantiations
- **Module Header Alignment** - Port opening parenthesis now aligns with parameter closing parenthesis on separate lines for better readability

### Improved
- **Smart Comma Preservation** - When a parameter or port is followed by an `ifdef` directive, the formatter preserves the original comma state instead of auto-adding/removing commas
- **Range Formatting Parity** - All comma handling improvements work consistently in both full document and selection formatting

## [1.2.5] - 2025-11-04

### Fixed
- **Trailing Blank Lines** - Formatter no longer adds unwanted blank lines at the end of files
- **Module Header Spacing** - Added blank line after module header closing `);` for better readability

## [1.2.4] - 2025-11-04

### Added
- **Multiline Parameter Formatting** - Full support for multiline parameters in module instantiations with mathematical expressions, ifdefs, and concatenations
- **Enhanced Selection Formatter** - Selection formatting now handles multiline parameters and ports with the same logic as full document formatting
- **Content-Based Alignment** - Closing parentheses now align based on actual content length (signals for concatenations, expressions for mathematical operations)

### Fixed
- **Critical: Double-Counting Bug** - Fixed issue where closing parentheses shifted right on repeated formatting due to measuring content twice
- **Ifdef Alignment** - Compiler directives now properly align with parameter/port content
- **Unified Closing Parenthesis Alignment** - All closing parentheses (single-line, multiline concatenations, multiline expressions) now align to a unified rightmost column
- **Selection Formatter Consistency** - Selection formatter now uses same content measurement logic as full document formatter to prevent drift

## [1.1.1] - 2025-11-03

### Added
- **Format Selection Support** - Now you can format just the selected code instead of the entire document
- **Recommended Keybindings** - Added documentation for keybindings that allow Shift+Alt+F to format document or selection based on context

### Fixed
- **Module Header Parameter Comma Alignment** - Commas in module header parameters now align at a consistent column based on the longest parameter name and value
- **Module Instantiation Closing Parenthesis** - Closing parentheses now consider the longest signal name in multiline concatenations for proper alignment

## [1.1.0] - 2025-11-03

### Fixed
- **Module Instantiation Alignment** - Improved closing parenthesis alignment to consider multiline concatenation signal lengths
- **Parameter Comma Alignment** - Fixed module header parameter comma alignment

## [1.0.0] - 2025-10-31

### Added
- **Granular Configuration Control** - Choose which formatting features to enable/disable
- **For Loop Support** - Full support for for loops with begin/end enforcement
- **Module Instantiation Formatting** - Align ports and parameters in module instances
- **Ifdef Comment Annotation** - Automatically add comments to `else and `endif directives
- **Comprehensive Documentation** - Added CONFIGURATION.md with detailed examples

### Configuration Options (New)
- `formatModuleHeaders` - Control module header formatting
- `formatModuleInstantiations` - Control module instantiation formatting
- `indentAlwaysBlocks` - Control always block indentation
- `enforceBeginEnd` - Control begin/end block enforcement
- `indentCaseStatements` - Control case statement indentation
- `annotateIfdefComments` - Control ifdef comment annotation

### Features
- Module header formatting with aligned ports and parameters
- Module instantiation formatting with support for multiline concatenations
- Always block indentation
- If/else/for statement begin/end enforcement
- Case statement indentation with proper nesting
- Assignment alignment (=, <=)
- Wire/reg/logic declaration alignment
- Port list alignment
- Trailing whitespace removal
- Blank line compression
- Comment preservation and alignment

### Fixed
- Proper indentation for statements after nested if/else blocks
- Correct handling of "end else begin" pattern
- For loops now properly indented relative to always blocks
- Case statements inside else blocks now indent correctly

## [0.0.1] - Initial Development
- Initial internal release
