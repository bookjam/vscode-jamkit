import { DiagnosticCollector } from './DiagnosticCollector';
import {
    PropertyParser,
    PropertyListParser,
    PropertyGroupParser,
} from './PropertyParser';

const STYLE_DEFINITION_PATTERN = /^\s*(@root|(#|%)[\.\w\- ]+|\/[\/\.\w\- ]+)\s*(:|{)/;
const PROP_GROUP_END_PATTERN = /^\s*}/;

interface StyleDefinition {
    selector: string;
    isPropList: boolean; // true: property list, false: property group
}

export class SbssDiagnosticCollector extends DiagnosticCollector {

    private propParser: PropertyParser | null = null;

    processLine(line: number, text: string, isContinued: boolean): void {

        if (this.propParser instanceof PropertyGroupParser) {
            if (text.match(PROP_GROUP_END_PATTERN)) {
                this.propParser = null;
            } else {
                this.propParser.parse(line, 0, text).forEach(
                    property => this.verifyProperty(property)
                );
            }
            return;
        }

        if (isContinued && this.propParser instanceof PropertyListParser) {
            this.propParser.parse(line, 0, text).forEach(
                property => this.verifyProperty(property)
            );
            return;
        }

        if (!isContinued) {
            const styleDef = this.parseStyleDefinition(text);
            if (styleDef) {
                if (styleDef.isPropList) {
                    this.propParser = new PropertyListParser();
                    this.propParser.parse(line, text.indexOf(':') + 1, text).forEach(
                        property => this.verifyProperty(property)
                    );
                } else {
                    this.propParser = new PropertyGroupParser();
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