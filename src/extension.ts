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

    const sbssPropertyValueProvider = languages.registerCompletionItemProvider(
        'sbss',
        {
            provideCompletionItems(document: TextDocument, position: Position) {

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
                    return undefined;
                }

                const text = document.lineAt(position).text.substring(0, position.character - 1);

                Math.max(text.lastIndexOf(','), text.lastIndexOf(':'));
                for (const key in knownAttributes) {
                    if (text.endsWith(key)) {
                        const values: [string] = knownAttributes[key]
                        return values.map(value => new CompletionItem(value, CompletionItemKind.EnumMember));
                    }
                }
            }
        },
        '=' // triggered whenever '=' or ':' is being typed
    );

    context.subscriptions.push(sbssPropertyValueProvider);
}