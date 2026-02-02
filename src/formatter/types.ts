import * as vscode from 'vscode';

/**
 * Configuration interface for the Verilog formatter
 */
export interface Config {
  indentSize: number;
  maxBlankLines: number;
  alignPortList: boolean;
  alignParameters: boolean;
  wrapPortList: boolean;
  lineLength: number;
  removeTrailingWhitespace: boolean;
  alignAssignments: boolean;
  alignWireDeclSemicolons: boolean;
  commentColumn: number;
  formatModuleInstantiations: boolean;
  formatModuleHeaders: boolean;
  indentAlwaysBlocks: boolean;
  enforceBeginEnd: boolean;
  indentCaseStatements: boolean;
  annotateIfdefComments: boolean;
}

/**
 * Retrieves configuration from VS Code settings
 */
export function getConfig(): Config {
  const wcfg = vscode.workspace.getConfiguration('verilogFormatter');
  return {
    indentSize: wcfg.get<number>('indentSize', 2),
    maxBlankLines: wcfg.get<number>('maxBlankLines', 1),
    alignPortList: wcfg.get<boolean>('alignPortList', true),
    alignParameters: wcfg.get<boolean>('alignParameters', true),
    wrapPortList: wcfg.get<boolean>('wrapPortList', true),
    lineLength: wcfg.get<number>('lineLength', 160),
    removeTrailingWhitespace: wcfg.get<boolean>('removeTrailingWhitespace', true),
    alignAssignments: wcfg.get<boolean>('alignAssignments', true),
    alignWireDeclSemicolons: wcfg.get<boolean>('alignWireDeclSemicolons', true),
    commentColumn: wcfg.get<number>('commentColumn', 0),
    formatModuleInstantiations: wcfg.get<boolean>('formatModuleInstantiations', true),
    formatModuleHeaders: wcfg.get<boolean>('formatModuleHeaders', true),
    indentAlwaysBlocks: wcfg.get<boolean>('indentAlwaysBlocks', true),
    enforceBeginEnd: wcfg.get<boolean>('enforceBeginEnd', true),
    indentCaseStatements: wcfg.get<boolean>('indentCaseStatements', true),
    annotateIfdefComments: wcfg.get<boolean>('annotateIfdefComments', true)
  };
}

/**
 * Checks if any formatting feature is enabled
 */
export function hasAnyFeatureEnabled(cfg: Config): boolean {
  return cfg.removeTrailingWhitespace || cfg.maxBlankLines < 100 ||
    cfg.alignAssignments || cfg.alignWireDeclSemicolons || cfg.alignParameters ||
    cfg.alignPortList || cfg.formatModuleHeaders || cfg.formatModuleInstantiations ||
    cfg.indentAlwaysBlocks || cfg.enforceBeginEnd || cfg.indentCaseStatements ||
    cfg.annotateIfdefComments || cfg.commentColumn > 0;
}
