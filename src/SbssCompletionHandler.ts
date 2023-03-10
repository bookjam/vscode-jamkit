import * as vscode from 'vscode';
import { PropCompletionItemProvider } from './PropCompletionItemProvider';
import { SbssContextParser } from './SbssContextParser';

export class SbssCompletionHandler {
    static init(context: vscode.ExtensionContext): void {
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(
            'sbss',
            {
                provideCompletionItems(
                    document: vscode.TextDocument,
                    position: vscode.Position,
                    _token: vscode.CancellationToken,
                    _context: vscode.CompletionContext
                ) {
                    const contextParser = new SbssContextParser(document, position);
                    const context = contextParser.parsePropContext();
                    if (context) {
                        return new PropCompletionItemProvider(document, context, _context.triggerCharacter).provide();
                    }
                }
            },
            ':', ',', '=', '$'
        ));
    }
}