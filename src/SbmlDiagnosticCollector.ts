import * as vscode from 'vscode';
import { assert } from 'console';
import * as patterns from './patterns';
import { PropListParser } from './PropGroupParser';
import { DiagnosticCollector } from './DiagnosticCollector';
import { PropTarget, PropTargetKind } from "./PropTarget";
import { PropConfigStore } from './PropConfigStore';
import { MediaRepository } from './MediaRepository';

const IF_PATTERN = /^\s*=if\b/;
const ELIF_PATTERN = /^\s*=elif\b/;
const ELSE_PATTERN = /^\s*=else\b/;

enum DirectiveKind {
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

interface Directive {
    kind: DirectiveKind;
    tag?: string;
    propListIndex?: number;
}

enum LineKind {
    Text,
    Directive
}

interface Context {
    line: number;
    type: DirectiveKind.Begin | DirectiveKind.If;
    tag?: string;
    else_seen?: boolean; // used when type == DirectiveKind.If
}

// TODO: Use SbmlContextParser
export class SbmlDiagnosticCollector extends DiagnosticCollector {

    private readonly contextStack: Context[] = [];
    private propTarget: PropTarget | null = null;
    private propParser: PropListParser | null = null;
    private lineKind = LineKind.Text;

    processLine(line: number, text: string, isContinued: boolean): void {

        if (isContinued) {
            if (this.lineKind == LineKind.Directive) {
                if (this.propParser) {
                    this.propParser.parse(line, 0, text).forEach(
                        propRange => this.checkProp(this.propTarget!, propRange)
                    );
                    this.checkIfLineContinuationMarkerMissing(line, text);
                }
            } else {
                this.handleText(line, text);
            }
            return;
        }

        this.propTarget = null;
        this.propParser = null;

        const directive = this.parseDirective(text);

        this.lineKind = directive ? LineKind.Directive : LineKind.Text;

        if (directive) {
            this.lineKind = LineKind.Directive;

            this.handleDirective(directive, line, text);

            if (directive.propListIndex) {
                this.propTarget = toPropTarget(directive);
                this.propParser = new PropListParser();

                const offset = directive.propListIndex;
                this.propParser.parse(line, offset, text).forEach(
                    propRange => this.checkProp(this.propTarget!, propRange)
                );
                this.checkIfLineContinuationMarkerMissing(line, text);
            }
        }
        else {
            this.lineKind = LineKind.Text;
            this.handleText(line, text);
        }
    }

    private parseDirective(text: string): Directive | undefined {

        let m;

        if (m = text.match(patterns.SBML_PROP_LIST_PREFIX)) {
            const kind = (() => {
                if (m[1] == "begin")
                    return DirectiveKind.Begin;
                if (m[1] == "object")
                    return DirectiveKind.Object;
                if (m[1] == "image")
                    return DirectiveKind.Image;
                assert(m[1] == "style");
                return DirectiveKind.Style;
            })();

            const colonIndex = text.indexOf(':');
            const propListIndex = colonIndex > 0 ? colonIndex + 1 : undefined;
            return { kind, tag: m[2], propListIndex };
        }

        if (m = text.match(patterns.SBML_END)) {
            return { kind: DirectiveKind.End, tag: m[2] };
        }

        if (m = text.match(patterns.SBML_COMMENT)) {
            return { kind: DirectiveKind.Comment };
        }

        if (m = text.match(IF_PATTERN)) {
            return { kind: DirectiveKind.If };
        }

        if (m = text.match(ELIF_PATTERN)) {
            return { kind: DirectiveKind.Elif };
        }

        if (m = text.match(ELSE_PATTERN)) {
            return { kind: DirectiveKind.Else };
        }
    }

