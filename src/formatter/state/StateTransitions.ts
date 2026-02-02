/**
 * State transition logic for Verilog formatter
 * 
 * Contains helper functions to determine state transitions
 * based on line content and current state.
 */

import { FormatterState, FormatterStateType } from './FormatterState';

/**
 * Determines if a line starts a module header
 */
export function isModuleStart(line: string): boolean {
  return /^\s*module\b/.test(line);
}

/**
 * Determines if a line ends a module header
 */
export function isModuleHeaderEnd(line: string): boolean {
  return /;\s*(\/\/.*)?$/.test(line);
}

/**
 * Determines if a line is an assignment statement
 */
export function isAssignmentLine(line: string): boolean {
  if (/^\s*assign\b/.test(line)) return true;
  if (/^\s*(wire|reg|logic|input|output|inout)\b/.test(line)) return false;
  if (/^[^\/]*?(?:<=|=)(?![=]).*;\s*(\/\/.*)?$/.test(line) && !/\b(?:always|if|else)\s*\(/.test(line)) {
    return true;
  }
  return false;
}

/**
 * Determines if a line is a wire/reg/logic declaration
 */
export function isWireDeclLine(line: string): boolean {
  return /^\s*(wire|reg|logic|input|output|inout|integer)\b/.test(line);
}

/**
 * Determines if a line is a parameter/localparam declaration
 */
export function isParameterLine(line: string): boolean {
  return /^\s*(parameter|localparam)\b/.test(line);
}

/**
 * Determines if a line is a port declaration (in module body)
 */
export function isPortDeclLine(line: string): boolean {
  return /^\s*(input|output|inout)\b/.test(line);
}

/**
 * Determines if a line starts a function or task
 */
export function isFunctionStart(line: string): boolean {
  return /^\s*\b(function|task)\b/.test(line);
}

/**
 * Determines if a line ends a function or task
 */
export function isFunctionEnd(line: string): boolean {
  return /^\s*\b(endfunction|endtask)\b/.test(line);
}

/**
 * Determines if a line ends with a semicolon (completes a declaration)
 */
export function hasTerminatingSemicolon(line: string): boolean {
  return /;\s*(\/\/.*)?$/.test(line);
}

/**
 * Determines if a line is a comment
 */
export function isCommentLine(line: string): boolean {
  return /^\s*\/\//.test(line);
}

/**
 * Determines if a line is a macro directive
 */
export function isMacroDirective(line: string): boolean {
  return /^\s*`(ifn?def|else|endif)\b/.test(line);
}

/**
 * Determines if a line is blank
 */
export function isBlankLine(line: string): boolean {
  return line.trim() === '';
}

/**
 * Determines if a wire declaration has an initialization (equals sign)
 */
export function wireDeclHasInit(line: string): boolean {
  const lineWithoutComment = line.replace(/\/\/.*$/, '');
  return /=/.test(lineWithoutComment);
}

/**
 * Determines if a declaration is an IO declaration (input/output/inout)
 */
export function isIODeclaration(line: string): boolean {
  return /^\s*(input|output|inout)\b/.test(line);
}

/**
 * State transition handler
 * 
 * Analyzes a line and determines what state transition should occur
 */
export class StateTransitionHandler {
  /**
   * Process a line and update state accordingly
   */
  static processLine(state: FormatterState, lineIndex: number, line: string, cfg: {
    alignAssignments: boolean;
    alignWireDeclSemicolons: boolean;
    alignParameters: boolean;
    formatModuleHeaders: boolean;
    maxBlankLines: number;
  }): {
    shouldFlush: string[];
    shouldProcess: boolean;
    newState?: FormatterStateType;
  } {
    const trimmed = line.trim();
    const result: {
      shouldFlush: string[];
      shouldProcess: boolean;
      newState?: FormatterStateType;
    } = {
      shouldFlush: [],
      shouldProcess: true
    };

    // Handle blank lines
    if (isBlankLine(line)) {
      state.incrementBlankCount();
      // Keep blank lines in groups if within limit
      if (state.hasPendingAssignments() && !state.isInAssignmentContinuation()) {
        if (state.getBlankCount() <= cfg.maxBlankLines) {
          state.addToAssignmentGroup(lineIndex, line);
          return { shouldFlush: [], shouldProcess: false };
        }
      }
      if (state.hasPendingParameters() && !state.isInParameterContinuation()) {
        if (state.getBlankCount() <= cfg.maxBlankLines) {
          state.addToParameterGroup(lineIndex, line);
          return { shouldFlush: [], shouldProcess: false };
        }
      }
      if (state.hasPendingWireDecls() && !state.isInWireContinuation()) {
        const firstPendingIsIO = state.hasPendingWireDecls() && 
          isIODeclaration(state.getPendingWireDecls()[0].text);
        if (!firstPendingIsIO && state.getWireGroupNonDeclCount() > 3) {
          result.shouldFlush.push('wire');
        } else if (state.getBlankCount() <= cfg.maxBlankLines) {
          state.addToWireDeclGroup(lineIndex, line);
          return { shouldFlush: [], shouldProcess: false };
        }
      }
      // Flush all groups on blank line (if not kept in group)
      result.shouldFlush.push('assignments', 'wire', 'parameters', 'ports');
      state.resetBlankCount();
      return result;
    } else {
      state.resetBlankCount();
    }

    // Handle module header
    if (cfg.formatModuleHeaders) {
      if (!state.isInModuleHeader() && isModuleStart(line)) {
        result.shouldFlush.push('assignments', 'wire');
        state.startModuleHeader();
        state.addModuleHeaderLine(line);
        return { shouldFlush: result.shouldFlush, shouldProcess: false };
      }
      if (state.isInModuleHeader()) {
        state.addModuleHeaderLine(line);
        if (isModuleHeaderEnd(line)) {
          // Module header ends - will be processed separately
          return { shouldFlush: [], shouldProcess: false };
        }
        return { shouldFlush: [], shouldProcess: false };
      }
    }

    // Handle function/task depth
    if (isFunctionStart(line)) {
      state.enterFunction();
    }
    if (isFunctionEnd(line)) {
      result.shouldFlush.push('wire'); // Flush wire declarations before exiting function
      state.exitFunction();
    }

    // Handle continuations first
    if (state.isInAssignmentContinuation()) {
      state.addToAssignmentGroup(lineIndex, line);
      if (hasTerminatingSemicolon(line)) {
        state.setAssignmentContinuation(false);
      }
      return { shouldFlush: [], shouldProcess: false };
    }

    if (state.isInWireContinuation()) {
      state.addToWireDeclGroup(lineIndex, line);
      if (hasTerminatingSemicolon(line)) {
        state.setWireContinuation(false);
      }
      return { shouldFlush: [], shouldProcess: false };
    }

    if (state.isInParameterContinuation()) {
      state.addToParameterGroup(lineIndex, line);
      if (hasTerminatingSemicolon(line)) {
        state.setParameterContinuation(false);
      }
      return { shouldFlush: [], shouldProcess: false };
    }

    if (state.isInPortContinuation()) {
      state.addToPortGroup(lineIndex, line);
      if (hasTerminatingSemicolon(line)) {
        state.setPortContinuation(false);
      }
      return { shouldFlush: [], shouldProcess: false };
    }

    // Handle wire declarations
    if (cfg.alignWireDeclSemicolons && isWireDeclLine(line)) {
      const hasEqualSign = wireDeclHasInit(line);
      const isIODecl = isIODeclaration(line);
      
      // Check if we need to flush existing wire group
      if (state.hasPendingWireDecls() && !state.isInWireContinuation() && !state.isInFunction()) {
        const firstPending = state.getPendingWireDecls()[0].text;
        const firstPendingHasEqual = wireDeclHasInit(firstPending);
        const firstPendingIsIO = isIODeclaration(firstPending);
        
        if (firstPendingIsIO !== isIODecl || firstPendingHasEqual !== hasEqualSign) {
          result.shouldFlush.push('wire');
        }
      }
      
      // Flush other groups when starting wire group
      if (!state.hasPendingWireDecls()) {
        result.shouldFlush.push('assignments', 'parameters', 'ports');
      }
      
      state.startWireDeclGroup(lineIndex, line);
      if (!hasTerminatingSemicolon(line)) {
        state.setWireContinuation(true);
      }
      return { shouldFlush: result.shouldFlush, shouldProcess: false };
    }

    // Handle parameters
    if (cfg.alignParameters && isParameterLine(line)) {
      if (!state.hasPendingParameters()) {
        result.shouldFlush.push('wire', 'assignments', 'ports');
      }
      state.startParameterGroup(lineIndex, line);
      if (!hasTerminatingSemicolon(line)) {
        state.setParameterContinuation(true);
      }
      return { shouldFlush: result.shouldFlush, shouldProcess: false };
    }

    // Handle assignments
    if (cfg.alignAssignments && isAssignmentLine(line)) {
      state.startAssignmentGroup(lineIndex, line);
      if (!hasTerminatingSemicolon(line)) {
        state.setAssignmentContinuation(true);
      }
      return { shouldFlush: [], shouldProcess: false };
    }

    // Handle comments/macros in groups
    if (state.hasPendingAssignments() && !state.isInAssignmentContinuation()) {
      if (isCommentLine(line) || isMacroDirective(line)) {
        state.addToAssignmentGroup(lineIndex, line);
        return { shouldFlush: [], shouldProcess: false };
      } else {
        result.shouldFlush.push('assignments');
      }
    }

    if (state.hasPendingWireDecls() && !state.isInWireContinuation()) {
      if (isCommentLine(line) || isMacroDirective(line)) {
        state.incrementWireGroupNonDeclCount();
        const firstPendingIsIO = state.hasPendingWireDecls() && 
          isIODeclaration(state.getPendingWireDecls()[0].text);
        if (!firstPendingIsIO && state.getWireGroupNonDeclCount() > 3) {
          result.shouldFlush.push('wire');
        } else {
          state.addToWireDeclGroup(lineIndex, line);
          return { shouldFlush: [], shouldProcess: false };
        }
      } else {
        const firstPendingIsIO = state.hasPendingWireDecls() && 
          isIODeclaration(state.getPendingWireDecls()[0].text);
        const isParam = isParameterLine(line);
        if (!firstPendingIsIO || isParam) {
          result.shouldFlush.push('wire');
        } else {
          // For IO groups, treat unknown lines as passthrough
          state.incrementWireGroupNonDeclCount();
          state.addToWireDeclGroup(lineIndex, line);
          return { shouldFlush: [], shouldProcess: false };
        }
      }
    }

    if (state.hasPendingParameters() && !state.isInParameterContinuation()) {
      if (isCommentLine(line) || isMacroDirective(line) || isBlankLine(line)) {
        state.addToParameterGroup(lineIndex, line);
        return { shouldFlush: [], shouldProcess: false };
      } else {
        result.shouldFlush.push('parameters');
      }
    }

    return result;
  }
}
