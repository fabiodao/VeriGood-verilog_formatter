/**
 * State machine for Verilog formatter
 * 
 * Manages all state transitions during document formatting,
 * replacing scattered boolean flags with a structured state machine.
 */

/**
 * Main formatter states
 */
export enum FormatterStateType {
  /** Initial state - outside any special context */
  INITIAL = 'INITIAL',
  
  /** Inside a module header (between 'module' and ');') */
  IN_MODULE_HEADER = 'IN_MODULE_HEADER',
  
  /** Collecting assignment statements for alignment */
  COLLECTING_ASSIGNMENTS = 'COLLECTING_ASSIGNMENTS',
  
  /** Collecting wire/reg/logic declarations for alignment */
  COLLECTING_WIRE_DECLS = 'COLLECTING_WIRE_DECLS',
  
  /** Collecting parameter/localparam declarations for alignment */
  COLLECTING_PARAMETERS = 'COLLECTING_PARAMETERS',
  
  /** Collecting port declarations for alignment */
  COLLECTING_PORTS = 'COLLECTING_PORTS',
  
  /** Inside module body (after module header) */
  IN_MODULE_BODY = 'IN_MODULE_BODY',
  
  /** Inside a function or task */
  IN_FUNCTION = 'IN_FUNCTION',
  
  /** Processing a multiline assignment continuation */
  IN_ASSIGNMENT_CONTINUATION = 'IN_ASSIGNMENT_CONTINUATION',
  
  /** Processing a multiline wire declaration continuation */
  IN_WIRE_CONTINUATION = 'IN_WIRE_CONTINUATION',
  
  /** Processing a multiline parameter continuation */
  IN_PARAMETER_CONTINUATION = 'IN_PARAMETER_CONTINUATION',
  
  /** Processing a multiline port continuation */
  IN_PORT_CONTINUATION = 'IN_PORT_CONTINUATION',
}

/**
 * Pending group data
 */
export interface PendingGroup {
  idx: number;
  text: string;
}

/**
 * Module header state
 */
export interface ModuleHeaderState {
  lines: string[];
  isActive: boolean;
}

/**
 * Continuation state
 */
export interface ContinuationState {
  assignment: boolean;
  wire: boolean;
  parameter: boolean;
  port: boolean;
}

/**
 * Main formatter state machine
 */
export class FormatterState {
  // Current state
  private currentState: FormatterStateType = FormatterStateType.INITIAL;
  
  // State history for debugging
  private stateHistory: Array<{ state: FormatterStateType; line: number }> = [];
  
  // Module header state
  private moduleHeader: ModuleHeaderState = {
    lines: [],
    isActive: false
  };
  
  // Pending groups for alignment
  private pendingAssignments: PendingGroup[] = [];
  private pendingWireDecls: PendingGroup[] = [];
  private pendingParams: PendingGroup[] = [];
  private pendingPorts: PendingGroup[] = [];
  
  // Continuation states
  private continuations: ContinuationState = {
    assignment: false,
    wire: false,
    parameter: false,
    port: false
  };
  
  // Counters and flags
  private blankCount: number = 0;
  private wireGroupNonDeclCount: number = 0;
  private functionDepth: number = 0;
  private moduleBodyActive: boolean = false;
  
  /**
   * Get current state
   */
  getState(): FormatterStateType {
    return this.currentState;
  }
  
  /**
   * Transition to a new state
   */
  transitionTo(newState: FormatterStateType, lineNumber: number): void {
    if (this.currentState !== newState) {
      this.stateHistory.push({ state: this.currentState, line: lineNumber });
      this.currentState = newState;
    }
  }
  
  /**
   * Get state history (for debugging)
   */
  getStateHistory(): ReadonlyArray<{ state: FormatterStateType; line: number }> {
    return this.stateHistory;
  }
  
  /**
   * Module header management
   */
  startModuleHeader(): void {
    this.moduleHeader.isActive = true;
    this.moduleHeader.lines = [];
    this.transitionTo(FormatterStateType.IN_MODULE_HEADER, -1);
  }
  
  addModuleHeaderLine(line: string): void {
    if (this.moduleHeader.isActive) {
      this.moduleHeader.lines.push(line);
    }
  }
  
  endModuleHeader(): string[] {
    const lines = [...this.moduleHeader.lines];
    this.moduleHeader.isActive = false;
    this.moduleHeader.lines = [];
    this.moduleBodyActive = true;
    this.transitionTo(FormatterStateType.IN_MODULE_BODY, -1);
    return lines;
  }
  
  isInModuleHeader(): boolean {
    return this.moduleHeader.isActive;
  }
  
