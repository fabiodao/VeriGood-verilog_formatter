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
  enableUVMFormatting?: boolean;
  uvmLineLength?: number;
  /** Modules whose single-line instantiations should be expanded to multi-line */
  expandSingleLineModules?: string[];
  /** Modules whose instantiations should be collapsed to single line */
  collapseSingleLineModules?: string[];
  /** Preserve original instantiation style: single-line stays single-line, multi-line stays multi-line */
  preserveInstantiationStyle?: boolean;
}

/**
 * Default configuration values.
 *
 * This is the single source of truth for defaults. It mirrors the "default"
 * fields declared in package.json (contributes.configuration) and is reused by
 * both the VS Code extension (via {@link getConfig}) and the standalone CLI.
 */
export const DEFAULT_CONFIG: Required<Config> = {
  indentSize: 2,
  maxBlankLines: 1,
  alignPortList: true,
  alignParameters: true,
  wrapPortList: true,
  lineLength: 160,
  removeTrailingWhitespace: true,
  alignAssignments: true,
  alignWireDeclSemicolons: true,
  commentColumn: 0,
  formatModuleInstantiations: true,
  formatModuleHeaders: true,
  indentAlwaysBlocks: true,
  enforceBeginEnd: true,
  indentCaseStatements: true,
  annotateIfdefComments: true,
  enableUVMFormatting: true,
  uvmLineLength: 100,
  expandSingleLineModules: [],
  collapseSingleLineModules: [],
  preserveInstantiationStyle: false
};

/**
 * Merges a partial set of overrides onto {@link DEFAULT_CONFIG}.
 *
 * Pure function with no VS Code dependency, so it can be used from any context
 * (the extension, the CLI, or tests). Keys whose value is `undefined` are
 * ignored so that unspecified options keep their default.
 */
export function resolveConfig(overrides: Partial<Config> = {}): Config {
  const cfg: Config = { ...DEFAULT_CONFIG };
  (Object.keys(overrides) as (keyof Config)[]).forEach(key => {
    const value = overrides[key];
    if (value !== undefined) {
      (cfg as Record<keyof Config, unknown>)[key] = value;
    }
  });
  return cfg;
}

/**
 * Retrieves configuration from VS Code settings
 * @param options Optional formatting options from VS Code (includes editor tabSize)
 */
export function getConfig(options?: vscode.FormattingOptions): Config {
  const wcfg = vscode.workspace.getConfiguration('verilogFormatter');

  // Get indentSize from config, or use editor's tabSize if not explicitly set
  let indentSize: number;
  const configuredIndentSize = wcfg.inspect<number>('indentSize');
  if (configuredIndentSize && (configuredIndentSize.workspaceValue !== undefined ||
      configuredIndentSize.globalValue !== undefined ||
      configuredIndentSize.workspaceFolderValue !== undefined)) {
    // User has explicitly set indentSize, use it
    indentSize = wcfg.get<number>('indentSize', DEFAULT_CONFIG.indentSize);
  } else {
    // Not explicitly set, use editor's tabSize from status bar
    indentSize = options?.tabSize !== undefined ? options.tabSize : DEFAULT_CONFIG.indentSize;
  }

  return resolveConfig({
    indentSize,
    maxBlankLines: wcfg.get<number>('maxBlankLines', DEFAULT_CONFIG.maxBlankLines),
    alignPortList: wcfg.get<boolean>('alignPortList', DEFAULT_CONFIG.alignPortList),
    alignParameters: wcfg.get<boolean>('alignParameters', DEFAULT_CONFIG.alignParameters),
    wrapPortList: wcfg.get<boolean>('wrapPortList', DEFAULT_CONFIG.wrapPortList),
    lineLength: wcfg.get<number>('lineLength', DEFAULT_CONFIG.lineLength),
    removeTrailingWhitespace: wcfg.get<boolean>('removeTrailingWhitespace', DEFAULT_CONFIG.removeTrailingWhitespace),
    alignAssignments: wcfg.get<boolean>('alignAssignments', DEFAULT_CONFIG.alignAssignments),
    alignWireDeclSemicolons: wcfg.get<boolean>('alignWireDeclSemicolons', DEFAULT_CONFIG.alignWireDeclSemicolons),
    commentColumn: wcfg.get<number>('commentColumn', DEFAULT_CONFIG.commentColumn),
    formatModuleInstantiations: wcfg.get<boolean>('formatModuleInstantiations', DEFAULT_CONFIG.formatModuleInstantiations),
    formatModuleHeaders: wcfg.get<boolean>('formatModuleHeaders', DEFAULT_CONFIG.formatModuleHeaders),
    indentAlwaysBlocks: wcfg.get<boolean>('indentAlwaysBlocks', DEFAULT_CONFIG.indentAlwaysBlocks),
    enforceBeginEnd: wcfg.get<boolean>('enforceBeginEnd', DEFAULT_CONFIG.enforceBeginEnd),
    indentCaseStatements: wcfg.get<boolean>('indentCaseStatements', DEFAULT_CONFIG.indentCaseStatements),
    annotateIfdefComments: wcfg.get<boolean>('annotateIfdefComments', DEFAULT_CONFIG.annotateIfdefComments),
    enableUVMFormatting: wcfg.get<boolean>('enableUVMFormatting', DEFAULT_CONFIG.enableUVMFormatting),
    uvmLineLength: wcfg.get<number>('uvmLineLength', DEFAULT_CONFIG.uvmLineLength),
    expandSingleLineModules: wcfg.get<string[]>('expandSingleLineModules', DEFAULT_CONFIG.expandSingleLineModules),
    collapseSingleLineModules: wcfg.get<string[]>('collapseSingleLineModules', DEFAULT_CONFIG.collapseSingleLineModules),
    preserveInstantiationStyle: wcfg.get<boolean>('preserveInstantiationStyle', DEFAULT_CONFIG.preserveInstantiationStyle)
  });
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
