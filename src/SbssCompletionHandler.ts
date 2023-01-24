import * as vscode from 'vscode';
import * as utils from './utils';
import { getKnownAttributeValues } from './KnownAttributes';
import { SBSS_PROP_GROUP_PREFIX, SBSS_PROP_GROUP_SUFFIX, SBSS_PROP_LIST_PREFIX } from './patterns';
import { CompletionContextParser, PropGroupContext, PropListContext } from './CompletionContextParser';
import { CompletionItemProvider } from './CompletionItemProvider';

/*
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
}

class SbssCompletionItemProvider implements vscode.CompletionItemProvider {
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
}*/

class SbssCompletionContextParser extends CompletionContextParser {
    getPropListContext(): PropListContext | null {
        const line = this.getLogicalLineBeginPos().line;
        const text = this.document.lineAt(line).text;
        const m = text.match(SBSS_PROP_LIST_PREFIX);
        if (m) {
            const beginIndex = text.indexOf(':') + 1;
            return { directive: m[1], beginPos: new vscode.Position(line, beginIndex) };
        }
        return null;
    }

    getPropGroupContext(): PropGroupContext | null {
        for (let pos = this.getLogicalLineBeginPos(); pos && pos.line > 0; pos = pos.with(pos.line - 1)) {
            const text = this.getLineTextAt(pos.line);
            const m = text.match(SBSS_PROP_GROUP_PREFIX);
            if (m) {
                return { selector: m[1], beginPos: new vscode.Position(pos.line + 1, 0) };
            }
            if (SBSS_PROP_LIST_PREFIX.test(text) || SBSS_PROP_GROUP_SUFFIX.test(text)) {
                break;
            }
        }
        return null;
    }
}

export class SbssCompletionHandler {
    static register(context: vscode.ExtensionContext): void {
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(
            'sbss',
            {
                provideCompletionItems(
                    document: vscode.TextDocument,
                    position: vscode.Position,
                    _token: vscode.CancellationToken,
                    context: vscode.CompletionContext
                ) {
                    const contextParser = new SbssCompletionContextParser(document, position);
                    return new CompletionItemProvider(contextParser, document, position, context.triggerCharacter).provide();
                }
            },
            ':', ',', '='
        ));
    }
}