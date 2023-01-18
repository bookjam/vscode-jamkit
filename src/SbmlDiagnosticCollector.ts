import * as vscode from 'vscode';
import { Stack } from './Stack';

export class SbmlDiagnosticCollector {
    private readonly document: vscode.TextDocument;

    constructor(document: vscode.TextDocument) {
        this.document = document;
    }

    private sectionBeginPattern = /^\s*=begin(\s+([^(:|\s|$)]+))?/;
    private sectionEndPattern = /^\s*=end(\s+([^(\s|$)]+))?/;

    collect(): vscode.Diagnostic[] {

        const diagnostics: vscode.Diagnostic[] = [];

        const sectionTagStack = new Stack();

        enum LineKind {
            SectionBegin,
            SectionEnd,
            Object,
            Comment,
            Text
        }

        let isConnectedLine = false;
        let lineKind;
        for (let i = 0; i < this.document.lineCount; ++i) {
            const lineText = this.document.lineAt(i).text.trimStart();

            if (!isConnectedLine) {
                let m: RegExpMatchArray | null = lineText.match(this.sectionBeginPattern);
                if (m) {
                    lineKind = LineKind.SectionBegin;

                    const tag = m[2] ? m[2] : "";
                    sectionTagStack.push(tag);
                } else if (m = lineText.match(this.sectionEndPattern)) {
                    lineKind = LineKind.SectionEnd;

                    if (sectionTagStack.isEmpty()) {
                        diagnostics.push({
                            message: `no matching =begin`,
                            range: new vscode.Range(i, 0, i, lineText.length),
                            severity: vscode.DiagnosticSeverity.Warning,
                        });
                    } else {
                        const beginTag = sectionTagStack.pop();
                        const endTag = m[2];

                        if (endTag && beginTag != endTag) {
                            const endTagIndex = lineText.indexOf(endTag);
                            const endTagRange = new vscode.Range(i, endTagIndex, i, endTagIndex + endTag.length);
                            diagnostics.push({
                                message: `section tag mismatch: "${beginTag}" != "${endTag}"`,
                                range: endTagRange,
                                severity: vscode.DiagnosticSeverity.Warning,
                                // TODO: relatedInformation
                            });
                        }
                    }
                } else {
                    lineKind = LineKind.Text;
                }
            }

            // collect more diagnostics based on lineKind ...

            isConnectedLine = lineText.endsWith('\\');
        }

        return diagnostics;;
    }
}