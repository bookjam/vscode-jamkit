import * as vscode from 'vscode';
import { PropConfigStore } from './PropConfigStore';
import { PropTarget, PropTargetKind } from "./PropTarget";
import { PropRange } from './PropGroupParser';
import { unquote } from './utils';

export abstract class DiagnosticCollector {
    protected readonly document: vscode.TextDocument;
    protected readonly diagnostics: vscode.Diagnostic[] = [];

    constructor(document: vscode.TextDocument) {
        this.document = document;
    }

    collect(): vscode.Diagnostic[] {

        this.diagnostics.length = 0;

        let isContinued = false;
        for (let i = 0; i < this.document.lineCount; ++i) {
            const text = this.document.lineAt(i).text;
            this.processLine(i, text, isContinued);
            isContinued = text.endsWith('\\');
        }

        return this.diagnostics;
    }

    abstract processLine(line: number, lineText: string, isContinued: boolean): void;

    analyseProp(target: PropTarget, propRange: PropRange): void {
        const name = this.document.getText(propRange.nameRange);
        const valueSpec = PropConfigStore.getPropValueSpec(target, name);

        if (!valueSpec) {
            // unknown property name for this target
            if (target.kind != PropTargetKind.Unknown) {
                const message = (() => {
                    switch (target.kind) {
                        case PropTargetKind.Section:
                            return `"${name}" might not be applicable to a section.`;
                        case PropTargetKind.BlockObject:
                        case PropTargetKind.InlineObject:
                            return `"${name}" might not be applicable to this object.`;
                    }
                    return `"${name}" might not be applicable here.`;
                })();
                this.diagnostics.push({
                    message,
                    range: new vscode.Range(propRange.nameRange.start, propRange.valueRange.end),
                    severity: vscode.DiagnosticSeverity.Warning
                });
            }
            return;
        }

        const value = unquote(this.document.getText(propRange.valueRange));
        if (value.startsWith('$') || (value.startsWith('@{') && value.startsWith('}'))) {
            // No diagnostic for a variable or a template placeholder.
            return;
        }

        const documentPath = this.document.fileName;
        const result = valueSpec.verify(value, documentPath);
        if (!result.success) {
            this.diagnostics.push({
                range: propRange.valueRange,
                message: result.errorMessage ?? `"${value}" is not valid for "${name}" here.`,
                severity: vscode.DiagnosticSeverity.Error
            });
        }
    }
}
