import * as vscode from 'vscode';
// Using modular formatter (can switch back to './formatter' if needed)
import { formatDocument, formatRange } from './formatter/index';

export function activate(context: vscode.ExtensionContext) {
  const selector: vscode.DocumentSelector = [
    { language: 'verilog', scheme: 'file' },
    { language: 'verilog', scheme: 'untitled' },
    { language: 'systemverilog', scheme: 'file' },
    { language: 'systemverilog', scheme: 'untitled' }
  ];

  const documentProvider: vscode.DocumentFormattingEditProvider = {
    provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken): vscode.TextEdit[] {
      return formatDocument(document, options);
    }
  };

  const rangeProvider: vscode.DocumentRangeFormattingEditProvider = {
    provideDocumentRangeFormattingEdits(document: vscode.TextDocument, range: vscode.Range, options: vscode.FormattingOptions, token: vscode.CancellationToken): vscode.TextEdit[] {
      // Use range-based formatting with alignment calculated only from selected lines
      return formatRange(document, range, options);
    }
  };

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(selector, documentProvider),
    vscode.languages.registerDocumentRangeFormattingEditProvider(selector, rangeProvider)
  );
}

export function deactivate() {}
