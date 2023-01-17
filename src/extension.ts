import * as vscode from 'vscode';

const KNOWN_ATTRIBUTES = require('../known-attributes.json')

function getCompletionItems(attributeName: string): vscode.CompletionItem[] {
    const values: string[] | undefined = KNOWN_ATTRIBUTES[attributeName];
    if (values) {
        return values.map(value =>
            new vscode.CompletionItem(value, vscode.CompletionItemKind.EnumMember));
    }
    return [];
}

class SbssCompletionItemProvider implements vscode.CompletionItemProvider {

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
        const lineText = document.lineAt(position).text;

        if (lineText.substring(position.character - 1, position.character) !== '=') {
            return undefined;
        }

        if (!this.isInPropertyList(document, position)) {
            return undefined;
        }

        const attributeName = (_ => {
            const text = lineText.substring(0, position.character - 1);
            return text.substring(Math.max(text.lastIndexOf(','), text.lastIndexOf(':')) + 1).trim();
        })();

        return getCompletionItems(attributeName);
    }

    private propertyListPrefix = new RegExp("^\\s*(@root|(#|%)[\\.\\w- ]+|/[/\\.\\w- ]+)\\s*:");

    private isInPropertyList(document: vscode.TextDocument, position: vscode.Position) {
        const lineText = this.getLocalLineTextUpTo(document, position);
        return this.propertyListPrefix.test(lineText);
    }

    private getLocalLineTextUpTo(document: vscode.TextDocument, position: vscode.Position): string {
        let lineText = document.lineAt(position).text;
        let lineBeginPos = position.with(undefined, 0);
        while (lineBeginPos.line > 0) {
            const prevLinePos = position.with(lineBeginPos.line - 1);
            const prevLineText = document.lineAt(prevLinePos).text;
            if (!prevLineText.endsWith('\\'))
                break;
            lineBeginPos = prevLinePos;
            lineText = prevLineText.substring(0, prevLineText.length - 1) + lineText;
        }
        return lineText;
    }
}

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(
        'sbss', new SbssCompletionItemProvider(), '='
    ));
}