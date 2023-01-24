import * as vscode from 'vscode';
import { SBSS_PROP_GROUP_PREFIX, SBSS_PROP_GROUP_SUFFIX, SBSS_PROP_LIST_PREFIX } from './patterns';
import { CompletionContextParser, PropGroupContext, PropListContext } from './CompletionContextParser';
import { CompletionItemProvider } from './CompletionItemProvider';

class SbssCompletionContextParser extends CompletionContextParser {
    getPropListContext(): PropListContext | null {
        const line = this.getLogicalLineBeginPos().line;
        const text = this.document.lineAt(line).text;
        const m = text.match(SBSS_PROP_LIST_PREFIX);
        if (m) {
            const beginIndex = text.indexOf(':') + 1;
            return { directive: m[1], beginPos: new vscode.Position(line, beginIndex) };
        }
        return null;
    }

    getPropGroupContext(): PropGroupContext | null {
        for (let pos = this.getLogicalLineBeginPos(); pos && pos.line > 0; pos = pos.with(pos.line - 1)) {
            const text = this.document.lineAt(pos.line).text;
            const m = text.match(SBSS_PROP_GROUP_PREFIX);
            if (m) {
                return { selector: m[1], beginPos: new vscode.Position(pos.line + 1, 0) };
            }
            if (SBSS_PROP_LIST_PREFIX.test(text) || SBSS_PROP_GROUP_SUFFIX.test(text)) {
                break;
            }
        }
        return null;
    }
}

export class SbssCompletionHandler {
    static register(context: vscode.ExtensionContext): void {
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(
            'sbss',
            {
                provideCompletionItems(
                    document: vscode.TextDocument,
                    position: vscode.Position,
                    _token: vscode.CancellationToken,
                    context: vscode.CompletionContext
                ) {
                    const contextParser = new SbssCompletionContextParser(document, position);
                    return new CompletionItemProvider(contextParser, document, position, context.triggerCharacter).provide();
                }
            },
            ':', ',', '='
        ));
    }
}