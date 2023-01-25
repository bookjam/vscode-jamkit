import * as vscode from 'vscode';
import { SBSS_PROP_BLOCK_PREFIX, SBSS_PROP_BLOCK_SUFFIX, SBSS_PROP_LIST_PREFIX } from './patterns';
import { CompletionContextParser, PropGroupContext, PropGroupKind } from './CompletionContextParser';
import { PropTarget, PropTargetKind } from './PropConfigStore';

export class SbssContextParser extends CompletionContextParser {

    parsePropGroupContext(): PropGroupContext | null {
        const line = this.getLogicalLineBeginPos().line;
        const text = this.document.lineAt(line).text;
        const m = text.match(SBSS_PROP_LIST_PREFIX);
        if (m) {
            return {
                kind: PropGroupKind.List,
                target: this.getPropTarget(m[1]),
                beginPos: new vscode.Position(line, text.indexOf(':') + 1)
            };
        }

        for (let pos = new vscode.Position(line - 1, 0); pos && pos.line > 0; pos = pos.with(pos.line - 1)) {
            const text = this.document.lineAt(pos.line).text;
            const m = text.match(SBSS_PROP_BLOCK_PREFIX);
            if (m) {
                return {
                    kind: PropGroupKind.Block,
                    target: this.getPropTarget(m[1]),
                    beginPos: new vscode.Position(pos.line + 1, 0)
                };
            }
            if (SBSS_PROP_LIST_PREFIX.test(text) || SBSS_PROP_BLOCK_SUFFIX.test(text)) {
                break;
            }
        }

        return null;
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