    private handleDirective(directive: Directive, line: number, text: string): void {

        if (directive.kind == DirectiveKind.Begin ||
            directive.kind == DirectiveKind.If) {
            this.contextStack.push({ line, type: directive.kind, tag: directive.tag });
        }
        else if (directive.kind == DirectiveKind.End) {

            const context = this.contextStack.pop();
            if (context) {
                assert(context.type == DirectiveKind.Begin || context.type == DirectiveKind.If);

                if (directive.tag && context.tag !== directive.tag) {

                    const endTagRange = (() => {
                        const lineText = text;
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
        else if (directive.kind == DirectiveKind.Object) {
            if (directive.tag != undefined && !PropConfigStore.getKnownObjectTypes().includes(directive.tag)) {
                const offset = text.indexOf(directive.tag, text.indexOf('=') + 7);
                this.addObjectTypeDiagnostic(directive.tag, line, offset);
            }
        }
        else if (directive.kind == DirectiveKind.Image) {
            if (directive.tag != undefined) {
                if (!MediaRepository.enumerateImageNames(this.document.fileName).includes(directive.tag)) {
                    const offset = text.indexOf(directive.tag, text.indexOf('=') + 6);
                    this.addImageNameDiagnostic(directive.tag, line, offset);
                }
            }
        }
        else {
            // TODO: ...
        }
    }

    // Check if the line continuation marker (`\`) is mistakely omitted.
    private checkIfLineContinuationMarkerMissing(line: number, text: string): void {

        if (line + 1 >= this.document.lineCount || !text.trimEnd().endsWith(',')) {
            return;
        }

        const nextLineText = this.document.lineAt(line + 1).text;
        const m = nextLineText.match(/\s+[a-z-]+\s*=/); // does it look like a continue propery list?
        if (m && m.index == 0) {
            this.diagnostics.push({
                message: `Is a line continuation marker ('\\') missing in the previous line?`,
                range: new vscode.Range(line + 1, 0, line + 1, nextLineText.length),
                severity: vscode.DiagnosticSeverity.Warning,
            });
        }
    }

    private handleText(line: number, text: string): void {

        let textOffset = 0;
        while (text.length > 0) {
            const m = /=\((object|image)\s+(([a-z]+|(~\/)?[\w\.-]+)?(\s*:)?)?/.exec(text);
            if (!m)
                break;

            const tag = m[3]; // tag == objectType or imageName
            const tagBeginIndex = text.indexOf(tag, m.index + 1 + m[1].length + 1);
            const tagEndIndex = tagBeginIndex + tag.length;
            if (m[1] === 'object') {
                if (!PropConfigStore.getKnownObjectTypes().includes(tag)) {
                    this.addObjectTypeDiagnostic(tag, line, textOffset + tagBeginIndex);
                }
            }
            else {
                assert(m[1] === 'image');
                const imageNames = MediaRepository.enumerateImageNames(this.document.fileName);
                if (!imageNames.includes(tag)) {
                    this.addImageNameDiagnostic(tag, line, textOffset + tagBeginIndex);
                }
            }

            const endMarkerIndex = text.indexOf(')=', tagEndIndex);

            // m[5] => (\s*:)
            if (m[5]) {
                const propBeginIndex = text.indexOf(':', tagEndIndex) + 1;
                const propEndIndex = endMarkerIndex >= 0 ? endMarkerIndex : text.length;
                const propListText = text.substring(0, propEndIndex);
                const propTarget = {
                    kind: PropTargetKind.InlineObject,
                    objectType: m[1] === 'object' ? tag : 'sbml:image'
                };
                const propListParser = new PropListParser();
                propListParser.parse(line, propBeginIndex, propListText).forEach(
                    propRange => this.checkProp(propTarget, propRange)
                );
            }

            if (endMarkerIndex < tagEndIndex)
                break;

            textOffset += endMarkerIndex + 2;
            text = text.substring(endMarkerIndex + 2);
        }
    }

    private addObjectTypeDiagnostic(objectType: string, line: number, offset: number) {
        this.diagnostics.push({
            message: `unknown object type: ${objectType}`,
            range: new vscode.Range(line, offset, line, offset + objectType.length),
            severity: vscode.DiagnosticSeverity.Error,
        });
    }

    private addImageNameDiagnostic(imageName: string, line: number, offset: number) {
        this.diagnostics.push({
            message: `image file cannot be found: ${imageName}`,
            range: new vscode.Range(line, offset, line, offset + imageName.length),
            severity: vscode.DiagnosticSeverity.Error,
        });
    }
}

function toPropTarget(directive: Directive): PropTarget {

    return {
        kind: directive.kind == DirectiveKind.Begin ?
            PropTargetKind.Section :
            (directive.kind == DirectiveKind.Object ?
                PropTargetKind.BlockObject :
                PropTargetKind.Unknown),
        objectType: directive.kind == DirectiveKind.Object ? directive.tag : undefined
    };
}