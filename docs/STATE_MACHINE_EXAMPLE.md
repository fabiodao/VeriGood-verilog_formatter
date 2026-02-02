# State Machine Usage Example

This document shows how to use the new state machine in the Verilog formatter.

## Before: Scattered State Variables

```typescript
// Old approach - many scattered variables
let inModuleHeader = false;
let moduleHeaderLines: string[] = [];
let pendingAssignments: { idx: number; text: string }[] = [];
let pendingWireDecls: { idx: number; text: string }[] = [];
let pendingParams: { idx: number; text: string }[] = [];
let pendingPorts: { idx: number; text: string }[] = [];
let inAssignmentContinuation = false;
let inWireContinuation = false;
let inParamContinuation = false;
let inPortContinuation = false;
let wireGroupNonDeclCount = 0;
let moduleBodyActive = false;
let functionDepth = 0;
let blankCount = 0;

// Complex logic scattered throughout code
if (!inModuleHeader && /^\s*module\b/.test(line)) {
  flushAssignments();
  flushWireDecls();
  inModuleHeader = true;
  moduleHeaderLines = [];
}
// ... hundreds of lines of similar logic
```

## After: State Machine

```typescript
import { FormatterState, StateTransitionHandler } from './state';
import { Config } from './types';

// Single state machine instance
const state = new FormatterState();

// Process lines
for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  
  // Apply trailing whitespace removal
  if (cfg.removeTrailingWhitespace) {
    line = line.replace(/\s+$/, '');
  }
  
  // Annotate macros
  if (cfg.annotateIfdefComments && /`(ifn?def|else|endif)\b/.test(line)) {
    line = macroAnnotator.annotate(line, cfg);
  }
  
  // Determine state transition
  const transition = StateTransitionHandler.processLine(state, i, line, {
    alignAssignments: cfg.alignAssignments,
    alignWireDeclSemicolons: cfg.alignWireDeclSemicolons,
    alignParameters: cfg.alignParameters,
    formatModuleHeaders: cfg.formatModuleHeaders,
    maxBlankLines: cfg.maxBlankLines
  });
  
  // Handle module header
  if (state.isInModuleHeader()) {
    state.addModuleHeaderLine(line);
    if (/;\s*(\/\/.*)?$/.test(line)) {
      const headerLines = state.endModuleHeader();
      const formatted = formatModuleHeader(headerLines, cfg);
      formatted.forEach(h => processed.push(h));
      processed.push(''); // Blank line after header
    }
    continue;
  }
  
  // Flush groups as needed
  if (transition.shouldFlush.includes('assignments')) {
    const assignments = state.flushAssignments();
    if (assignments.length > 0) {
      const formatted = cfg.alignAssignments 
        ? alignAssignmentGroup(assignments.map(a => a.text))
        : assignments.map(a => a.text);
      formatted.forEach(l => processed.push(applyCommentColumn(l, cfg)));
    }
  }
  
  if (transition.shouldFlush.includes('wire')) {
    const wireDecls = state.flushWireDecls();
    if (wireDecls.length > 0) {
      const formatted = cfg.alignWireDeclSemicolons
        ? alignWireDeclGroup(wireDecls.map(w => w.text), cfg)
        : wireDecls.map(w => w.text);
      formatted.forEach(l => processed.push(applyCommentColumn(l, cfg)));
    }
  }
  
  if (transition.shouldFlush.includes('parameters')) {
    const params = state.flushParameters();
    if (params.length > 0) {
      const formatted = cfg.alignParameters
        ? alignParameterLines(params.map(p => p.text))
        : params.map(p => p.text);
      formatted.forEach(l => processed.push(applyCommentColumn(l, cfg)));
    }
  }
  
  if (transition.shouldFlush.includes('ports')) {
    const ports = state.flushPorts();
    if (ports.length > 0) {
      const formatted = cfg.alignPortList
        ? alignPortDeclLines(ports.map(p => p.text))
        : ports.map(p => p.text);
      formatted.forEach(l => processed.push(applyCommentColumn(l, cfg)));
    }
  }
  
  // Process line if not handled by state machine
  if (transition.shouldProcess) {
    line = applyCommentColumn(line, cfg);
    if (/^\s*\/\//.test(line) && line.length > cfg.lineLength) {
      line = wrapComment(line, cfg.lineLength);
    }
    processed.push(line);
  }
}

// Flush any remaining groups at end
state.flushAssignments();
state.flushWireDecls();
state.flushParameters();
state.flushPorts();
```

## State Transition Flow

```
INITIAL
  │
  ├─[module keyword]→ IN_MODULE_HEADER
  │                     │
  │                     └─[;]→ IN_MODULE_BODY
  │
  ├─[assign/assignment]→ COLLECTING_ASSIGNMENTS
  │                        │
  │                        ├─[no ;]→ IN_ASSIGNMENT_CONTINUATION
  │                        │           │
  │                        │           └─[;]→ COLLECTING_ASSIGNMENTS
  │                        │
  │                        └─[flush]→ INITIAL
  │
  ├─[wire/reg/logic]→ COLLECTING_WIRE_DECLS
  │                    │
  │                    ├─[no ;]→ IN_WIRE_CONTINUATION
  │                    │           │
  │                    │           └─[;]→ COLLECTING_WIRE_DECLS
  │                    │
  │                    └─[flush]→ INITIAL
  │
  ├─[parameter]→ COLLECTING_PARAMETERS
  │               │
  │               ├─[no ;]→ IN_PARAMETER_CONTINUATION
  │               │           │
  │               │           └─[;]→ COLLECTING_PARAMETERS
  │               │
  │               └─[flush]→ INITIAL
  │
  └─[function/task]→ IN_FUNCTION
                       │
                       └─[endfunction/endtask]→ IN_MODULE_BODY
```

## Benefits Demonstrated

### 1. Single Source of Truth
- All state in one `FormatterState` instance
- No scattered variables
- Easy to reset: `state.reset()`

### 2. Clear State Transitions
- Explicit state changes via `transitionTo()`
- State history tracks all transitions
- Easy to debug: `state.getStateHistory()`

### 3. Type Safety
- Enum-based states prevent typos
- TypeScript catches invalid states
- IDE autocomplete for state names

### 4. Better Debugging
```typescript
// Get current state
console.log(state.getState()); // "COLLECTING_ASSIGNMENTS"

// Get state summary
console.log(state.getStateSummary());
// "State: COLLECTING_ASSIGNMENTS, Assignments: 5"

// Get state history
state.getStateHistory().forEach(entry => {
  console.log(`Line ${entry.line}: ${entry.state}`);
});
```

### 5. Easier Testing
```typescript
// Test state transitions
const state = new FormatterState();
state.startAssignmentGroup(0, "assign a = b;");
expect(state.getState()).toBe(FormatterStateType.COLLECTING_ASSIGNMENTS);
expect(state.hasPendingAssignments()).toBe(true);

const assignments = state.flushAssignments();
expect(state.getState()).toBe(FormatterStateType.INITIAL);
expect(assignments.length).toBe(1);
```

## Migration Checklist

- [x] Create FormatterState class
- [x] Create StateTransitionHandler
- [x] Define all state types
- [x] Implement state transition logic
- [ ] Update formatDocument to use state machine
- [ ] Update formatRange to use state machine
- [ ] Remove old state variables
- [ ] Add unit tests for state machine
- [ ] Verify output matches original formatter
