import { assert } from 'console';
import * as vscode from 'vscode';
import { getKnownAttributeValues } from './KnownAttributes';

const BEGIN_PATTERN = /^\s*=begin(\s+([^:]+))?/;
const END_PATTERN = /^\s*=end(\s+(.+))?/;
const OBJECT_PATTERN = /^\s*=(object|image)(\s+([^:]+))?/;
const STYLE_PATTERN = /^\s*=style(\s+([^:]+))?/;
const COMMENT_PATTERN = /^\s*=comment\b/;
const IF_PATTERN = /^\s*=if\b/;
const ELIF_PATTERN = /^\s*=elif\b/;
const ELSE_PATTERN = /^\s*=else\b/;

enum DirectiveType {
    Begin,
    End,
    Object,
    Style,
    Comment,
    If,
    Elif,
    Else,
}

interface DirectiveContext {
    type: DirectiveType;
    line: number;
    tag?: string;
}

enum PropertyTarget {
    Unknown,
    Section,
    Object
}

function toPropertyTarget(directiveType: DirectiveType): PropertyTarget {
    if (directiveType == DirectiveType.Begin)
        return PropertyTarget.Section;
    if (directiveType == DirectiveType.Object)
        return PropertyTarget.Object;
    assert(directiveType === DirectiveType.Style);
    return PropertyTarget.Unknown;
}

enum PropertyListParseState {
    BeforeName,
    InName,
    AfterName,
    BeforeValue,
    InValue,
    AfterValue
}

interface PropertyListParseContext {
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

export class SbmlDiagnosticCollector {
    private readonly document: vscode.TextDocument;
    private readonly diagnostics: vscode.Diagnostic[] = [];
    private readonly openContextStack: DirectiveContext[] = [];

    constructor(document: vscode.TextDocument) {
        this.document = document;
    }

    collect(): vscode.Diagnostic[] {

        this.diagnostics.length = 0;
        this.openContextStack.length = 0;

        let isConnectedLine = false;
        let propListParseContext: PropertyListParseContext | null = null;

        for (let i = 0; i < this.document.lineCount; ++i) {
            const lineText = this.document.lineAt(i).text;

            if (!isConnectedLine) {
                const context = this.parseDirective(i, lineText);

                if (context) {
                    this.handleContext(context);

                    if (context.type == DirectiveType.Begin ||
                        context.type == DirectiveType.Object ||
                        context.type == DirectiveType.Style) {
                        const propertyListMarkerIndex = lineText.indexOf(':');
                        if (propertyListMarkerIndex > 0) {
                            propListParseContext = {
                                offset: propertyListMarkerIndex + 1,
                                target: toPropertyTarget(context.type),
                                state: PropertyListParseState.BeforeName
                            };
                        }
                    }
                } else {
                    // TODO: do text related stuff
                }
            }

            if (propListParseContext) {
                if (isConnectedLine) {
                    propListParseContext.offset = 0;
                }
                this.parsePropertyList(i, lineText, propListParseContext);
            }

            // collect more diagnostics based on lineKind ...

            isConnectedLine = lineText.endsWith('\\');

            if (!isConnectedLine) {
                propListParseContext = null;
            }
        }

        return this.diagnostics;
    }

    private parseDirective(line: number, lineText: string): DirectiveContext | undefined {

        let m;

        if (m = lineText.match(BEGIN_PATTERN)) {
            return { type: DirectiveType.Begin, line, tag: m[2] };
        }
        if (m = lineText.match(END_PATTERN)) {
            return { type: DirectiveType.End, line, tag: m[2] };
        }
        if (m = lineText.match(OBJECT_PATTERN)) {
            return { type: DirectiveType.Object, line, tag: m[2] };
        }
        if (m = lineText.match(STYLE_PATTERN)) {
            return { type: DirectiveType.Style, line, tag: m[2] };
        }
        if (m = lineText.match(COMMENT_PATTERN)) {
            return { type: DirectiveType.Comment, line };
        }
        if (m = lineText.match(IF_PATTERN)) {
            return { type: DirectiveType.If, line };
        }
        if (m = lineText.match(ELIF_PATTERN)) {
            return { type: DirectiveType.Elif, line };
        }
        if (m = lineText.match(ELSE_PATTERN)) {
            return { type: DirectiveType.Else, line };
        }

        return undefined;
    }

    private handleContext(context: DirectiveContext): void {

        if (context.type == DirectiveType.Begin || context.type == DirectiveType.If) {
            this.openContextStack.push(context);
        }
        else if (context.type == DirectiveType.End) {
            const openContext = this.openContextStack.pop();

            if (openContext) {
                assert(openContext.type == DirectiveType.Begin || openContext.type == DirectiveType.If);

                if (context.tag && openContext.tag !== context.tag) {

                    const endTagRange = ((): vscode.Range => {
                        const lineText = this.document.lineAt(context.line).text;
                        const leadingOffset = lineText.length - lineText.trimStart().length;
                        const endTagIndex = lineText.indexOf(context.tag, leadingOffset + 5);
                        assert(endTagIndex !== undefined);
                        return new vscode.Range(
                            context.line, endTagIndex,
                            context.line, endTagIndex + context.tag.length
                        );
                    })();
                    const relatedInfo = new vscode.DiagnosticRelatedInformation(
                        new vscode.Location(
                            this.document.uri,
                            new vscode.Range(context.line, 0, context.line, 0)
                        ),
                        openContext.type == DirectiveType.Begin ?
                            'the section starts here' : 'if statement starts here'
                    );
                    this.diagnostics.push({
                        message: openContext.type == DirectiveType.Begin ?
                            `section tag mismatch: "${openContext.tag ? openContext.tag : ""}" != "${context.tag}"` :
                            "if statment can't have an ending tag",
                        range: endTagRange,
                        severity: vscode.DiagnosticSeverity.Warning,
                        relatedInformation: [relatedInfo]
                    });
                }
            } else {
                // dangling =end directive
                this.diagnostics.push({
                    message: `no matching =begin`,
                    range: new vscode.Range(context.line, 0, context.line, /*eol*/999),
                    severity: vscode.DiagnosticSeverity.Warning,
                });
            }
        }
        else {
            // TODO: ...
        }
    }

    private parsePropertyList(line: number, lineText: string, context: PropertyListParseContext): void {

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
                this.checkPropertyDiagnostic(
                    new vscode.Range(context.nameBeginPos!, context.nameEndPos!),
                    new vscode.Range(context.valueBeginPos!, context.valueEndPos)
                );

                context.nameBeginPos = undefined;
                context.nameEndPos = undefined;
                context.valueBeginPos = undefined;
                context.valueEndPos = undefined;
                context.valueQuoteChar = undefined;
            }
        }
    }

    // This doesn't handle escaped characters properly but that's ok here.
    private quoteStripped(value: string): string {
        if (value.length >= 2 && value[0] == value[value.length - 1] && (value[0] == '"' || value[0] == "'")) {
            return value.substring(1, value.length - 1);
        }
        return value;
    }

    private checkPropertyDiagnostic(nameRange: vscode.Range, valueRange: vscode.Range): void {
        const name = this.document.getText(nameRange);
        const value = this.quoteStripped(this.document.getText(valueRange));

        const knownValues = getKnownAttributeValues(name);

        if (knownValues && !knownValues.includes(value)) {
            this.diagnostics.push({
                message: `"${value}" is not a valid value for "${name}"`,
                range: valueRange,
                severity: vscode.DiagnosticSeverity.Error
            });
        }
    }
}

