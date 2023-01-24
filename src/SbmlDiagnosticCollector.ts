import * as vscode from 'vscode';
import { assert } from 'console';
import * as patterns from './patterns';
import { PropListParser } from './PropGroupParser';
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

interface Directive {
    type: DirectiveType;
    tag?: string;
}

interface Context {
    line: number;
    type: DirectiveType.Begin | DirectiveType.If;
    tag?: string;
    else_seen?: boolean; // used when type == DirectiveType.If
}

export class SbmlDiagnosticCollector extends DiagnosticCollector {

    private readonly contextStack: Context[] = [];
    private propParser: PropListParser | null = null;

    processLine(line: number, text: string, isContinued: boolean): void {

        if (!isContinued) {
            this.propParser = null;

            const context = this.parseDirective(text);

            if (context) {
                this.handleDirective(line, context);

                if (canHavePropList(context.type)) {
                    const propListMarkerIndex = text.indexOf(':');
                    if (propListMarkerIndex > 0) {
                        this.propParser = new PropListParser();

                        const offset = propListMarkerIndex + 1;
                        this.propParser.parse(line, offset, text).forEach(
                            propRange => this.verifyProperty(propRange)
                        );
                        return;
                    }
                }
            } else {
                // TODO: do text related stuff
            }
        }

        if (this.propParser) {
            this.propParser.parse(line, 0, text).forEach(
                propRange => this.verifyProperty(propRange)
            );
        }
    }

    private parseDirective(lineText: string): Directive | undefined {

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
            return { type, tag: m[3] };
        }

        if (m = lineText.match(patterns.SBML_END)) {
            return { type: DirectiveType.End, tag: m[2] };
        }

        if (m = lineText.match(patterns.SBML_COMMENT)) {
            return { type: DirectiveType.Comment };
        }

        if (m = lineText.match(IF_PATTERN)) {
            return { type: DirectiveType.If };
        }

        if (m = lineText.match(ELIF_PATTERN)) {
            return { type: DirectiveType.Elif };
        }

        if (m = lineText.match(ELSE_PATTERN)) {
            return { type: DirectiveType.Else };
        }
    }

    private handleDirective(line: number, directive: Directive): void {

        if (directive.type == DirectiveType.Begin || directive.type == DirectiveType.If) {
            this.contextStack.push({ line, type: directive.type, tag: directive.tag });
        }
        else if (directive.type == DirectiveType.End) {
            const context = this.contextStack.pop();

            if (context) {
                assert(context.type == DirectiveType.Begin || context.type == DirectiveType.If);

                if (directive.tag && context.tag !== directive.tag) {

                    const endTagRange = ((): vscode.Range => {
                        const lineText = this.document.lineAt(line).text;
                        const leadingOffset = lineText.length - lineText.trimStart().length;
                        const endTagIndex = lineText.indexOf(directive.tag, leadingOffset + 5);
                        assert(endTagIndex !== undefined);
                        return new vscode.Range(
                            line, endTagIndex,
                            line, endTagIndex + directive.tag.length
                        );
                    })();
                    const relatedInfo = new vscode.DiagnosticRelatedInformation(
                        new vscode.Location(
                            this.document.uri,
                            new vscode.Range(line, 0, line, 0)
                        ),
                        context.type == DirectiveType.Begin ?
                            'the section starts here' : 'if statement starts here'
                    );
                    this.diagnostics.push({
                        message: context.type == DirectiveType.Begin ?
                            `section tag mismatch: "${context.tag ? context.tag : ""}" != "${directive.tag}"` :
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
                    range: new vscode.Range(line, 0, line, /*eol*/999),
                    severity: vscode.DiagnosticSeverity.Error,
                });
            }
        }
        else {
            // TODO: ...
        }
    }
}

function canHavePropList(type: DirectiveType): boolean {
    return type == DirectiveType.Begin || type == DirectiveType.Object || type == DirectiveType.Style;
}