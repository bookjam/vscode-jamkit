import * as vscode from 'vscode';
import { assert } from 'console';

export enum PropertyListParseState {
    BeforeName,
    InName,
    AfterName,
    BeforeValue,
    InValue,
    AfterValue
}

export interface PropertyRange {
    nameRange: vscode.Range;
    valueRange: vscode.Range;
}

export class PropertyListParser {
    private line: number;
    private offset: number;
    private state: PropertyListParseState = PropertyListParseState.BeforeName;

    private nameBeginPos?: vscode.Position;
    private nameEndPos?: vscode.Position;
    private valueBeginPos?: vscode.Position;
    private valueEndPos?: vscode.Position;
    private valueQuoteChar?: string;
    private valueEscaped?: boolean;

    constructor(line: number, character: number) {
        this.line = line;
        this.offset = character;
    }

    parseLine(lineText: string): PropertyRange[] {

        const propRanges: PropertyRange[] = [];

        for (let i = this.offset; i < lineText.length; ++i) {
            const ch = lineText[i];

            if (ch == '\\' && i == lineText.length - 1) {
                // line concatnation char - ignore.
                break;
            }

            switch (this.state) {
                case PropertyListParseState.BeforeName:
                    if (ch !== ' ' && ch !== '\t') {
                        this.nameBeginPos = new vscode.Position(this.line, i);
                        this.state = PropertyListParseState.InName;
                    }
                    break;

                case PropertyListParseState.InName:
                    assert(this.nameBeginPos);
                    if (ch == ' ' || ch == '=') {
                        this.nameEndPos = new vscode.Position(this.line, i);
                        this.state = (ch == ' ') ?
                            PropertyListParseState.AfterName :
                            PropertyListParseState.BeforeValue;
                    }
                    break;

                case PropertyListParseState.AfterName:
                    assert(this.nameBeginPos);
                    assert(this.nameEndPos);
                    if (ch == '=') {
                        this.state = PropertyListParseState.BeforeValue;
                    } else if (ch !== ' ' && ch !== '\t') {
                        // unexpected residue... report?
                    }
                    break;

                case PropertyListParseState.BeforeValue:
                    assert(this.nameBeginPos);
                    assert(this.nameEndPos);
                    if (ch !== ' ' && ch !== '\t') {
                        if (ch === "'" || ch === '"') {
                            this.valueEscaped = false;
                            this.valueQuoteChar = ch;
                        } else {
                            this.valueQuoteChar = undefined;
                        }
                        this.valueBeginPos = new vscode.Position(this.line, i);
                        this.state = PropertyListParseState.InValue;
                    }
                    break;

                case PropertyListParseState.InValue:
                    assert(this.nameBeginPos);
                    assert(this.nameEndPos);
                    assert(this.valueBeginPos);
                    if (this.valueQuoteChar) {
                        if (ch === '\\') {
                            this.valueEscaped = !this.valueEscaped;
                        } else if (ch === this.valueQuoteChar) {
                            if (!this.valueEscaped) {
                                this.valueEndPos = new vscode.Position(this.line, i + 1);
                                this.state = PropertyListParseState.AfterValue;
                            }
                        } else {
                            this.valueEscaped = false;
                        }
                    } else {
                        if (ch === ',' || ch === ' ' || ch === '\t') {
                            this.valueEndPos = new vscode.Position(this.line, i);
                            this.state = ch === ',' ?
                                PropertyListParseState.BeforeName :
                                PropertyListParseState.AfterValue;
                        }
                    }
                    // force value reading at EOL
                    if (!this.valueEndPos && i == lineText.length - 1) {
                        this.valueEndPos = new vscode.Position(this.line, i + 1);
                    }
                    break;

                case PropertyListParseState.AfterValue:
                    if (ch === ',') {
                        this.state = PropertyListParseState.BeforeName;
                    } else if (ch !== ' ' && ch !== '\t') {
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

        this.line += 1;
        this.offset = 0;

        return propRanges;
    }
}