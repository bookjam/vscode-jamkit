import { assert } from 'console';
import * as vscode from 'vscode';

export enum PropertyTarget {
    Unknown,
    Section,
    Object
}

export enum PropertyListParseState {
    BeforeName,
    InName,
    AfterName,
    BeforeValue,
    InValue,
    AfterValue
}

export interface PropertyListParseContext {
    offset: number;
    target: PropertyTarget;
    state: PropertyListParseState;

    nameBeginPos?: vscode.Position;
    nameEndPos?: vscode.Position;
    valueBeginPos?: vscode.Position;
    valueEndPos?: vscode.Position;
    valueQuoteChar?: string;
    valueEscaped?: boolean;
}

export interface PropertyRange {
    nameRange: vscode.Range;
    valueRange: vscode.Range;
}

export function parsePropertyList(line: number, lineText: string, context: PropertyListParseContext): PropertyRange[] {

    const propertRanges: PropertyRange[] = [];

    for (let i = context.offset; i < lineText.length; ++i) {
        const ch = lineText[i];

        if (ch == '\\' && i == lineText.length - 1) {
            // line concatnation char - ignore.
            break;
        }

        switch (context.state) {
            case PropertyListParseState.BeforeName:
                if (ch !== ' ' && ch !== '\t') {
                    context.nameBeginPos = new vscode.Position(line, i);
                    context.state = PropertyListParseState.InName;
                }
                break;

            case PropertyListParseState.InName:
                assert(context.nameBeginPos);
                if (ch == ' ' || ch == '=') {
                    context.nameEndPos = new vscode.Position(line, i);
                    context.state = (ch == ' ') ?
                        PropertyListParseState.AfterName :
                        PropertyListParseState.BeforeValue;
                }
                break;

            case PropertyListParseState.AfterName:
                assert(context.nameBeginPos);
                assert(context.nameEndPos);
                if (ch == '=') {
                    context.state = PropertyListParseState.BeforeValue;
                } else if (ch !== ' ' && ch !== '\t') {
                    // unexpected residue... report?
                }
                break;

            case PropertyListParseState.BeforeValue:
                assert(context.nameBeginPos);
                assert(context.nameEndPos);
                if (ch !== ' ' && ch !== '\t') {
                    if (ch === "'" || ch === '"') {
                        context.valueQuoteChar = ch;
                        context.valueEscaped = false;
                    }
                    context.valueBeginPos = new vscode.Position(line, i);
                    context.state = PropertyListParseState.InValue;
                }
                break;

            case PropertyListParseState.InValue:
                assert(context.nameBeginPos);
                assert(context.nameEndPos);
                assert(context.valueBeginPos);
                if (context.valueQuoteChar) {
                    if (ch === '\\') {
                        context.valueEscaped = !context.valueEscaped;
                    } else if (ch === context.valueQuoteChar) {
                        if (!context.valueEscaped) {
                            context.valueEndPos = new vscode.Position(line, i + 1);
                            context.state = PropertyListParseState.AfterValue;
                        }
                    } else {
                        context.valueEscaped = false;
                    }
                } else {
                    if (ch === ',' || ch === ' ' || ch === '\t') {
                        context.valueEndPos = new vscode.Position(line, i);
                        context.state = ch === ',' ?
                            PropertyListParseState.BeforeName :
                            PropertyListParseState.AfterValue;
                    }
                }

                if (!context.valueEndPos && i == lineText.length - 1) {
                    context.valueEndPos = new vscode.Position(line, i + 1);
                }
                break;

            case PropertyListParseState.AfterValue:
                if (ch === ',') {
                    context.state = PropertyListParseState.BeforeName;
                } else if (ch !== ' ' && ch !== '\t') {
                    // unexepcted residue... report?
                }
                break;
        }

        if (context.valueEndPos) {
            propertRanges.push({
                nameRange: new vscode.Range(context.nameBeginPos!, context.nameEndPos!),
                valueRange: new vscode.Range(context.valueBeginPos!, context.valueEndPos)

            });

            context.nameBeginPos = undefined;
            context.nameEndPos = undefined;
            context.valueBeginPos = undefined;
            context.valueEndPos = undefined;
            context.valueQuoteChar = undefined;
        }
    }

    return propertRanges;
}