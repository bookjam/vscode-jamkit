import { DiagnosticCollector } from './DiagnosticCollector';
import { PropertyListParser } from './PropertyParser';

const STYLE_DEFINITION_PATTERN = /^\s*(@root|(#|%)[\.\w\- ]+|\/[\/\.\w\- ]+)\s*(:|{)/;

interface StyleDefinition {
    selector: string;
    isPropList: boolean; // true: property list, false: property group
}

export class SbssDiagnosticCollector extends DiagnosticCollector {

    private propListParser: PropertyListParser | null = null;

    processLine(line: number, text: string, isContinued: boolean): void {

        if (!isContinued) {
            this.propListParser = null;

            const styleDef = this.parseStyleDefinition(text);
            if (styleDef) {
                if (styleDef.isPropList) {
                    this.propListParser = new PropertyListParser(line, text.indexOf(':') + 1);
                } else {
                    // TODO: start propGroupParser
                }
            } else {
                // TODO: do text related stuff
            }
        }

        if (this.propListParser) {
            this.propListParser.parseLine(text).forEach(
                propRange => this.verifyProperty(propRange)
            );
        }
    }

    private parseStyleDefinition(lineText: string): StyleDefinition | undefined {
        const m = lineText.match(STYLE_DEFINITION_PATTERN);
        if (m) {
            return { selector: m[1], isPropList: m[3] == ':' };
        }
        return undefined;
    }
}