  getModuleHeaderLines(): ReadonlyArray<string> {
    return this.moduleHeader.lines;
  }
  
  /**
   * Assignment group management
   */
  startAssignmentGroup(lineIndex: number, line: string): void {
    this.pendingAssignments.push({ idx: lineIndex, text: line });
    this.transitionTo(FormatterStateType.COLLECTING_ASSIGNMENTS, lineIndex);
  }
  
  addToAssignmentGroup(lineIndex: number, line: string): void {
    this.pendingAssignments.push({ idx: lineIndex, text: line });
  }
  
  flushAssignments(): PendingGroup[] {
    const assignments = [...this.pendingAssignments];
    this.pendingAssignments = [];
    if (this.currentState === FormatterStateType.COLLECTING_ASSIGNMENTS) {
      this.transitionTo(FormatterStateType.INITIAL, -1);
    }
    return assignments;
  }
  
  getPendingAssignments(): ReadonlyArray<PendingGroup> {
    return this.pendingAssignments;
  }
  
  hasPendingAssignments(): boolean {
    return this.pendingAssignments.length > 0;
  }
  
  /**
   * Wire declaration group management
   */
  startWireDeclGroup(lineIndex: number, line: string): void {
    this.pendingWireDecls.push({ idx: lineIndex, text: line });
    this.wireGroupNonDeclCount = 0;
    this.transitionTo(FormatterStateType.COLLECTING_WIRE_DECLS, lineIndex);
  }
  
  addToWireDeclGroup(lineIndex: number, line: string): void {
    this.pendingWireDecls.push({ idx: lineIndex, text: line });
  }
  
  flushWireDecls(): PendingGroup[] {
    const wireDecls = [...this.pendingWireDecls];
    this.pendingWireDecls = [];
    this.wireGroupNonDeclCount = 0;
    if (this.currentState === FormatterStateType.COLLECTING_WIRE_DECLS) {
      this.transitionTo(FormatterStateType.INITIAL, -1);
    }
    return wireDecls;
  }
  
  getPendingWireDecls(): ReadonlyArray<PendingGroup> {
    return this.pendingWireDecls;
  }
  
  hasPendingWireDecls(): boolean {
    return this.pendingWireDecls.length > 0;
  }
  
  incrementWireGroupNonDeclCount(): void {
    this.wireGroupNonDeclCount++;
  }
  
  getWireGroupNonDeclCount(): number {
    return this.wireGroupNonDeclCount;
  }
  
  resetWireGroupNonDeclCount(): void {
    this.wireGroupNonDeclCount = 0;
  }
  
  /**
   * Parameter group management
   */
  startParameterGroup(lineIndex: number, line: string): void {
    this.pendingParams.push({ idx: lineIndex, text: line });
    this.transitionTo(FormatterStateType.COLLECTING_PARAMETERS, lineIndex);
  }
  
  addToParameterGroup(lineIndex: number, line: string): void {
    this.pendingParams.push({ idx: lineIndex, text: line });
  }
  
  flushParameters(): PendingGroup[] {
    const params = [...this.pendingParams];
    this.pendingParams = [];
    if (this.currentState === FormatterStateType.COLLECTING_PARAMETERS) {
      this.transitionTo(FormatterStateType.INITIAL, -1);
    }
    return params;
  }
  
  getPendingParameters(): ReadonlyArray<PendingGroup> {
    return this.pendingParams;
  }
  
  hasPendingParameters(): boolean {
    return this.pendingParams.length > 0;
  }
  
  /**
   * Port group management
   */
  startPortGroup(lineIndex: number, line: string): void {
    this.pendingPorts.push({ idx: lineIndex, text: line });
    this.transitionTo(FormatterStateType.COLLECTING_PORTS, lineIndex);
  }
  
  addToPortGroup(lineIndex: number, line: string): void {
    this.pendingPorts.push({ idx: lineIndex, text: line });
  }
  
  flushPorts(): PendingGroup[] {
    const ports = [...this.pendingPorts];
    this.pendingPorts = [];
    if (this.currentState === FormatterStateType.COLLECTING_PORTS) {
      this.transitionTo(FormatterStateType.INITIAL, -1);
    }
    return ports;
  }
  
  getPendingPorts(): ReadonlyArray<PendingGroup> {
    return this.pendingPorts;
  }
  
  hasPendingPorts(): boolean {
    return this.pendingPorts.length > 0;
  }
  
