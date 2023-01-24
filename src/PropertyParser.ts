import * as vscode from 'vscode';
import { assert } from 'console';

export interface PropRange {
    nameRange: vscode.Range;
    valueRange: vscode.Range;
}

export enum PropParseState {
    BeforeName,
    InName,
    AfterName,
    BeforeValue,
    InValue,
    AfterValue
}

export class PropParser {
    private readonly separator: string;
    private readonly terminator: string;
    private state: PropParseState = PropParseState.BeforeName;

    private nameBeginPos?: vscode.Position;
    private nameEndPos?: vscode.Position;
    private valueBeginPos?: vscode.Position;
    private valueEndPos?: vscode.Position;
    private valueQuoteChar?: string;
    private valueEscaped?: boolean;

    constructor(separator: string, terminator: string) {
        assert(separator);
        this.separator = separator;
        this.terminator = terminator;
    }

    getState(): PropParseState {
        return this.state;
    }

    getNameBeginPos(): vscode.Position {
        if (this.nameBeginPos) {
            return this.nameBeginPos;
        }
        else {
            throw Error("Check the state first to see if you can call `getNameBeginPos()`.");
        }
    }

    getNameRange(): vscode.Range {
        if (this.nameBeginPos && this.nameEndPos) {
            return new vscode.Range(this.nameBeginPos, this.nameEndPos);
        } else {
            throw Error("Check the state first to see if you can call `getNameRange()`.");
        }
    }

    getValueBeginPos(): vscode.Position {
        if (this.valueBeginPos) {
            return this.valueBeginPos;
        }
        else {
            throw Error("Check the state first to see if you can call `getValueBeginPos()`.");
        }
    }

    parse(line: number, offset: number, text: string): PropRange[] {

        const propRanges: PropRange[] = [];

        for (let i = offset; i < text.length; ++i) {
            const ch = text[i];

            if (ch == '\\' && i == text.length - 1) {
                // line continuation char - ignore.
                break;
            }

            switch (this.state) {
                case PropParseState.BeforeName:
                    if (!isSpace(ch)) {
                        this.nameBeginPos = new vscode.Position(line, i);
                        this.state = PropParseState.InName;
                    }
                    break;

                case PropParseState.InName:
                    assert(this.nameBeginPos);
                    if (ch == this.separator || isSpace(ch)) {
                        this.nameEndPos = new vscode.Position(line, i);
                        this.state = (ch == this.separator) ?
                            PropParseState.BeforeValue :
                            PropParseState.AfterName;
                    }
                    break;

                case PropParseState.AfterName:
                    assert(this.nameBeginPos);
                    assert(this.nameEndPos);
                    if (ch == this.separator) {
                        this.state = PropParseState.BeforeValue;
                    } else if (!isSpace(ch)) {
                        // unexpected residue... report?
                    }
                    break;

                case PropParseState.BeforeValue:
                    assert(this.nameBeginPos);
                    assert(this.nameEndPos);
                    if (!isSpace(ch)) {
                        if (ch == this.terminator) {
                            this.valueBeginPos = new vscode.Position(line, i - 1);
                            this.valueEndPos = this.valueBeginPos;
                            this.state = PropParseState.BeforeName;
                        } else {
                            if (ch === "'" || ch === '"') {
                                this.valueEscaped = false;
                                this.valueQuoteChar = ch;
                            } else {
                                this.valueQuoteChar = undefined;
                            }
                            this.valueBeginPos = new vscode.Position(line, i);
                            this.state = PropParseState.InValue;
                        }
                    }
                    break;

                case PropParseState.InValue:
                    assert(this.nameBeginPos);
                    assert(this.nameEndPos);
                    assert(this.valueBeginPos);
                    if (this.valueQuoteChar) {
                        if (ch === '\\') {
                            this.valueEscaped = !this.valueEscaped;
                        } else if (ch === this.valueQuoteChar) {
                            if (!this.valueEscaped) {
                                this.valueEndPos = new vscode.Position(line, i + 1);
                                this.state = PropParseState.AfterValue;
                            }
                        } else {
                            this.valueEscaped = false;
                        }
                    } else {
                        if (ch === this.terminator) {
                            // trim end
                            let nonSpaceIndex = i - 1;
                            while (isSpace(text[nonSpaceIndex])) {
                                nonSpaceIndex--;
                            }
                            this.valueEndPos = new vscode.Position(line, nonSpaceIndex + 1);
                            this.state = PropParseState.BeforeName;
                        }
                    }
                    // force value reading at EOL
                    if (!this.valueEndPos && i == text.length - 1) {
                        this.valueEndPos = new vscode.Position(line, i + 1);
                    }
                    break;

                case PropParseState.AfterValue:
                    if (ch === this.terminator) {
                        this.state = PropParseState.BeforeName;
                    } else if (!isSpace(ch)) {
                        // unexepcted residue... report?
                    }
                    break;
            }

            if (this.nameBeginPos && this.nameEndPos && this.valueBeginPos && this.valueEndPos) {
                propRanges.push({
                    nameRange: new vscode.Range(this.nameBeginPos, this.nameEndPos),
                    valueRange: new vscode.Range(this.valueBeginPos, this.valueEndPos)
                });
                this.nameBeginPos = undefined;
                this.nameEndPos = undefined;
                this.valueBeginPos = undefined;
                this.valueEndPos = undefined;
            }
        }

        return propRanges;
    }
}

export class PropListParser extends PropParser {
    constructor() {
        super(/*sep*/ '=', /*term*/ ',');
    }
}

export class PropGroupParser extends PropParser {
    constructor() {
        super(/*sep*/ ':', /*term*/ ';');
    }
}

function isSpace(ch: string) {
    assert(ch.length == 1);
    return ch === ' ' || ch === '\t';
}