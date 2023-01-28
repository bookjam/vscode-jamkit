import * as vscode from 'vscode';
import { ContextParser, PropGroupContext, PropGroupKind } from './ContextParser';
import { SBML_INLINE_OBJECT_PREFIX, SBML_PROP_LIST_PREFIX } from './patterns';
import { PropTarget, PropTargetKind } from "./PropTarget";

export class DirectiveContext {
    readonly prefix;
    constructor(prefix?: string) {
        this.prefix = prefix;
    }
}
export class ImageNameContext {
    readonly prefix;
    constructor(prefix?: string) {
        this.prefix = prefix;
    }
}

export class ObjectTypeContext {
    readonly prefix;
    constructor(prefix?: string) {
        this.prefix = prefix;
    }
}
export class SbmlContextParser extends ContextParser {

    parsePropGroupContext(): PropGroupContext | undefined {
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
            const textUpToCursor = text.substring(0, this.position.character);
            const objectBeginIndex = Math.max(
                textUpToCursor.lastIndexOf('=(object '),
                textUpToCursor.lastIndexOf('=(image ')
            );
            if (objectBeginIndex >= 0 && textUpToCursor.lastIndexOf(')=') < objectBeginIndex) {
                const objectStr = textUpToCursor.substring(objectBeginIndex);
                const m = objectStr.match(SBML_INLINE_OBJECT_PREFIX);
                if (m) {
                    const objectType = (m[1] == "object") ? m[2] : "sbml:image";
                    const target = { kind: PropTargetKind.InlineObject, objectType };
                    const beginPos = new vscode.Position(logicalBeginLine, objectBeginIndex + objectStr.indexOf(':') + 1);
                    return { kind: PropGroupKind.List, target, beginPos };
                }
            }
        }
    }

    parseDirectiveContext(): DirectiveContext | undefined {
        if (this.getLogicalBeginLine() == this.position.line) {
            const text = this.getLineTextAt(this.position.line).substring(0, this.position.character).trimStart();

            // begin, end, object, image, style, if, elif, else, comment
            const m = text.match(/^=([a-z]*)$/);
            if (m) {
                return new DirectiveContext(m[1]);
            }
        }
    }

    parseObjectTypeContext(): ObjectTypeContext | ImageNameContext | undefined {
        const textUpToCursor = this.getLineTextAt(this.position.line).substring(0, this.position.character);
        const trimmedText = textUpToCursor.trim();

        const parseContext = (marker: string, contextClass: { new(prefix?: string): ImageNameContext | ObjectTypeContext; }) => {
            if (trimmedText.endsWith(marker)) {
                return new contextClass();
            }
            const items = trimmedText.split(' ');
            if (items.length >= 2) {
                const prefix = items.pop();
                while (items.at(-1) == '') {
                    items.pop();
                }
                if (items.at(-1)?.endsWith(marker)) {
                    const context = new contextClass(prefix);
                    return context;
                }
            }
        };

        let context = parseContext('=(image', ImageNameContext);
        if (context)
            return context;

        context = parseContext('=(object', ObjectTypeContext);
        if (context)
            return context;

        const isContinuedLine = this.getLogicalBeginLine() < this.position.line;
        if (!isContinuedLine) {
            if (trimmedText.startsWith("=image")) {
                return parseContext('=image', ImageNameContext);
            }
            if (trimmedText.startsWith("=object")) {
                return parseContext('=object', ObjectTypeContext);
            }
        }
    }
}
