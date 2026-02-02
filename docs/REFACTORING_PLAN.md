# Refactoring Plan: Verilog Formatter

## Current State
- Single monolithic file: `formatter.ts` (6163 lines)
- All functionality works but difficult to maintain
- Complex state management with many global variables

## Target State
- Modular architecture with clear separation of concerns
- Improved state management
- Better testability and maintainability
- All existing functionality preserved

## Implementation Steps

### Phase 1: Foundation ✅
- [x] Create directory structure
- [x] Create types.ts with Config interface
- [x] Create utility modules (comments, macros)
- [x] Create architecture documentation

### Phase 2: Extract Alignment Modules (In Progress)
- [ ] Extract `alignAssignmentGroup` → `alignment/assignments.ts`
- [ ] Extract `alignWireDeclGroup` → `alignment/wires.ts`
- [ ] Extract `alignParameterLines` → `alignment/parameters.ts`
- [ ] Extract `alignPortDeclLines` → `alignment/ports.ts`
- [ ] Create alignment module index

### Phase 3: Extract Formatting Modules
- [ ] Extract `formatModuleHeader` → `formatting/moduleHeader.ts`
- [ ] Extract `formatModuleInstantiations` → `formatting/instantiations.ts`
- [ ] Create formatting module index

### Phase 4: Extract Indentation Modules
- [ ] Extract `indentAlwaysBlocks` → `indentation/alwaysBlocks.ts`
- [ ] Extract `indentCaseStatements` → `indentation/caseStatements.ts`
- [ ] Extract `enforceIfBlocks`, `enforceForLoopBlocks` → `indentation/controlFlow.ts`
- [ ] Extract `alignMultilineConditions` → `indentation/conditions.ts`
- [ ] Create indentation module index

### Phase 5: Refactor Main Formatter
- [ ] Create improved state management class
- [ ] Refactor `formatDocument` to use new modules
- [ ] Refactor `formatRange` to use new modules
- [ ] Add comprehensive error handling

### Phase 6: Testing & Validation
- [ ] Run all existing tests
- [ ] Verify formatting output matches original
- [ ] Performance testing
- [ ] Edge case testing

### Phase 7: Cleanup
- [ ] Remove original formatter.ts (or keep as legacy)
- [ ] Update documentation
- [ ] Update extension.ts imports

## Key Functions to Extract

### Alignment Functions
- `alignAssignmentGroup` (lines 1385-1475)
- `alignWireDeclGroup` (lines 1477-1868)
- `alignParameterLines` (lines 1160-1344)
- `alignPortDeclLines` (lines 4915-5033)

### Formatting Functions
- `formatModuleHeader` (lines 579-815)
- `formatModuleInstantiations` (lines 1869-1982)
- `formatSingleInstantiation` (lines 1983-3256)

### Indentation Functions
- `indentAlwaysBlocks` (lines 3401-3610)
- `indentCaseStatements` (lines 3756-4230)
- `enforceIfBlocks` (lines 4338-4769)
- `enforceForLoopBlocks` (lines 4770-4914)
- `alignMultilineConditions` (lines 3257-3399)

### Utility Functions
- `applyCommentColumn` (lines 1353-1362) ✅
- `wrapComment` (lines 1364-1383) ✅
- `annotateMacro` (lines 59-145) ✅ (as MacroAnnotator class)

## State Management Improvements

### Current State Variables (in formatDocument)
- `inModuleHeader`, `moduleHeaderLines`
- `pendingAssignments`, `pendingWireDecls`, `pendingParams`, `pendingPorts`
- `inAssignmentContinuation`, `inWireContinuation`, `inParamContinuation`, `inPortContinuation`
- `wireGroupNonDeclCount`
- `globalMacroStack`
- `moduleBodyActive`
- `functionDepth`
- `blankCount`

### Proposed State Management
Create a `FormatterState` class to encapsulate all state:
```typescript
class FormatterState {
  private moduleHeader: ModuleHeaderState;
  private pendingGroups: PendingGroups;
  private continuations: ContinuationState;
  private macroAnnotator: MacroAnnotator;
  // ... methods for state transitions
}
```

## Testing Strategy

1. **Unit Tests**: Test each module independently
2. **Integration Tests**: Test module interactions
3. **Regression Tests**: Ensure output matches original formatter
4. **Performance Tests**: Ensure no performance degradation

## Risk Mitigation

1. **Incremental Migration**: Keep original formatter working during migration
2. **Feature Flags**: Use feature flags to switch between old/new formatters
3. **Comprehensive Testing**: Test thoroughly before removing old code
4. **Rollback Plan**: Keep original code until new code is proven stable
