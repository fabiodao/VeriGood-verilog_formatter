# Formatter State Machine

## Overview

The state machine replaces scattered boolean flags and variables with a structured, maintainable state management system for the Verilog formatter.

## Architecture

### Core Components

1. **FormatterState** (`FormatterState.ts`)
   - Main state machine class
   - Manages all state transitions
   - Encapsulates all state variables
   - Provides state history for debugging

2. **StateTransitions** (`StateTransitions.ts`)
   - Helper functions to detect line types
   - State transition logic
   - Determines when to flush groups

3. **State Types** (`FormatterState.ts`)
   - Enum of all possible states
   - Type definitions for state data

## States

### Main States

- `INITIAL` - Default state, outside any special context
- `IN_MODULE_HEADER` - Inside a module header (between 'module' and ');')
- `COLLECTING_ASSIGNMENTS` - Collecting assignment statements for alignment
- `COLLECTING_WIRE_DECLS` - Collecting wire/reg/logic declarations
- `COLLECTING_PARAMETERS` - Collecting parameter/localparam declarations
- `COLLECTING_PORTS` - Collecting port declarations
- `IN_MODULE_BODY` - Inside module body (after header)
- `IN_FUNCTION` - Inside a function or task
- `IN_ASSIGNMENT_CONTINUATION` - Processing multiline assignment
- `IN_WIRE_CONTINUATION` - Processing multiline wire declaration
- `IN_PARAMETER_CONTINUATION` - Processing multiline parameter
- `IN_PORT_CONTINUATION` - Processing multiline port

## Usage Example

```typescript
import { FormatterState, StateTransitionHandler } from './state';
import { Config } from '../types';

// Create state machine instance
const state = new FormatterState();

// Process each line
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Determine state transition
  const transition = StateTransitionHandler.processLine(
    state,
    i,
    line,
    {
      alignAssignments: cfg.alignAssignments,
      alignWireDeclSemicolons: cfg.alignWireDeclSemicolons,
      alignParameters: cfg.alignParameters,
      formatModuleHeaders: cfg.formatModuleHeaders,
      maxBlankLines: cfg.maxBlankLines
    }
  );
  
  // Flush groups as needed
  if (transition.shouldFlush.includes('assignments')) {
    const assignments = state.flushAssignments();
    // Format and output assignments
  }
  
  if (transition.shouldFlush.includes('wire')) {
    const wireDecls = state.flushWireDecls();
    // Format and output wire declarations
  }
  
  // Process line if needed
  if (transition.shouldProcess) {
    // Apply formatting to line
  }
}

// At end, flush any remaining groups
state.flushAssignments();
state.flushWireDecls();
state.flushParameters();
state.flushPorts();
```

## State Transitions

### Module Header
```
INITIAL → IN_MODULE_HEADER (on 'module' keyword)
IN_MODULE_HEADER → IN_MODULE_BODY (on ');' ending)
```

### Assignment Collection
```
INITIAL → COLLECTING_ASSIGNMENTS (on 'assign' or assignment)
COLLECTING_ASSIGNMENTS → IN_ASSIGNMENT_CONTINUATION (multiline)
IN_ASSIGNMENT_CONTINUATION → COLLECTING_ASSIGNMENTS (on ';')
COLLECTING_ASSIGNMENTS → INITIAL (on flush)
```

### Wire Declaration Collection
```
INITIAL → COLLECTING_WIRE_DECLS (on wire/reg/logic)
COLLECTING_WIRE_DECLS → IN_WIRE_CONTINUATION (multiline)
IN_WIRE_CONTINUATION → COLLECTING_WIRE_DECLS (on ';')
COLLECTING_WIRE_DECLS → INITIAL (on flush)
```

### Parameter Collection
```
INITIAL → COLLECTING_PARAMETERS (on parameter/localparam)
COLLECTING_PARAMETERS → IN_PARAMETER_CONTINUATION (multiline)
IN_PARAMETER_CONTINUATION → COLLECTING_PARAMETERS (on ';')
COLLECTING_PARAMETERS → INITIAL (on flush)
```

### Function/Task
```
IN_MODULE_BODY → IN_FUNCTION (on function/task)
IN_FUNCTION → IN_MODULE_BODY (on endfunction/endtask)
```

## Benefits

1. **Clear State Management**: All state in one place
2. **Easier Debugging**: State history tracks transitions
3. **Type Safety**: Enum-based states prevent invalid states
4. **Maintainability**: Clear state transitions
5. **Testability**: Easy to test state transitions

## Debugging

### Get Current State
```typescript
const currentState = state.getState();
console.log(`Current state: ${currentState}`);
```

### Get State Summary
```typescript
const summary = state.getStateSummary();
console.log(summary);
// Output: "State: COLLECTING_ASSIGNMENTS, Assignments: 5"
```

### Get State History
```typescript
const history = state.getStateHistory();
history.forEach(entry => {
  console.log(`Line ${entry.line}: ${entry.state}`);
});
```

## Migration from Old Code

### Old Way
```typescript
let inModuleHeader = false;
let pendingAssignments: { idx: number; text: string }[] = [];
let inAssignmentContinuation = false;
// ... many more variables
```

### New Way
```typescript
const state = new FormatterState();
// All state managed by FormatterState instance
```

## Future Enhancements

1. **State Validation**: Ensure valid state transitions
2. **State Persistence**: Save/restore state for incremental formatting
3. **State Visualization**: Generate state diagram from code
4. **Performance Monitoring**: Track time spent in each state
