import * as vscode from 'vscode';
import * as utils from './utils';
import { getKnownAttributeValues } from './KnownAttributes';

enum CompletionContextKind {
    InPropertyList,
    InPropertyGroup,
}

interface CompletionContext {
    kind: CompletionContextKind;
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
            return { kind: CompletionContextKind.InPropertyList, attributeName };
        }

        if (triggerChar === ':') {
            if (!this.isInPropertyGroup())
                return undefined;

            let b, e = lineText.length - 1;
            for (b = e; b > 0; --b) {
                const ch = lineText.charAt(b - 1);
                if (!ch.match(/[A-Za-z-]/)) {
                    break;
                }
            }
            return { kind: CompletionContextKind.InPropertyGroup, attributeName: lineText.substring(b, e) };
        }

        return undefined;
    }

    private propertyListPrefix = /^\s*(@root|(#|%)[\.\w- ]+|\/[\/\.\w- ]+)\s*:/;
    private propertyGroupPrefix = /^\s*(@root|(#|%)[\.\w- ]+|\/[\/\.\w- ]+)\s*{/;
    private propertyGroupSuffix = /^\s*}/;

    private isInPropertList(): boolean {
        const lineText = this.getLineTextAt(this.getLogicalLineBeginPosition(this.position));
        return this.propertyListPrefix.test(lineText);
    }

    private isInPropertyGroup(): boolean {
        for (let pos = this.getLogicalLineBeginPosition(this.position); pos; pos = pos.with(pos.line - 1)) {
            const lineText = this.getLineTextAt(pos);
            if (this.propertyGroupPrefix.test(lineText)) {
                return true;
            }
            if (this.propertyListPrefix.test(lineText) || this.propertyGroupSuffix.test(lineText)) {
                break;
            }
            if (pos.line == 0)
                break;
        }
        return false;
    }

    private getLineTextAt(position: vscode.Position): string {
        return utils.getLineTextAt(this.document, position);
    }

    private getLogicalLineBeginPosition(position: vscode.Position): vscode.Position {
        return utils.getLogicalLineBeginPosition(this.document, position);
    }
}

export class SbssCompletionItemProvider implements vscode.CompletionItemProvider {
    static register(context: vscode.ExtensionContext): void {
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(
            'sbss',
            new this(),
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