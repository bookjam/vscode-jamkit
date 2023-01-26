import * as vscode from 'vscode';
import { ContextParser, PropGroupContext, PropGroupKind } from './ContextParser';
import { SBML_PROP_LIST_PREFIX } from './patterns';
import { PropTarget, PropTargetKind } from "./PropTarget";

export class SbmlContextParser extends ContextParser {
    parsePropGroupContext(): PropGroupContext | null {
        const line = this.getLogicalLineBeginPos().line;
        const text = this.document.lineAt(line).text;
        const m = text.match(SBML_PROP_LIST_PREFIX);
        if (m && m[3] == ':') {
            const target = ((): PropTarget => {
                if (m[1] == "begin")
                    return { kind: PropTargetKind.Section };
                if (m[1] == "object")
                    return { kind: PropTargetKind.BlockObject, objectType: m[2] };
                if (m[1] == "image")
                    return { kind: PropTargetKind.BlockObject, objectType: "sbml:image" };
                return { kind: PropTargetKind.Unknown };
            })();
            const beginIndex = text.indexOf(':') + 1;
            return { kind: PropGroupKind.List, target, beginPos: new vscode.Position(line, beginIndex) };
        }

        // Inline object property list
        // check if this is not a connected line
        if (line == this.position.line) {
            const textSoFar = text.substring(0, this.position.character);
            const objectBeginIndex = Math.max(
                textSoFar.lastIndexOf('=(object '),
                textSoFar.lastIndexOf('=(image ')
            );
            if (objectBeginIndex >= 0 && textSoFar.lastIndexOf(')=') < objectBeginIndex) {
                const objectStr = textSoFar.substring(objectBeginIndex);
                const m = objectStr.match(/(object|image)\s+([\.\w\-]+)\s*:/);
                if (m) {
                    const objectType = (m[1] == "object") ? m[2] : "sbml:image";
                    const target = { kind: PropTargetKind.InlineObject, objectType };
                    const beginPos = new vscode.Position(line, objectBeginIndex + objectStr.indexOf(':') + 1);
                    return { kind: PropGroupKind.List, target, beginPos };
                }
            }
        }

        return null;
    }
}
