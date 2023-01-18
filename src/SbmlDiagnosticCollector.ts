import * as vscode from 'vscode';
import { Stack } from './Stack';

interface SectionInfo {
    line: number;
    tag: string;
}
export class SbmlDiagnosticCollector {
    private readonly document: vscode.TextDocument;

    constructor(document: vscode.TextDocument) {
        this.document = document;
    }

    private sectionBeginPattern = /^\s*=begin(\s+([^(:|\s|$)]+))?/;
    private sectionEndPattern = /^\s*=end(\s+([^(\s|$)]+))?/;

    collect(): vscode.Diagnostic[] {

        const diagnostics: vscode.Diagnostic[] = [];

        const sectionStack = new Stack<SectionInfo>();

        enum LineKind {
            Begin,
            End,
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
                    lineKind = LineKind.Begin;

                    sectionStack.push({ line: i, tag: m[2] ? m[2] : "" });
                } else if (m = lineText.match(this.sectionEndPattern)) {
                    lineKind = LineKind.End;

                    const sectionInfo = sectionStack.pop();
                    if (sectionInfo) {
                        const endTag = m[2];
                        if (endTag && sectionInfo.tag !== endTag) {
                            const endTagIndex = lineText.indexOf(endTag);
                            const endTagRange = new vscode.Range(i, endTagIndex, i, endTagIndex + endTag.length);
                            const beginInfo = new vscode.DiagnosticRelatedInformation(
                                new vscode.Location(
                                    this.document.uri,
                                    new vscode.Range(sectionInfo.line, 0, sectionInfo.line, 0)
                                ),
                                `section begin`
                            );
                            diagnostics.push({
                                message: `section tag mismatch: "${sectionInfo.tag}" != "${endTag}"`,
                                range: endTagRange,
                                severity: vscode.DiagnosticSeverity.Warning,
                                relatedInformation: [beginInfo]
                            });
                        }
                    } else {
                        diagnostics.push({
                            message: `no matching =begin`,
                            range: new vscode.Range(i, 0, i, lineText.length),
                            severity: vscode.DiagnosticSeverity.Warning,
                        });
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