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
}

export class PropNameContext {
    readonly kind: PropGroupKind;
    readonly target: PropTarget;
    readonly namePrefix?: string;

    constructor(kind: PropGroupKind, target: PropTarget, namePrefix?: string) {
        this.kind = kind;
        this.target = target;
        this.namePrefix = namePrefix;
    }
}

export class PropValueContext {
    readonly kind: PropGroupKind;
    readonly target: PropTarget;
    readonly name: string;
    readonly valuePrefix?: string;

    constructor(kind: PropGroupKind, target: PropTarget, name: string, valuePrefix?: string) {
        this.kind = kind;
        this.target = target;
        this.name = name;
        this.valuePrefix = valuePrefix;
    }
}

export abstract class ContextParser {
    readonly document;
    readonly position;

    constructor(document: vscode.TextDocument, position: vscode.Position) {
        this.document = document;
        this.position = position;
    }

    parsePropContext(): PropNameContext | PropValueContext | undefined {
        const propGroupContext = this.parsePropGroupContext();

        if (propGroupContext) {
            const target = propGroupContext.target;
            const beginPos = propGroupContext.beginPos;
            const parser = propGroupContext.kind == PropGroupKind.List ? new PropListParser() : new PropBlockParser();
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

            const kind = propGroupContext.kind;
            const parseState = parser.getState();

            if (parseState == PropParseState.BeforeName) {
                return new PropNameContext(kind, target);
            }

            if (parseState == PropParseState.InName) {
                const namePrefix = this.getTextFrom(parser.getNameBeginPos());
                return new PropNameContext(kind, target, namePrefix);
            }

            if (parseState == PropParseState.BeforeValue) {
                const name = this.document.getText(parser.getNameRange());
                return new PropValueContext(kind, target, name);
            }

            if (parseState == PropParseState.InValue) {
                const name = this.document.getText(parser.getNameRange());
                const valuePrefix = this.getTextFrom(parser.getValueBeginPos());
                return new PropValueContext(kind, target, name, valuePrefix);
            }

            assert(parseState == PropParseState.AfterName || parseState == PropParseState.AfterValue);
            return undefined; // no completion
        }
    }

    abstract parsePropGroupContext(): PropGroupContext | undefined;

    getTextFrom(beginPos: vscode.Position): string {
        return this.document.getText(new vscode.Range(beginPos, this.position));
    }

    getLineTextAt(line: number) {
        return this.document.lineAt(line).text;
    }

    private _localBeginLine: number | undefined;
    get logicalBeginLine(): number {
        if (this._localBeginLine == undefined) {
            let line = this.position.line;
            while (line > 0) {
                if (!this.document.lineAt(line - 1).text.endsWith('\\'))
                    break;
                line -= 1;
            }
            this._localBeginLine = line;
        }
        return this._localBeginLine;
    }

    private _isContinuedLine: boolean | undefined;
    get isContinuedLine(): boolean {
        if (this._isContinuedLine == undefined) {
            if (this.position.line == 0) {
                this._isContinuedLine = false;
            } else {
                this._isContinuedLine = this.document.lineAt(this.position).text.trimEnd().endsWith('\\');
            }
        }
        return this._isContinuedLine;
    }

    private _textUpToCursor: string | undefined;
    get textUpToCursor(): string {
        if (this._textUpToCursor == undefined) {
            this._textUpToCursor = this.document.lineAt(this.position).text.substring(0, this.position.character);
        }
        return this._textUpToCursor;
    }
}
