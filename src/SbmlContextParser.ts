import * as vscode from 'vscode';
import { ContextParser, PropGroupContext, PropGroupKind } from './ContextParser';
import { SBML_PROP_LIST_PREFIX } from './patterns';
import { PropTarget, PropTargetKind } from './PropConfigStore';

export class SbmlContextParser extends ContextParser {
    parsePropGroupContext(): PropGroupContext | null {
        const line = this.getLogicalLineBeginPos().line;
        const text = this.document.lineAt(line).text;
        const m = text.match(SBML_PROP_LIST_PREFIX);
        if (m && m[4] == ':') {
            const target = ((): PropTarget => {
                if (m[1] == "begin")
                    return { kind: PropTargetKind.Section };
                if (m[1] == "object")
                    return { kind: PropTargetKind.BlockObject, objectType: m[3] };
                if (m[1] == "image")
                    return { kind: PropTargetKind.BlockObject, objectType: "sbml:image" };
                return { kind: PropTargetKind.Unknown };
            })();
            const beginIndex = text.indexOf(':') + 1;
            return { kind: PropGroupKind.List, target, beginPos: new vscode.Position(line, beginIndex) };
        }
        return null;
    }
}
