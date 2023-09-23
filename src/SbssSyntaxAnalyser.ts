import * as vscode from 'vscode';
import { PropGroupKind } from './ContextParser';
import { SyntaxAnalyser } from './SyntaxAnalyser';
import { PropTarget, PropTargetKind } from "./PropTarget";
import { PropGroupParser, PropListParser, PropBlockParser } from './PropGroupParser';
import { SBSS_PROP_BLOCK_SUFFIX, SBSS_PROP_GROUP_PREFIX, parseSbssVariableDefinition } from './patterns';
import { existsReferredFile, toColor, unquote } from './utils';


interface PropGroupBeginContext {
    kind: PropGroupKind;
    target: PropTarget;
}

interface CondContext {
    ifLine: number;
    elseLine?: number;
}

// TODO: Use SbssContextParser
export class SbssSyntaxAnalyser extends SyntaxAnalyser {
    private readonly contextStack: CondContext[] = [];
    private propTarget: PropTarget = { kind: PropTargetKind.Unknown };
    private propParser: PropGroupParser | null = null;

    processLine(line: number, text: string, isContinued: boolean): void {
        if (this.propParser instanceof PropBlockParser) {
            if (text.match(SBSS_PROP_BLOCK_SUFFIX)) {
                this.propParser = null;
            }
            else {
                this.propParser.parse(line, 0, text).forEach(
                    propRange => this.analyseProp(this.propTarget, propRange)
                );
            }
            return;
        }

        if (isContinued && this.propParser instanceof PropListParser) {
            this.propParser.parse(line, 0, text).forEach(
                propRange => this.analyseProp(this.propTarget, propRange)
            );
            return;
        }

        const varDef = parseSbssVariableDefinition(text);
        if (varDef) {
            const color = toColor(varDef.value);
            if (color) {
                const index = text.indexOf(varDef.value);
                const range = new vscode.Range(line, index, line, index + varDef.value.length);
                this.colorInformations.push(new vscode.ColorInformation(range, color));
            }
            return;
        }

        if (isContinued) {
            return;
        }

        const context = this.parsePropGroupPrefix(text);
        if (context) {
            this.propTarget = context.target;
            if (context.kind == PropGroupKind.List) {
                this.propParser = new PropListParser();
                this.propParser.parse(line, text.indexOf(':') + 1, text).forEach(
                    propRange => this.analyseProp(this.propTarget, propRange)
                );
            }
            else {
                this.propParser = new PropBlockParser();
            }
            return;
        }

        this.propParser = null;

        if (this.parseImportDirective(line, text))
            return;

        if (this.parseCondDirective(line, text))
            return;
    }

    private parsePropGroupPrefix(text: string): PropGroupBeginContext | undefined {
        const m = text.match(SBSS_PROP_GROUP_PREFIX);
        if (m) {
            return {
                kind: m[3] == ':' ? PropGroupKind.List : PropGroupKind.Block,
                target: this.getPropTarget(m[1])
            };
        }
        return undefined;
    }

    private getPropTarget(selector: string): PropTarget {
        switch (selector[0]) {
            case '@':
            case '/':
            case '%':
                return { kind: PropTargetKind.Section };
            default:
                return { kind: PropTargetKind.Unknown };
        }
    }

    private parseImportDirective(line: number, text: string): boolean {
        const m = text.match(/^\s*import\s+.+$/);
        if (!m) {
            return false;
        }

        const importItem = text.substring(text.indexOf('import') + 7).trim();
        const importFilename = unquote(importItem);
        const getImportItemRange = () => {
            const index = text.indexOf(importItem);
            return new vscode.Range(line, index, line, index + importItem.length);
        };
        if (!importFilename.endsWith('.sbss')) {
            this.diagnostics.push({
                message: 'We can only import a file ".sbss" suffix.',
                range: getImportItemRange(),
                severity: vscode.DiagnosticSeverity.Error
            });
        }

        if (!existsReferredFile(this.document.fileName, importFilename)) {
            this.diagnostics.push({
                message: `"${importFilename}" does not exist.`,
                range: getImportItemRange(),
                severity: vscode.DiagnosticSeverity.Error
            });
        }

        return true;
    }

    private parseCondDirective(line: number, text: string): boolean {
        const m = text.match(/^\s*(if|elif|else|end)/);
        if (!m) {
            return false;
        }

        const directive = m[1];

        if (directive === 'if') {
            this.contextStack.push({ ifLine: line });

            // TODO: verify expression

            return true;
        }

        const condContext = this.contextStack.at(-1);
        if (!condContext) {
            // dangling elif/else/end!
            const index = text.indexOf(directive);
            this.diagnostics.push({
                message: `'${directive}' has no matching 'if'`,
                range: new vscode.Range(line, index, line, index + directive.length),
                severity: vscode.DiagnosticSeverity.Error
            });
            return true;
        }

        if (directive === 'end') {
            this.contextStack.pop();
            return true;
        }

        if (condContext.elseLine && (directive === 'elif' || directive === 'else')) {
            const relatedInfo = new vscode.DiagnosticRelatedInformation(
                new vscode.Location(
                    this.document.uri,
                    new vscode.Range(condContext.elseLine, 0, condContext.elseLine, 0)
                ),
                '"else" appeared here.'
            );
            const index = text.indexOf(directive);
            this.diagnostics.push({
                message: `'${directive}' cannot come after 'else'`,
                range: new vscode.Range(line, index, line, index + directive.length),
                severity: vscode.DiagnosticSeverity.Error,
                relatedInformation: [relatedInfo]
            });

            // fallthrough to handle else.
        }

        if (directive === 'else') {
            condContext.elseLine = line;
        }

        return true;
    }

}