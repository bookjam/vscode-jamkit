import * as vscode from 'vscode';
import { getKnownAttributeValues } from './KnownAttributes';
import { PropertyListParser, PropertyRange } from './PropertyList';
import { stripQuote } from './utils';

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

    verifyProperty(propRange: PropertyRange): void {
        const name = this.document.getText(propRange.nameRange);
        const value = stripQuote(this.document.getText(propRange.valueRange));

        const knownValues = getKnownAttributeValues(name);

        if (knownValues && !knownValues.includes(value)) {
            this.diagnostics.push({
                message: `"${value}" is not a valid value for "${name}"`,
                range: propRange.valueRange,
                severity: vscode.DiagnosticSeverity.Error
            });
        }
    }
}