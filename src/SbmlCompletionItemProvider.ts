import * as vscode from 'vscode';
import * as utils from './utils';
import { getKnownAttributeValues } from './KnownAttributes';
import { SBML_PROP_LIST_PREFIX } from './patterns';
import { PropertyListParser } from './PropertyParser';

type PropListContext = {
    directive: string;
    beginPos: vscode.Position;
};

enum PropertyTarget {
    Unknown,
    Section,
    BlockObject,
    InlineObject,
}

type PropertyNameCompletionContext = {
    target: PropertyTarget;
};

type PropertyValueCompletionContext = {
    target: PropertyTarget;
    propName: string;
};

type CompletionContext = PropertyNameCompletionContext | PropertyValueCompletionContext;

class CompletionContextParser {
    readonly document: vscode.TextDocument;
    readonly position: vscode.Position;

    constructor(document: vscode.TextDocument, position: vscode.Position) {
        this.document = document;
        this.position = position;
    }

    parse(): CompletionContext | undefined {
        const lineText = utils.getLineTextAt(this.document, this.position).substring(0, this.position.character);
        const triggerChar = lineText.trimEnd().slice(-1);

        const propListContext = this.getPropListContext();
        if (propListContext) {
            const target = (() => {
                if (propListContext.directive == "begin")
                    return PropertyTarget.Section;
                if (propListContext.directive == "object" || propListContext.directive == "image")
                    return PropertyTarget.BlockObject;
                return PropertyTarget.Unknown;
            })();

            //const propParser = new PropertyListParser();

            const text = lineText.substring(0, lineText.length - 1);
            const propName = text.substring(Math.max(text.lastIndexOf(','), text.lastIndexOf(':')) + 1).trim();
            return { target, propName };
        }
    }

    private getPropListContext(): PropListContext | null {
        const pos = utils.getLogicalLineBeginPosition(this.document, this.position);
        const text = utils.getLineTextAt(this.document, pos);
        const m = text.match(SBML_PROP_LIST_PREFIX);
        if (m && m[4] == ':') {
            return { directive: m[1], beginPos: new vscode.Position(pos.line, text.indexOf(':')) };
        }
        return null;
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
        const context = contextParser.parse();
        if (context) {
            const values = getKnownAttributeValues(context.attributeName);
            if (values) {
                return values.map(value => new vscode.CompletionItem(value, vscode.CompletionItemKind.EnumMember));
            }
        }
        return undefined;
    }
}