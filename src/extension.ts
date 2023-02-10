import * as vscode from 'vscode';
import { JamkitExtension } from './JamkitExtension';

export function activate(context: vscode.ExtensionContext) {
    JamkitExtension.init(context);
}
