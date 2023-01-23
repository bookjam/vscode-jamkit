import * as vscode from 'vscode';
import * as utils from './utils';
import { getKnownAttributeNames, getKnownAttributeValues } from './KnownAttributes';
import { SBML_PROP_LIST_PREFIX } from './patterns';
import { PropertyListParser, PropertyParseState, PropertyParser } from './PropertyParser';
import { assert } from 'console';

interface PropListContext {
    directive: string;
    beginPos: vscode.Position;
};

enum PropertyTarget {
    Unknown,
    Section,
    BlockObject,
    InlineObject,
}

class PropertyNameCompletionContext {
    target: PropertyTarget;
    namePrefix?: string;

    constructor(target: PropertyTarget, namePrefix?: string) {
        this.target = target;
        this.namePrefix = namePrefix;
    }
}

class PropertyValueCompletionContext {
    target: PropertyTarget;
    name: string;
    valuePrefix?: string;

    constructor(target: PropertyTarget, name: string, valuePrefix?: string) {
        this.target = target;
        this.name = name;
    }
}

type PropertyCompletionContext = PropertyNameCompletionContext | PropertyValueCompletionContext;

class CompletionContextParser {
    readonly document: vscode.TextDocument;
    readonly position: vscode.Position;

    constructor(document: vscode.TextDocument, position: vscode.Position) {
        this.document = document;
        this.position = position;
    }

    parse(): PropertyCompletionContext | undefined {
        const propListContext = this.getPropListContext();
        if (propListContext) {
            const target = (() => {
                if (propListContext.directive == "begin")
                    return PropertyTarget.Section;
                if (propListContext.directive == "object" || propListContext.directive == "image")
                    return PropertyTarget.BlockObject;
                return PropertyTarget.Unknown;
            })();

            const propListBeginPos = propListContext.beginPos;
            const propParser = new PropertyListParser();
            for (let line = propListBeginPos.line; line <= this.position.line; ++line) {
                const offset = line == propListBeginPos.line ? propListBeginPos.character : 0;
                const text = (() => {
                    const text = this.document.lineAt(line).text;
                    if (line < this.position.line) {
                        return text;
                    }
                    return text.substring(0, this.position.character);
                })();
                propParser.parse(line, offset, text);
            }

            const propParseState = propParser.getState();
            if (propParseState == PropertyParseState.BeforeName) {
                return new PropertyNameCompletionContext(target);
            }

            if (propParseState == PropertyParseState.InName) {
                const namePrefix = this.document.getText(new vscode.Range(propParser.getNameBeginPos(), this.position));
                return new PropertyNameCompletionContext(target, namePrefix);
            }

            if (propParseState == PropertyParseState.BeforeValue) {
                const name = this.document.getText(propParser.getNameRange());
                return new PropertyValueCompletionContext(target, name);
            }

            if (propParseState == PropertyParseState.InValue) {
                const name = this.document.getText(propParser.getNameRange());
                const valuePrefix = this.document.getText(new vscode.Range(propParser.getValueBeginPos(), this.position));
                return new PropertyValueCompletionContext(target, name, valuePrefix);
            }

            assert(propParseState == PropertyParseState.AfterName || propParseState == PropertyParseState.AfterValue);
            return undefined; // no completion
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

class SbmlCompletionItemProvider implements vscode.CompletionItemProvider {

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
        console.log(`provideCompletionItems: ${position.line}:${position.character}`);

        const context = parseCompletionContext(document, position);
        console.log(context);

        if (context instanceof PropertyNameCompletionContext) {
            return this.getPropertyNameCompletionItems(context);
        }

        if (context instanceof PropertyValueCompletionContext) {
            return this.getPropertyValueCompletionItems(context);
        }
    }

    private getPropertyNameCompletionItems(context: PropertyNameCompletionContext) {
        console.log(`property name: namePrefix=${context.namePrefix}`);
        let names = getKnownAttributeNames();
        if (names) {
            if (context.namePrefix) {
                const namePrefix = context.namePrefix;
                names = names.filter(name => name.startsWith(namePrefix));
            }
            return names.map(name => new vscode.CompletionItem(name, vscode.CompletionItemKind.EnumMember));
        }
    }

    private getPropertyValueCompletionItems(context: PropertyValueCompletionContext) {
        console.log(`property value: name=${context.name}, valuePrefix=${context.valuePrefix}`);
        let values = getKnownAttributeValues(context.name);
        if (values) {
            if (context.valuePrefix) {
                const valuePrefix = context.valuePrefix;
                values = values.filter(value => value.startsWith(valuePrefix));
            }
            return values.map(value => new vscode.CompletionItem(value, vscode.CompletionItemKind.EnumMember));
        }
    }
}

function parseCompletionContext(document: vscode.TextDocument, position: vscode.Position): PropertyCompletionContext | undefined {
    return new CompletionContextParser(document, position).parse();
}

export class SbmlCompletionHandler {
    static register(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(
            'sbml', new SbmlCompletionItemProvider(), ':', ',', '='
        ));
    }
}