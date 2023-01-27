import * as vscode from 'vscode';
import { PropCompletionItemProvider } from './PropCompletionItemProvider';
import { SbssContextParser } from './SbssContextParser';
import { PropNameContext, PropValueContext } from './ContextParser';

export class SbssCompletionHandler {
    static register(context: vscode.ExtensionContext): void {
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
                    const context = contextParser.parse();
                    if (context instanceof PropNameContext || context instanceof PropValueContext) {
                        return new PropCompletionItemProvider(context, document, position, _context.triggerCharacter).provide();
                    }

                }
            },
            ':', ',', '='
        ));
    }
}