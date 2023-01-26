import * as vscode from 'vscode';
import { assert } from 'console';
import {
    PropParseState,
    PropListParser,
    PropBlockParser,
} from './PropGroupParser';
import { PropTarget } from "./PropTarget";

export enum PropGroupKind {
    List, Block
}

export interface PropGroupContext {
    kind: PropGroupKind;
    target: PropTarget;
    beginPos: vscode.Position;
};

export class PropNameCompletionContext {
    target: PropTarget;
    namePrefix?: string;

    constructor(target: PropTarget, namePrefix?: string) {
        this.target = target;
        this.namePrefix = namePrefix;
    }
}

export class PropValueCompletionContext {
    target: PropTarget;
    name: string;
    valuePrefix?: string;

    constructor(target: PropTarget, name: string, valuePrefix?: string) {
        this.target = target;
        this.name = name;
        this.valuePrefix = valuePrefix;
    }
}

export type PropCompletionContext = PropNameCompletionContext | PropValueCompletionContext;

export abstract class ContextParser {
    readonly document: vscode.TextDocument;
    readonly position: vscode.Position;

    constructor(document: vscode.TextDocument, position: vscode.Position) {
        this.document = document;
        this.position = position;
    }

    parse(): PropCompletionContext | undefined {
        if (this.propGroupContext) {
            const target = this.propGroupContext.target;
            const beginPos = this.propGroupContext.beginPos;
            const parser = this.propGroupContext.kind == PropGroupKind.List ? new PropListParser() : new PropBlockParser();
            for (let line = beginPos.line; line <= this.position.line; ++line) {
                const offset = line == beginPos.line ? beginPos.character : 0;
                const text = (() => {
                    const text = this.document.lineAt(line).text;
                    if (line < this.position.line) {
                        return text;
                    }
                    return text.substring(0, this.position.character);
                })();

                // TODO: collect already appeared prop names and pass them as a part of context
                parser.parse(line, offset, text);
            }

            const parseState = parser.getState();
            if (parseState == PropParseState.BeforeName) {
                return new PropNameCompletionContext(target);
            }

            if (parseState == PropParseState.InName) {
                const namePrefix = this.getTextFrom(parser.getNameBeginPos());
                return new PropNameCompletionContext(target, namePrefix);
            }

            if (parseState == PropParseState.BeforeValue) {
                const name = this.document.getText(parser.getNameRange());
                return new PropValueCompletionContext(target, name);
            }

            if (parseState == PropParseState.InValue) {
                const name = this.document.getText(parser.getNameRange());
                const valuePrefix = this.getTextFrom(parser.getValueBeginPos());
                return new PropValueCompletionContext(target, name, valuePrefix);
            }

            assert(parseState == PropParseState.AfterName || parseState == PropParseState.AfterValue);
            return undefined; // no completion
        }
    }

    abstract parsePropGroupContext(): PropGroupContext | null;

    get propGroupContext(): PropGroupContext | null {
        if (this._propGroupContext == undefined) {
            this._propGroupContext = this.parsePropGroupContext();
        }
        return this._propGroupContext;
    }
    private _propGroupContext: PropGroupContext | null | undefined;

    getTextFrom(beginPos: vscode.Position): string {
        return this.document.getText(new vscode.Range(beginPos, this.position));
    }

    getLineTextAt(line: number) {
        return this.document.lineAt(line).text;
    }

    getLogicalBeginLine(): number {
        let line = this.position.line;
        while (line > 0) {
            if (!this.document.lineAt(line - 1).text.endsWith('\\'))
                break;
            line -= 1;
        }
        return line;
    }
}
