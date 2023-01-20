import * as vscode from 'vscode';
import { assert } from 'console';

export interface PropertyRange {
    nameRange: vscode.Range;
    valueRange: vscode.Range;
}

enum PropertyParseState {
    BeforeName,
    InName,
    AfterName,
    BeforeValue,
    InValue,
    AfterValue
}

function isSpace(ch: string) {
    assert(ch.length == 1);
    return ch === ' ' || ch === '\t';
}

export class PropertyParser {
    private readonly separator: string;
    private readonly terminator: string;
    private state: PropertyParseState = PropertyParseState.BeforeName;

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

    getState(): PropertyParseState {
        return this.state;
    }

    getNameRange(): vscode.Range {
        if (this.nameBeginPos && this.nameEndPos) {
            return new vscode.Range(this.nameBeginPos, this.nameEndPos);
        } else {
            throw Error("Check the state first to see if you can call `getNameRange()`.");
        }
    }

    getValueBeginPosition(): vscode.Position {
        if (this.valueBeginPos) {
            return this.valueBeginPos;
        }
        else {
            throw Error("Check the state first to see if you can call `getValueBeginPosition()`.");
        }
    }

    parse(line: number, offset: number, text: string): PropertyRange[] {

        const propRanges: PropertyRange[] = [];

        for (let i = offset; i < text.length; ++i) {
            const ch = text[i];

            if (ch == '\\' && i == text.length - 1) {
                // line continuation char - ignore.
                break;
            }

            switch (this.state) {
                case PropertyParseState.BeforeName:
                    if (!isSpace(ch)) {
                        this.nameBeginPos = new vscode.Position(line, i);
                        this.state = PropertyParseState.InName;
                    }
                    break;

                case PropertyParseState.InName:
                    assert(this.nameBeginPos);
                    if (ch == this.separator || isSpace(ch)) {
                        this.nameEndPos = new vscode.Position(line, i);
                        this.state = (ch == this.separator) ?
                            PropertyParseState.BeforeValue :
                            PropertyParseState.AfterName;
                    }
                    break;

                case PropertyParseState.AfterName:
                    assert(this.nameBeginPos);
                    assert(this.nameEndPos);
                    if (ch == this.separator) {
                        this.state = PropertyParseState.BeforeValue;
                    } else if (!isSpace(ch)) {
                        // unexpected residue... report?
                    }
                    break;

                case PropertyParseState.BeforeValue:
                    assert(this.nameBeginPos);
                    assert(this.nameEndPos);
                    if (!isSpace(ch)) {
                        if (ch === "'" || ch === '"') {
                            this.valueEscaped = false;
                            this.valueQuoteChar = ch;
                        } else {
                            this.valueQuoteChar = undefined;
                        }
                        this.valueBeginPos = new vscode.Position(line, i);
                        this.state = PropertyParseState.InValue;
                    }
                    break;

                case PropertyParseState.InValue:
                    assert(this.nameBeginPos);
                    assert(this.nameEndPos);
                    assert(this.valueBeginPos);
                    if (this.valueQuoteChar) {
                        if (ch === '\\') {
                            this.valueEscaped = !this.valueEscaped;
                        } else if (ch === this.valueQuoteChar) {
                            if (!this.valueEscaped) {
                                this.valueEndPos = new vscode.Position(line, i + 1);
                                this.state = PropertyParseState.AfterValue;
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
                            this.state = PropertyParseState.BeforeName;
                        }
                    }
                    // force value reading at EOL
                    if (!this.valueEndPos && i == text.length - 1) {
                        this.valueEndPos = new vscode.Position(line, i + 1);
                    }
                    break;

                case PropertyParseState.AfterValue:
                    if (ch === this.terminator) {
                        this.state = PropertyParseState.BeforeName;
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

export class PropertyListParser extends PropertyParser {
    constructor() {
        super(/*sep*/ '=', /*term*/ ',');
    }
}

export class PropertyGroupParser extends PropertyParser {
    constructor() {
        super(/*sep*/ ':', /*term*/ ';');
    }
}