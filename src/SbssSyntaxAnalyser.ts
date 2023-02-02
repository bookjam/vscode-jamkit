import { PropGroupKind } from './ContextParser';
import { DiagnosticCollector } from './DiagnosticCollector';
import { PropTarget, PropTargetKind } from "./PropTarget";
import {
    PropGroupParser,
    PropListParser,
    PropBlockParser,
} from './PropGroupParser';
import { SBSS_PROP_BLOCK_SUFFIX, SBSS_PROP_GROUP_PREFIX } from './patterns';
import { assert } from 'console';

interface PropGroupBeginContext {
    kind: PropGroupKind;
    target: PropTarget;
}

// TODO: Use SbssContextParser
export class SbssSyntaxAnalyser extends DiagnosticCollector {

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