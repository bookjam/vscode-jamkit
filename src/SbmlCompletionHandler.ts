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
                    if (context.triggerCharacter == '=' &&
                        document.lineAt(position.line).text.trim() == '=' &&
                        (position.line == 0 || !document.lineAt(position.line - 1).text.endsWith('\\'))) {
                        return ['begin', 'end', 'object', 'comment', 'style', 'if', 'else', 'elif'].map(directive =>
                            new vscode.CompletionItem(directive, vscode.CompletionItemKind.Keyword)
                        );
                    }

                    const contextParser = new SbmlContextParser(document, position);
                    return new PropCompletionItemProvider(contextParser, document, position, context.triggerCharacter).provide();
                }
            },
            ':', ',', '='
        ));
    }
}