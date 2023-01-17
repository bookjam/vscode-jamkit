import {
    CompletionItem,
    CompletionItemKind,
    ExtensionContext,
    Position,
    TextDocument,
    languages,
} from 'vscode';

const knownAttributes = require('../known-attributes.json')

export function activate(context: ExtensionContext) {

    const valueCompletionItemProvider = languages.registerCompletionItemProvider(
        'sbss',
        {
            provideCompletionItems(document: TextDocument, position: Position) {

                const lineText = document.lineAt(position).text;

                // For some reason, `provideCompletionItems` seems to be triggered with any word chars
                // as well as '='. Hmm...
                if (lineText.substring(position.character - 1, position.character) !== '=') {
                    // return early if it wasn't '='
                    return null;
                }

                const isInPropertyList = () => {
                    let logicalLineBeginPosition = position.with(undefined, 0);
                    while (logicalLineBeginPosition.line > 0) {
                        const previousLinePosition = position.with(logicalLineBeginPosition.line - 1, 0);
                        if (document.lineAt(previousLinePosition).text.endsWith('\\'))
                            logicalLineBeginPosition = previousLinePosition;
                        else
                            break;
                    }

                    const regex = new RegExp("^\\s*(@root|(#|%)[\\.\\w- ]+|/[/\\.\\w- ]+)\\s*:");
                    return regex.test(document.lineAt(logicalLineBeginPosition).text);
                };
                if (!isInPropertyList()) {
                    return null;
                }

                const attributeName = (_ => {
                    let text = lineText.substring(0, position.character - 1);
                    return text.substring(Math.max(text.lastIndexOf(','), text.lastIndexOf(':')) + 1).trim();
                })();
                if (attributeName in knownAttributes) {
                    const values: [string] = knownAttributes[attributeName];
                    return values.map(value => new CompletionItem(value, CompletionItemKind.EnumMember));
                }
            }
        },
        '=' // triggered whenever '=' or ':' is being typed
    );

    context.subscriptions.push(valueCompletionItemProvider);
}