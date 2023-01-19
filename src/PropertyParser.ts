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


class PropertyParser {
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

    parse(line: number, offset: number, text: string): PropertyRange[] {

        const propRanges: PropertyRange[] = [];

        for (let i = offset; i < text.length; ++i) {
            const ch = text[i];

            if (ch == '\\' && i == text.length - 1) {
                // line concatnation char - ignore.
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
                    if (ch == '=' || isSpace(ch)) {
                        this.nameEndPos = new vscode.Position(line, i);
                        this.state = (ch == '=') ?
                            PropertyParseState.BeforeValue :
                            PropertyParseState.AfterName;
                    }
                    break;

                case PropertyParseState.AfterName:
                    assert(this.nameBeginPos);
                    assert(this.nameEndPos);
                    if (ch == '=') {
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
                    } else if (ch === ',') {
                        // trim end
                        let nonSpaceIndex = i - 1;
                        while (text[nonSpaceIndex] == ' ' || text[nonSpaceIndex] == '\t') {
                            nonSpaceIndex--;
                        }
                        this.valueEndPos = new vscode.Position(line, nonSpaceIndex + 1);
                        this.state = PropertyParseState.BeforeName;
                    }
                    // force value reading at EOL
                    if (!this.valueEndPos && i == text.length - 1) {
                        this.valueEndPos = new vscode.Position(line, i + 1);
                    }
                    break;

                case PropertyParseState.AfterValue:
                    if (ch === ',') {
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
        super('=', ',');
    }
}

export class PropertyGroupParser extends PropertyParser {
    constructor() {
        super(':', ';');
    }
}