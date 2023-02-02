import * as vscode from 'vscode';
import { PropGroupKind } from './ContextParser';
import { SyntaxAnalyser } from './SyntaxAnalyser';
import { PropTarget, PropTargetKind } from "./PropTarget";
import { PropGroupParser, PropListParser, PropBlockParser } from './PropGroupParser';
import { SBSS_PROP_BLOCK_SUFFIX, SBSS_PROP_GROUP_PREFIX, parseSbssVariableDefinition } from './patterns';
import { assert } from 'console';
import { toColor } from './utils';

interface PropGroupBeginContext {
    kind: PropGroupKind;
    target: PropTarget;
}

// TODO: Use SbssContextParser
export class SbssSyntaxAnalyser extends SyntaxAnalyser {

    private propTarget: PropTarget | null = null;
    private propParser: PropGroupParser | null = null;

    processLine(line: number, text: string, isContinued: boolean): void {

        if (this.propParser instanceof PropBlockParser) {
            if (text.match(SBSS_PROP_BLOCK_SUFFIX)) {
                this.propParser = null;
            }
            else {
                assert(this.propTarget);
                this.propParser.parse(line, 0, text).forEach(
                    propRange => this.analyseProp(this.propTarget!, propRange)
                );
            }
            return;
        }

        if (isContinued && this.propParser instanceof PropListParser) {
            assert(this.propTarget);
            this.propParser.parse(line, 0, text).forEach(
                propRange => this.analyseProp(this.propTarget!, propRange)
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

        if (!isContinued) {
            const context = this.parsePropGroupPrefix(text);
            if (context) {
                this.propTarget = context.target;
                if (context.kind == PropGroupKind.List) {
                    this.propParser = new PropListParser();
                    this.propParser.parse(line, text.indexOf(':') + 1, text).forEach(
                        propRange => this.analyseProp(this.propTarget!, propRange)
                    );
                }
                else {
                    this.propParser = new PropBlockParser();
                }
                return;
            }

            this.propParser = null;

            // TODO: do import/if/else related stuff
        }
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
}