import * as vscode from 'vscode';
import * as utils from './DocumentUtils';
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

        const lineText = utils.getLineTextAt(this.document, this.position).substring(0, this.position.character);
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

    private sectionPropListPrefix = /^\s*=begin\s+([\.\w- ]*)?\s*:/;
    private objectPropListPrefix = /^\s*=(object|image)\s+([a-z-]+)\s*:/;

    private isInPropertList(): boolean {
        const lineText = utils.getLineTextAt(this.document, utils.getLogicalLineBeginPosition(this.document, this.position));
        return this.sectionPropListPrefix.test(lineText) || this.objectPropListPrefix.test(lineText);
    }
}

export class SbmlCompletionItemProvider implements vscode.CompletionItemProvider {

    static register(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(
            'sbml', new this(), '='
        ));
    }

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
        const contextParser = new CompletionContextParser(document, position);
        const context = contextParser.parseContext();
        if (context) {
            const values = getKnownAttributeValues(context.attributeName);
            if (values) {
                return values.map(value => new vscode.CompletionItem(value, vscode.CompletionItemKind.EnumMember));
            }
        }
        return undefined;
    }
}