import { assert } from 'console';
import { setFlagsFromString } from 'v8';
import * as vscode from 'vscode';

const BEGIN_PATTERN = /^\s*=begin(\s+([^:]+))?/;
const END_PATTERN = /^\s*=end(\s+(.+))?/;
const OBJECT_PATTERN = /^\s*=object(\s+([^:]+))?/;
const IMAGE_PATTERN = /^\s*=image(\s+([^:]+))?/;
const STYLE_PATTERN = /^\s*=style(\s+([^:]+))?/;
const COMMENT_PATTERN = /^\s*=comment\b/;
const IF_PATTERN = /^\s*=if\b/;
const ELIF_PATTERN = /^\s*=elif\b/;
const ELSE_PATTERN = /^\s*=else\b/;

enum DirectiveType {
    Begin,
    End,
    Object,
    Image,
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
        let directiveType: DirectiveType | undefined;
        for (let i = 0; i < this.document.lineCount; ++i) {
            const lineText = this.document.lineAt(i).text;

            if (!isConnectedLine) {
                const context = this.parseDirective(i, lineText);

                if (context) {
                    directiveType = context.type;
                    this.handleContext(context);
                } else {
                    directiveType = undefined;
                }
            }

            if (directiveType == DirectiveType.Begin ||
                directiveType == DirectiveType.Object ||
                directiveType == DirectiveType.Image ||
                directiveType == DirectiveType.Style) {

                const propertListOffset = isConnectedLine ? 0 : (lineText.indexOf(':') + 1);
            }

            // collect more diagnostics based on lineKind ...

            isConnectedLine = lineText.endsWith('\\');
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
        if (m = lineText.match(IMAGE_PATTERN)) {
            return { type: DirectiveType.Image, line, tag: m[2] };
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
}