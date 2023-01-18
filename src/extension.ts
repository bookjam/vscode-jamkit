import * as vscode from 'vscode';

const KNOWN_ATTRIBUTES = require('../known-attributes.json')

function getKnownAttributeValues(attributeName: string): string[] | undefined {
    return KNOWN_ATTRIBUTES[attributeName];
}

enum SbssContextKind {
    InPropertyList,
    InPropertyGroup,
}

interface SbssContext {
    kind: SbssContextKind;
    attributeName: string;
}

class SbssContextParser {
    readonly document: vscode.TextDocument;
    readonly position: vscode.Position;

    constructor(document: vscode.TextDocument, position: vscode.Position) {
        this.document = document;
        this.position = position;
    }

    parseContext(): SbssContext | undefined {
        if (this.position.character == 0) {
            return undefined;
        }

        const lineText = this.getLineTextAt(this.position).substring(0, this.position.character);
        const triggerChar = lineText.trimEnd().slice(-1);

        if (triggerChar === '=') {
            if (!this.isInPropertList())
                return undefined;

            const text = lineText.substring(0, lineText.length - 1);
            const attributeName = text.substring(Math.max(text.lastIndexOf(','), text.lastIndexOf(':')) + 1).trim();
            return { kind: SbssContextKind.InPropertyList, attributeName };
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
            return { kind: SbssContextKind.InPropertyGroup, attributeName: lineText.substring(b, e) };
        }

        return undefined;
    }

    private propertyListPrefix = /^\s*(@root|(#|%)[\.\w- ]+|\/[\/\.\w- ]+)\s*:/
    private propertyGroupPrefix = /^\s*(@root|(#|%)[\.\w- ]+|\/[\/\.\w- ]+)\s*{/
    private propertyGroupSuffix = /^\s*}/

    private isInPropertList(): boolean {
        const lineText = this.getLineTextAt(this.getLogicalLineBeginPosistion(this.position));
        return this.propertyListPrefix.test(lineText);
    }

    private isInPropertyGroup(): boolean {
        for (let pos = this.getLogicalLineBeginPosistion(this.position); pos; pos = pos.with(pos.line - 1)) {
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
        return this.document.lineAt(position).text;
    }

    private getLogicalLineBeginPosistion(position: vscode.Position): vscode.Position {
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

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(
        'sbss',
        {
            provideCompletionItems: function (document: vscode.TextDocument, position: vscode.Position) {
                const contextParser = new SbssContextParser(document, position);
                const context = contextParser.parseContext();
                if (context) {
                    const values = getKnownAttributeValues(context.attributeName);
                    if (values) {
                        return values.map(value => {
                            const item = new vscode.CompletionItem(value, vscode.CompletionItemKind.EnumMember);
                            if (context.kind == SbssContextKind.InPropertyGroup) {
                                item.insertText = " " + value + ";";
                            }
                            return item;
                        });
                    }
                }
                return undefined;
            }
        },
        '=', ':'
    ));
}