import * as vscode from 'vscode';
import { ContextParser, ImageNameContext, PropGroupContext, PropGroupKind } from './ContextParser';
import { SBML_INLINE_OBJECT_PREFIX, SBML_PROP_LIST_PREFIX } from './patterns';
import { PropTarget, PropTargetKind } from "./PropTarget";

export class SbmlContextParser extends ContextParser {

    parsePropGroupContext(): PropGroupContext | null {
        const logicalBeginLine = this.getLogicalBeginLine();
        const logicalBeginLineText = this.document.lineAt(logicalBeginLine).text;

        // directives: =section, =object, =image, =style
        {
            const m = logicalBeginLineText.match(SBML_PROP_LIST_PREFIX);
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
                const beginIndex = logicalBeginLineText.indexOf(':') + 1;
                return { kind: PropGroupKind.List, target, beginPos: new vscode.Position(logicalBeginLine, beginIndex) };
            }
        }

        // inline objects: =(object, =(image
        {
            const text = (this.position.line == logicalBeginLine) ?
                logicalBeginLineText :
                this.getLineTextAt(this.position.line);
            const textUpToCurrentPos = text.substring(0, this.position.character);
            const objectBeginIndex = Math.max(
                textUpToCurrentPos.lastIndexOf('=(object '),
                textUpToCurrentPos.lastIndexOf('=(image ')
            );
            if (objectBeginIndex >= 0 && textUpToCurrentPos.lastIndexOf(')=') < objectBeginIndex) {
                const objectStr = textUpToCurrentPos.substring(objectBeginIndex);
                const m = objectStr.match(SBML_INLINE_OBJECT_PREFIX);
                if (m) {
                    const objectType = (m[1] == "object") ? m[2] : "sbml:image";
                    const target = { kind: PropTargetKind.InlineObject, objectType };
                    const beginPos = new vscode.Position(logicalBeginLine, objectBeginIndex + objectStr.indexOf(':') + 1);
                    return { kind: PropGroupKind.List, target, beginPos };
                }
            }
        }

        return null;
    }

    parseImageNameContext(): ImageNameContext | null {
        const textUpToCurrentPos = this.getTextFrom(this.position.with(undefined, 0));

        // check inline image

        const isContinuedLine = this.getLogicalBeginLine() < this.position.line;
        if (isContinuedLine) {
        }

        textUpToCurrentPos.trimEnd().endsWith('=(image');
        return null;
    }
}
