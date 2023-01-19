import { assert } from 'console';
import * as vscode from 'vscode';
import * as utils from './utils';

const BEGIN_PATTERN = /^\s*=begin(\s+([^:]+))?/;
const END_PATTERN = /^\s*=end(\s+(.+))?/;
const IF_PATTERN = /^\s*=if(\s+.+)?/;

enum DirectiveType {
    Begin,      // =begin
    End,        // =end
    Object,     // =object, =image
    Comment,    // =comment
    Style,      // =style
    If,         // =if
    Elif,       // =elif
    Else,       // =else
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

        const getTagIndex = (tag: string, directiveOffset: number): number => {
            const leadingSpeacesOffset = lineText.length - lineText.trimStart().length;
            const index = lineText.indexOf(tag, leadingSpeacesOffset + directiveOffset + 1);
            assert(index !== undefined);
            return index;
        };

        let m;

        if (m = lineText.match(BEGIN_PATTERN)) {
            const tag = m[2] ? { name: m[2], index: getTagIndex(m[2], /*"=begin"*/ 6) } : undefined;
            return { line, type: DirectiveType.Begin, tag };
        }

        if (m = lineText.match(END_PATTERN)) {
            const tag = m[2] ? { name: m[2], index: getTagIndex(m[2], /*"=end"*/ 4) } : undefined;
            return { line, type: DirectiveType.End, tag };
        }

        if (m = lineText.match(IF_PATTERN)) {
            return { line, type: DirectiveType.If };
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