# Verilog Formatter Architecture

## Overview

This document describes the improved modular architecture of the Verilog formatter extension.

## Directory Structure

```
src/
├── formatter/
│   ├── types.ts              # Configuration and type definitions
│   ├── index.ts              # Main formatter orchestrator
│   ├── alignment/            # Alignment modules
│   │   ├── assignments.ts    # Assignment alignment
│   │   ├── wires.ts          # Wire/reg/logic declaration alignment
│   │   ├── parameters.ts     # Parameter/localparam alignment
│   │   └── ports.ts          # Port declaration alignment
│   ├── formatting/           # Formatting modules
│   │   ├── moduleHeader.ts   # Module header formatting
│   │   └── instantiations.ts # Module instantiation formatting
│   ├── indentation/          # Indentation modules
│   │   ├── alwaysBlocks.ts   # Always/initial block indentation
│   │   ├── caseStatements.ts # Case statement indentation
│   │   └── controlFlow.ts   # If/for/while block enforcement
│   └── utils/                # Utility modules
│       ├── comments.ts        # Comment handling
│       └── macros.ts          # Macro/ifdef annotation
└── formatter.ts              # Original monolithic formatter (legacy)

```

## Key Improvements

### 1. Separation of Concerns
- **Alignment**: All alignment logic separated by type (assignments, wires, parameters, ports)
- **Formatting**: Module-level formatting separated from alignment
- **Indentation**: Structural indentation separated from alignment
- **Utilities**: Reusable utilities extracted into separate modules

### 2. Better State Management
- State tracking encapsulated in classes where appropriate
- Clear state transitions
- Reduced global state variables

### 3. Improved Testability
- Each module can be tested independently
- Clear interfaces between modules
- Easier to mock dependencies

### 4. Maintainability
- Smaller, focused files (200-500 lines vs 6000+ lines)
- Clear module boundaries
- Easier to locate and fix bugs
- Easier to add new features

## Migration Path

The new modular structure maintains backward compatibility:

1. **Phase 1** (Current): New modules created, original formatter.ts still used
2. **Phase 2**: Gradually migrate functions to new modules
3. **Phase 3**: Update main formatter to use new modules exclusively
4. **Phase 4**: Remove original monolithic formatter.ts

## Module Responsibilities

### Types (`types.ts`)
- Configuration interface
- Configuration retrieval from VS Code settings
- Feature flag checking

### Alignment Modules
- **assignments.ts**: Aligns `assign` statements and blocking/non-blocking assignments
- **wires.ts**: Aligns wire/reg/logic/input/output/inout declarations
- **parameters.ts**: Aligns parameter/localparam declarations
- **ports.ts**: Aligns port declarations in module headers

### Formatting Modules
- **moduleHeader.ts**: Formats module headers with aligned ports and parameters
- **instantiations.ts**: Formats module instantiations with aligned connections

### Indentation Modules
- **alwaysBlocks.ts**: Indents content inside always/initial blocks
- **caseStatements.ts**: Indents case statements and case items
- **controlFlow.ts**: Enforces begin/end blocks for if/else/for statements

### Utility Modules
- **comments.ts**: Comment column alignment and wrapping
- **macros.ts**: Ifdef/else/endif annotation

## Benefits

1. **Easier Debugging**: Smaller files make it easier to locate issues
2. **Faster Development**: Changes isolated to specific modules
3. **Better Code Reviews**: Reviewers can focus on specific modules
4. **Reduced Merge Conflicts**: Multiple developers can work on different modules
5. **Improved Performance**: Potential for parallel processing in future

## Future Enhancements

1. **Incremental Formatting**: Format only changed sections
2. **Parallel Processing**: Format different sections in parallel
3. **Plugin Architecture**: Allow custom formatters for specific patterns
4. **Better Error Handling**: Graceful degradation when formatting fails
5. **Performance Profiling**: Built-in performance monitoring
