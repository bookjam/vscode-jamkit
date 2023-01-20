import * as vscode from 'vscode';
import { assert } from 'console';
import * as patterns from './patterns';
import { PropertyListParser } from './PropertyParser';
import { DiagnosticCollector } from './DiagnosticCollector';

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

export class SbmlDiagnosticCollector extends DiagnosticCollector {

    private readonly openContextStack: DirectiveContext[] = [];
    private propListParser: PropertyListParser | null = null;

    processLine(line: number, text: string, isContinued: boolean): void {

        let propListOffset = 0;
        if (!isContinued) {
            this.propListParser = null;

            const context = this.parseDirective(line, text);

            if (context) {
                this.handleContext(context);

                if (context.type == DirectiveType.Begin ||
                    context.type == DirectiveType.Object ||
                    context.type == DirectiveType.Style) {
                    const propListMarkerIndex = text.indexOf(':');
                    if (propListMarkerIndex > 0) {
                        propListOffset = propListMarkerIndex + 1;
                        this.propListParser = new PropertyListParser();
                    }
                }
            } else {
                // TODO: do text related stuff
            }
        }

        if (this.propListParser) {
            this.propListParser.parse(line, propListOffset, text).forEach(
                propRange => this.verifyProperty(propRange)
            );
        }
    }

    private parseDirective(line: number, lineText: string): DirectiveContext | undefined {

        let m;

        if (m = lineText.match(patterns.SBML_PROP_LIST_PREFIX)) {
            const type = (() => {
                if (m[1] == "begin")
                    return DirectiveType.Begin;
                if (m[1] == "object" || m[1] == "image")
                    return DirectiveType.Object;
                assert(m[1] == "style");
                return DirectiveType.Style;
            })();
            return { type, line, tag: m[3] };
        }

        if (m = lineText.match(patterns.SBML_END)) {
            return { type: DirectiveType.End, line, tag: m[2] };
        }

        if (m = lineText.match(patterns.SBML_COMMENT)) {
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
                    severity: vscode.DiagnosticSeverity.Error,
                });
            }
        }
        else {
            // TODO: ...
        }
    }
}
