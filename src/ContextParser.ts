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

export class PropContext {
    readonly kind: PropGroupKind;
    readonly target: PropTarget;

    constructor(kind: PropGroupKind, target: PropTarget) {
        this.kind = kind;
        this.target = target;
    }
}
export class PropNameContext extends PropContext {
    readonly namePrefix?: string;

    constructor(kind: PropGroupKind, target: PropTarget, namePrefix?: string) {
        super(kind, target);
        this.namePrefix = namePrefix;
    }
}

export class PropValueContext extends PropContext {
    readonly name: string;
    readonly valuePrefix?: string;

    constructor(kind: PropGroupKind, target: PropTarget, name: string, valuePrefix?: string) {
        super(kind, target);
        this.name = name;
        this.valuePrefix = valuePrefix;
    }
}

export abstract class ContextParser {
    readonly document: vscode.TextDocument;
    readonly position: vscode.Position;

    constructor(document: vscode.TextDocument, position: vscode.Position) {
        this.document = document;
        this.position = position;
    }

    parse(): PropContext | undefined {
        const context = this.propGroupContext;

        if (context) {
            const target = context.target;
            const beginPos = context.beginPos;
            const parser = context.kind == PropGroupKind.List ? new PropListParser() : new PropBlockParser();
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
                return new PropNameContext(context.kind, target);
            }

            if (parseState == PropParseState.InName) {
                const namePrefix = this.getTextFrom(parser.getNameBeginPos());
                return new PropNameContext(context.kind, target, namePrefix);
            }

            if (parseState == PropParseState.BeforeValue) {
                const name = this.document.getText(parser.getNameRange());
                return new PropValueContext(context.kind, target, name);
            }

            if (parseState == PropParseState.InValue) {
                const name = this.document.getText(parser.getNameRange());
                const valuePrefix = this.getTextFrom(parser.getValueBeginPos());
                return new PropValueContext(context.kind, target, name, valuePrefix);
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
