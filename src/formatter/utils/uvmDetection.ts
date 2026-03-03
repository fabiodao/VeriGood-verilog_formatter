/**
 * UVM Detection Module
 * 
 * Detects if a file contains UVM testbench code vs RTL code
 * UVM code uses different formatting conventions (4-space indent, always begin/end, etc.)
 */

/**
 * Detect if the given text contains UVM testbench code
 * 
 * Detection criteria:
 * - Presence of UVM macros (`uvm_component_utils, `uvm_object_utils, etc.)
 * - Presence of UVM base classes (extends uvm_*)
 * - Presence of UVM phase methods (build_phase, run_phase, etc.)
 * - Presence of UVM factory/config calls
 */
export function isUVMCode(text: string): boolean {
  // Check for UVM macros
  const uvmMacros = [
    '`uvm_component_utils',
    '`uvm_object_utils',
    '`uvm_field_',
    '`uvm_info',
    '`uvm_error',
    '`uvm_warning',
    '`uvm_fatal',
    '`uvm_do',
    '`uvm_create',
    '`uvm_send',
    '`uvm_analysis_imp'
  ];
  
  for (const macro of uvmMacros) {
    if (text.includes(macro)) {
      return true;
    }
  }
  
  // Check for UVM base classes
  const uvmBaseClasses = [
    'extends uvm_component',
    'extends uvm_test',
    'extends uvm_env',
    'extends uvm_agent',
    'extends uvm_driver',
    'extends uvm_monitor',
    'extends uvm_scoreboard',
    'extends uvm_sequence',
    'extends uvm_sequence_item',
    'extends uvm_object',
    'extends uvm_subscriber'
  ];
  
  for (const baseClass of uvmBaseClasses) {
    if (text.includes(baseClass)) {
      return true;
    }
  }
  
  // Check for UVM phase methods
  const uvmPhases = [
    'function void build_phase',
    'function void connect_phase',
    'task run_phase',
    'function void end_of_elaboration_phase',
    'function void start_of_simulation_phase',
    'task main_phase',
    'task pre_reset_phase',
    'task reset_phase',
    'task post_reset_phase'
  ];
  
  for (const phase of uvmPhases) {
    if (text.includes(phase)) {
      return true;
    }
  }
  
  // Check for UVM factory/config calls
  const uvmFactoryCalls = [
    'uvm_config_db',
    'uvm_factory',
    'set_type_override',
    'set_inst_override',
    'create_component',
    'create_object'
  ];
  
  for (const call of uvmFactoryCalls) {
    if (text.includes(call)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get UVM-specific configuration overrides
 * These override the default RTL formatting settings
 * 
 * Note: Indentation is NOT overridden - it uses the editor's tab size setting
 * 
 * @param cfg - Base configuration (to get user's UVM preferences)
 */
export function getUVMConfigOverrides(cfg: any) {
  return {
    // Don't override indentSize - use editor's setting
    lineLength: cfg.uvmLineLength || 100,         // UVM standard is 100 chars
    enforceBeginEnd: true,                        // Always use begin/end in UVM
    alignAssignments: false,                      // UVM style guide discourages alignment
    alignWireDeclSemicolons: false,               // No alignment in UVM
    maxBlankLines: 1                              // More compact than RTL
  };
}
