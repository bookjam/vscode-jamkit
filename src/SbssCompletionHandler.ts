import * as vscode from 'vscode';
import { PropCompletionItemProvider } from './PropCompletionItemProvider';
import { SbssContextParser } from './SbssContextParser';
export class SbssCompletionHandler {
    static register(context: vscode.ExtensionContext): void {
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(
            'sbss',
            {
                provideCompletionItems(
                    document: vscode.TextDocument,
                    position: vscode.Position,
                    _token: vscode.CancellationToken,
                    context: vscode.CompletionContext
                ) {
                    const contextParser = new SbssContextParser(document, position);
                    return new PropCompletionItemProvider(contextParser, document, position, context.triggerCharacter).provide();
                }
            },
            ':', ',', '='
        ));
    }
}