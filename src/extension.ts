import * as vscode from 'vscode';
import { SbssCompletionItemProvider } from './SbssCompletionItemProvider';

export function activate(context: vscode.ExtensionContext) {
    SbssCompletionItemProvider.register(context);
}