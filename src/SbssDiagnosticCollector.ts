import { DiagnosticCollector } from './DiagnosticCollector';
import {
    PropGroupParser,
    PropListParser,
    PropBlockParser,
} from './PropGroupParser';

const STYLE_DEFINITION_PATTERN = /^\s*(@root|(#|%)[\.\w\- ]+|\/[\/\.\w\- ]+)\s*(:|{)/;
const PROP_GROUP_END_PATTERN = /^\s*}/;

interface StyleDefinition {
    selector: string;
    isPropList: boolean; // true: property list, false: property group
}

export class SbssDiagnosticCollector extends DiagnosticCollector {

    private propParser: PropGroupParser | null = null;

    processLine(line: number, text: string, isContinued: boolean): void {

        if (this.propParser instanceof PropBlockParser) {
            if (text.match(PROP_GROUP_END_PATTERN)) {
                this.propParser = null;
            } else {
                this.propParser.parse(line, 0, text).forEach(
                    prop => this.verifyProperty(prop)
                );
            }
            return;
        }

        if (isContinued && this.propParser instanceof PropListParser) {
            this.propParser.parse(line, 0, text).forEach(
                property => this.verifyProperty(property)
            );
            return;
        }

        if (!isContinued) {
            const styleDef = this.parseStyleDefinition(text);
            if (styleDef) {
                if (styleDef.isPropList) {
                    this.propParser = new PropListParser();
                    this.propParser.parse(line, text.indexOf(':') + 1, text).forEach(
                        property => this.verifyProperty(property)
                    );
                } else {
                    this.propParser = new PropBlockParser();
                }
                return;
            }

            this.propParser = null;

            // TODO: do import/if/else related stuff
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