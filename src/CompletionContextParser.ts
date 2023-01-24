import * as vscode from 'vscode';
import * as utils from './utils';
import { assert } from 'console';
import {
    PropParseState,
    PropParser,
    PropListParser,
    PropGroupParser,
} from './PropertyParser';
import { PropTarget } from './KnownAttributes';

export interface PropListContext {
    directive: string;
    beginPos: vscode.Position;
};

export interface PropGroupContext {
    selector: string;
    beginPos: vscode.Position;
};

export class PropertyNameCompletionContext {
    target: PropTarget;
    namePrefix?: string;

    constructor(target: PropTarget, namePrefix?: string) {
        this.target = target;
        this.namePrefix = namePrefix;
    }
}

export class PropertyValueCompletionContext {
    target: PropTarget;
    name: string;
    valuePrefix?: string;

    constructor(target: PropTarget, name: string, valuePrefix?: string) {
        this.target = target;
        this.name = name;
    }
}

export type PropertyCompletionContext = PropertyNameCompletionContext | PropertyValueCompletionContext;

export abstract class CompletionContextParser {
    readonly document: vscode.TextDocument;
    readonly position: vscode.Position;

    constructor(document: vscode.TextDocument, position: vscode.Position) {
        this.document = document;
        this.position = position;
    }

    parse(): PropertyCompletionContext | undefined {


        const propParseContext = this.getPropParseContext();
        if (propParseContext) {
            const target = propParseContext.target;
            const beginPos = propParseContext.beginPos;
            const parser = propParseContext.parser;
            for (let line = beginPos.line; line <= this.position.line; ++line) {
                const offset = line == beginPos.line ? beginPos.character : 0;
                const text = (() => {
                    const text = this.document.lineAt(line).text;
                    if (line < this.position.line) {
                        return text;
                    }
                    return text.substring(0, this.position.character);
                })();
                parser.parse(line, offset, text);
            }

            const propParseState = parser.getState();
            if (propParseState == PropParseState.BeforeName) {
                return new PropertyNameCompletionContext(target);
            }

            if (propParseState == PropParseState.InName) {
                const namePrefix = this.getTextFrom(parser.getNameBeginPos());
                return new PropertyNameCompletionContext(target, namePrefix);
            }

            if (propParseState == PropParseState.BeforeValue) {
                const name = this.getText(parser.getNameRange());
                return new PropertyValueCompletionContext(target, name);
            }

            if (propParseState == PropParseState.InValue) {
                const name = this.getText(parser.getNameRange());
                const valuePrefix = this.getTextFrom(parser.getValueBeginPos());
                return new PropertyValueCompletionContext(target, name, valuePrefix);
            }

            assert(propParseState == PropParseState.AfterName || propParseState == PropParseState.AfterValue);
            return undefined; // no completion
        }

        const propGroupContext = this.getPropGroupContext();
        if (propGroupContext) {
            const target = (() => {
                if (propGroupContext.selector[0] == '@' || propGroupContext.selector[0] == '%' ||
                    propGroupContext.selector[0] == '/') {
                    return PropTarget.Section;
                }
                return PropTarget.Unknown;
            })();

            const propGroupBeginPos = propGroupContext.beginPos;
            const propParser = new PropGroupParser();
        }
    }

    abstract getPropListContext(): PropListContext | null;
    abstract getPropGroupContext(): PropGroupContext | null;

    private getPropParseContext(): { target: PropTarget; parser: PropParser; beginPos: vscode.Position; } | null {

        const propListContext = this.getPropListContext();
        if (propListContext) {
            const target = (() => {
                if (propListContext.directive == "begin")
                    return PropTarget.Section;
                if (propListContext.directive == "object" || propListContext.directive == "image")
                    return PropTarget.BlockObject;
                return PropTarget.Unknown;
            })();

            return { target, beginPos: propListContext.beginPos, parser: new PropListParser() };
        }

        const propGroupContext = this.getPropGroupContext();
        if (propGroupContext) {
            const target = (() => {
                if (propGroupContext.selector[0] == '@' || propGroupContext.selector[0] == '%' ||
                    propGroupContext.selector[0] == '/') {
                    return PropTarget.Section;
                }
                return PropTarget.Unknown;
            })();

            return { target, beginPos: propGroupContext.beginPos, parser: new PropGroupParser() };
        }

        return null;
    }

    private getText(range: vscode.Range): string {
        return this.document.getText(range);
    }

    private getTextFrom(beginPos: vscode.Position): string {
        return this.getText(new vscode.Range(beginPos, this.position));
    }

    getLineTextAt(line: number) {
        return this.document.lineAt(line).text;
    }

    getLogicalLineBeginPos(): vscode.Position {
        return utils.getLogicalLineBeginPosition(this.document, this.position);
    }
}
