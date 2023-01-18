import * as vscode from 'vscode';
import { getKnownAttributeValues } from './KnownAttributes';

interface CompletionContext {
    attributeName: string;
}

class CompletionContextParser {
    readonly document: vscode.TextDocument;
    readonly position: vscode.Position;

    constructor(document: vscode.TextDocument, position: vscode.Position) {
        this.document = document;
        this.position = position;
    }

    parseContext(): CompletionContext | undefined {

        const lineText = this.getLineTextAt(this.position).substring(0, this.position.character);
        const triggerChar = lineText.trimEnd().slice(-1);

        if (triggerChar === '=') {
            if (!this.isInPropertList())
                return undefined;

            const text = lineText.substring(0, lineText.length - 1);
            const attributeName = text.substring(Math.max(text.lastIndexOf(','), text.lastIndexOf(':')) + 1).trim();
            return { attributeName };
        }

        return undefined;
    }

    private propertyListPrefix = /^\s*(@root|(#|%)[\.\w- ]+|\/[\/\.\w- ]+)\s*:/

    private isInPropertList(): boolean {
        const lineText = this.getLineTextAt(this.getLogicalLineBeginPosition(this.position));
        return this.propertyListPrefix.test(lineText);
    }

    private getLineTextAt(position: vscode.Position): string {
        return this.document.lineAt(position).text;
    }

    private getLogicalLineBeginPosition(position: vscode.Position): vscode.Position {
        let lineBeginPosition = position.with(undefined, 0);
        while (lineBeginPosition.line > 0) {
            const previousLineBeginPosition = lineBeginPosition.with(lineBeginPosition.line - 1);
            if (!this.document.lineAt(previousLineBeginPosition).text.endsWith('\\'))
                break;
            lineBeginPosition = previousLineBeginPosition;
        }
        return lineBeginPosition;
    }
}

export class SbssCompletionItemProvider implements vscode.CompletionItemProvider {

    static register(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(
            'sbss',
            new SbssCompletionItemProvider(),
            '=', ':'
        ));
    }

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
        const contextParser = new CompletionContextParser(document, position);
        const context = contextParser.parseContext();
        if (context) {
            const values = getKnownAttributeValues(context.attributeName);
            if (values) {
                return values.map(value => {
                    const item = new vscode.CompletionItem(value, vscode.CompletionItemKind.EnumMember);
                    if (context.kind == CompletionContextKind.InPropertyGroup) {
                        item.insertText = " " + value + ";";
                    }
                    return item;
                });
            }
        }
        return undefined;
    }
}