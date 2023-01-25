import * as vscode from 'vscode';
import { PropCompletionItemProvider } from './PropCompletionItemProvider';
import { SbmlContextParser } from './SbmlContextParser';

export class SbmlCompletionHandler {
    static register(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(
            'sbml',
            {
                provideCompletionItems(
                    document: vscode.TextDocument,
                    position: vscode.Position,
                    _token: vscode.CancellationToken,
                    context: vscode.CompletionContext
                ) {
                    const contextParser = new SbmlContextParser(document, position);
                    return new PropCompletionItemProvider(contextParser, document, position, context.triggerCharacter).provide();
                }
            },
            ':', ',', '='
        ));
    }
}