  /**
   * Continuation state management
   */
  setAssignmentContinuation(value: boolean): void {
    this.continuations.assignment = value;
    if (value) {
      this.transitionTo(FormatterStateType.IN_ASSIGNMENT_CONTINUATION, -1);
    } else if (this.currentState === FormatterStateType.IN_ASSIGNMENT_CONTINUATION) {
      this.transitionTo(FormatterStateType.COLLECTING_ASSIGNMENTS, -1);
    }
  }
  
  isInAssignmentContinuation(): boolean {
    return this.continuations.assignment;
  }
  
  setWireContinuation(value: boolean): void {
    this.continuations.wire = value;
    if (value) {
      this.transitionTo(FormatterStateType.IN_WIRE_CONTINUATION, -1);
    } else if (this.currentState === FormatterStateType.IN_WIRE_CONTINUATION) {
      this.transitionTo(FormatterStateType.COLLECTING_WIRE_DECLS, -1);
    }
  }
  
  isInWireContinuation(): boolean {
    return this.continuations.wire;
  }
  
  setParameterContinuation(value: boolean): void {
    this.continuations.parameter = value;
    if (value) {
      this.transitionTo(FormatterStateType.IN_PARAMETER_CONTINUATION, -1);
    } else if (this.currentState === FormatterStateType.IN_PARAMETER_CONTINUATION) {
      this.transitionTo(FormatterStateType.COLLECTING_PARAMETERS, -1);
    }
  }
  
  isInParameterContinuation(): boolean {
    return this.continuations.parameter;
  }
  
  setPortContinuation(value: boolean): void {
    this.continuations.port = value;
    if (value) {
      this.transitionTo(FormatterStateType.IN_PORT_CONTINUATION, -1);
    } else if (this.currentState === FormatterStateType.IN_PORT_CONTINUATION) {
      this.transitionTo(FormatterStateType.COLLECTING_PORTS, -1);
    }
  }
  
  isInPortContinuation(): boolean {
    return this.continuations.port;
  }
  
  /**
   * Blank line management
   */
  incrementBlankCount(): void {
    this.blankCount++;
  }
  
  resetBlankCount(): void {
    this.blankCount = 0;
  }
  
  getBlankCount(): number {
    return this.blankCount;
  }
  
  /**
   * Function/task depth management
   */
  enterFunction(): void {
    this.functionDepth++;
    this.transitionTo(FormatterStateType.IN_FUNCTION, -1);
  }
  
  exitFunction(): void {
    this.functionDepth--;
    if (this.functionDepth < 0) {
      this.functionDepth = 0; // Safety check
    }
    if (this.functionDepth === 0) {
      this.transitionTo(FormatterStateType.IN_MODULE_BODY, -1);
    }
  }
  
  getFunctionDepth(): number {
    return this.functionDepth;
  }
  
  isInFunction(): boolean {
    return this.functionDepth > 0;
  }
  
  /**
   * Module body state
   */
  isModuleBodyActive(): boolean {
    return this.moduleBodyActive;
  }
  
  setModuleBodyActive(value: boolean): void {
    this.moduleBodyActive = value;
  }
  
  /**
   * Reset all state (for new document)
   */
  reset(): void {
    this.currentState = FormatterStateType.INITIAL;
    this.stateHistory = [];
    this.moduleHeader = { lines: [], isActive: false };
    this.pendingAssignments = [];
    this.pendingWireDecls = [];
    this.pendingParams = [];
    this.pendingPorts = [];
    this.continuations = {
      assignment: false,
      wire: false,
      parameter: false,
      port: false
    };
    this.blankCount = 0;
    this.wireGroupNonDeclCount = 0;
    this.functionDepth = 0;
    this.moduleBodyActive = false;
  }
  
  /**
   * Get a summary of current state (for debugging)
   */
  getStateSummary(): string {
    const parts: string[] = [];
    parts.push(`State: ${this.currentState}`);
    if (this.moduleHeader.isActive) {
      parts.push(`ModuleHeader: ${this.moduleHeader.lines.length} lines`);
    }
    if (this.pendingAssignments.length > 0) {
      parts.push(`Assignments: ${this.pendingAssignments.length}`);
    }
    if (this.pendingWireDecls.length > 0) {
      parts.push(`WireDecls: ${this.pendingWireDecls.length}`);
    }
    if (this.pendingParams.length > 0) {
      parts.push(`Parameters: ${this.pendingParams.length}`);
    }
    if (this.pendingPorts.length > 0) {
      parts.push(`Ports: ${this.pendingPorts.length}`);
    }
    if (this.functionDepth > 0) {
      parts.push(`FunctionDepth: ${this.functionDepth}`);
    }
    return parts.join(', ');
  }
}
