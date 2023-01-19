import { assert } from 'console';
import * as vscode from 'vscode';
import { DiagnosticCollector } from './DiagnosticCollector';
import { getKnownAttributeValues } from './KnownAttributes';
import { PropertyListParser, PropertyRange } from './PropertyList';
import { stripQuote } from './utils';

const PROP_LIST_PATTERN = /^\s*(@root|(#|%)[\.\w- ]+|\/[\/\.\w- ]+)\s*:/;
//const PROP_GROUP_PATTERN = /^\s*(@root|(#|%)[\.\w- ]+|\/[\/\.\w- ]+)\s*{/;

interface StyleDefinition {
    selector: string;
    isPropList: boolean; // true: property list, false: property group
}

export class SbssDiagnosticCollector extends DiagnosticCollector {

    private propListParser: PropertyListParser | null = null;

    processLine(line: number, lineText: string, isContinued: boolean): void {

        if (!isContinued) {
            this.propListParser = null;

            const styleDef = this.parseStyleDefinition(lineText);
            if (styleDef) {
                if (styleDef.isPropList) {
                    this.propListParser = new PropertyListParser(line, lineText.indexOf(':') + 1);
                } else {
                    // TODO: start propGroupParser
                }
            } else {
                // TODO: do text related stuff
            }
        }

        if (this.propListParser) {
            this.propListParser.parseLine(lineText).forEach(
                propRange => this.verifyProperty(propRange)
            );
        }
    }

    private parseStyleDefinition(lineText: string): StyleDefinition | undefined {
        const m = lineText.match(PROP_LIST_PATTERN);
        if (m) {
            return { selector: m[1], isPropList: true };
        }
        return undefined;
    }
}