import { assert } from 'console';
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

interface TagInfo {
    name: string;
    index: number;
}

interface DirectiveContext {
    line: number;
    type: DirectiveType;
    tag?: TagInfo;
}

interface DirectiveParseInfo {
    name: string;
    taggable: boolean;
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
        for (let i = 0; i < this.document.lineCount; ++i) {
            const lineText = this.document.lineAt(i).text.trimStart();

            if (!isConnectedLine) {
                const context = this.parseDirective(i, lineText);

                if (context) {
                    this.handleContext(context);
                } else {
                    // text 
                }
            }

            // collect more diagnostics based on lineKind ...

            isConnectedLine = lineText.endsWith('\\');
        }

        return this.diagnostics;
    }

    private parseDirective(line: number, lineText: string): DirectiveContext | undefined {

        const makeTagInfo = (matchArray: RegExpMatchArray, directiveOffset: number): TagInfo | undefined => {
            const name = matchArray[2] ? matchArray[2].trim() : undefined;
            if (name) {
                const leadingOffset = lineText.length - lineText.trimStart().length;
                const index = lineText.indexOf(name, leadingOffset + directiveOffset + 1);
                assert(index !== undefined);
                return { name, index };
            }
            return undefined;
        };

        let m;

        if (m = lineText.match(BEGIN_PATTERN)) {
            return { line, type: DirectiveType.Begin, tag: makeTagInfo(m, /*"=begin"*/ 6) };
        }
        if (m = lineText.match(END_PATTERN)) {
            return { line, type: DirectiveType.End, tag: makeTagInfo(m, /*"=end"*/ 4) };
        }
        if (m = lineText.match(OBJECT_PATTERN)) {
            return { line, type: DirectiveType.Object, tag: makeTagInfo(m, /*"=object"*/ 7) };
        }
        if (m = lineText.match(IMAGE_PATTERN)) {
            return { line, type: DirectiveType.Image, tag: makeTagInfo(m, /*"=image"*/ 6) };
        }
        if (m = lineText.match(STYLE_PATTERN)) {
            return { line, type: DirectiveType.Style, tag: makeTagInfo(m, /*"=style"*/ 5) };
        }
        if (m = lineText.match(COMMENT_PATTERN)) {
            return { line, type: DirectiveType.Comment };
        }
        if (m = lineText.match(IF_PATTERN)) {
            return { line, type: DirectiveType.If };
        }
        if (m = lineText.match(ELIF_PATTERN)) {
            return { line, type: DirectiveType.Elif };
        }
        if (m = lineText.match(ELSE_PATTERN)) {
            return { line, type: DirectiveType.Else };
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

                if (context.tag && openContext.tag?.name !== context.tag.name) {
                    const endTagRange = new vscode.Range(
                        context.line, context.tag.index,
                        context.line, context.tag.index + context.tag.name.length
                    );

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
                            `section tag mismatch: "${openContext.tag?.name ? openContext.tag?.name : ""}" != "${context.tag.name}"` :
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