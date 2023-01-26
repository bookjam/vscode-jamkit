import * as vscode from 'vscode';
import { assert } from 'console';
import * as patterns from './patterns';
import { PropListParser } from './PropGroupParser';
import { DiagnosticCollector } from './DiagnosticCollector';
import { PropTarget, PropTargetKind } from "./PropTarget";

const IF_PATTERN = /^\s*=if\b/;
const ELIF_PATTERN = /^\s*=elif\b/;
const ELSE_PATTERN = /^\s*=else\b/;

enum DirectiveKind {
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
    kind: DirectiveKind;
    tag?: string;
}

interface Context {
    line: number;
    type: DirectiveKind.Begin | DirectiveKind.If;
    tag?: string;
    else_seen?: boolean; // used when type == DirectiveKind.If
}

export class SbmlDiagnosticCollector extends DiagnosticCollector {

    private readonly contextStack: Context[] = [];
    private propTarget: PropTarget | null = null;
    private propParser: PropListParser | null = null;

    processLine(line: number, text: string, isContinued: boolean): void {

        if (!isContinued) {
            this.propParser = null;

            const context = this.parseDirective(text);

            if (context) {
                this.handleDirective(line, context);

                if (canHavePropList(context.kind)) {
                    const propListMarkerIndex = text.indexOf(':');
                    if (propListMarkerIndex > 0) {
                        this.propParser = new PropListParser();

                        const offset = propListMarkerIndex + 1;
                        this.propTarget = {
                            kind: context.kind == DirectiveKind.Begin ?
                                PropTargetKind.Section :
                                (context.kind == DirectiveKind.Object ?
                                    PropTargetKind.BlockObject :
                                    PropTargetKind.Unknown),
                            objectType: context.kind == DirectiveKind.Object ? context.tag : undefined
                        };
                        this.propParser.parse(line, offset, text).forEach(
                            propRange => this.verifyProperty(this.propTarget!, propRange)
                        );
                        return;
                    }
                }
            }
            else {
                // TODO: do text related stuff
            }
        }

        if (this.propParser) {
            this.propParser.parse(line, 0, text).forEach(
                propRange => this.verifyProperty(this.propTarget!, propRange)
            );
        }
    }

    private parseDirective(lineText: string): Directive | undefined {

        let m;

        if (m = lineText.match(patterns.SBML_PROP_LIST_PREFIX)) {
            const type = (() => {
                if (m[1] == "begin")
                    return DirectiveKind.Begin;
                if (m[1] == "object" || m[1] == "image")
                    return DirectiveKind.Object;
                assert(m[1] == "style");
                return DirectiveKind.Style;
            })();
            return { kind: type, tag: m[2] };
        }

        if (m = lineText.match(patterns.SBML_END)) {
            return { kind: DirectiveKind.End, tag: m[2] };
        }

        if (m = lineText.match(patterns.SBML_COMMENT)) {
            return { kind: DirectiveKind.Comment };
        }

        if (m = lineText.match(IF_PATTERN)) {
            return { kind: DirectiveKind.If };
        }

        if (m = lineText.match(ELIF_PATTERN)) {
            return { kind: DirectiveKind.Elif };
        }

        if (m = lineText.match(ELSE_PATTERN)) {
            return { kind: DirectiveKind.Else };
        }
    }

    private handleDirective(line: number, directive: Directive): void {

        if (directive.kind == DirectiveKind.Begin || directive.kind == DirectiveKind.If) {
            this.contextStack.push({ line, type: directive.kind, tag: directive.tag });
        }
        else if (directive.kind == DirectiveKind.End) {
            const context = this.contextStack.pop();

            if (context) {
                assert(context.type == DirectiveKind.Begin || context.type == DirectiveKind.If);

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
                        context.type == DirectiveKind.Begin ?
                            'the section starts here' : 'if statement starts here'
                    );
                    this.diagnostics.push({
                        message: context.type == DirectiveKind.Begin ?
                            `section tag mismatch: "${context.tag ? context.tag : ""}" != "${directive.tag}"` :
                            "if statment can't have an ending tag",
                        range: endTagRange,
                        severity: vscode.DiagnosticSeverity.Warning,
                        relatedInformation: [relatedInfo]
                    });
                }
            }
            else {
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

function canHavePropList(type: DirectiveKind): boolean {
    return type == DirectiveKind.Begin || type == DirectiveKind.Object || type == DirectiveKind.Style;
}