import * as vscode from 'vscode';
import { SBSS_PROP_BLOCK_PREFIX, SBSS_PROP_BLOCK_SUFFIX, SBSS_PROP_LIST_PREFIX } from './patterns';
import { CompletionContextParser, PropGroupContext, PropGroupKind } from './CompletionContextParser';
import { CompletionItemProvider } from './CompletionItemProvider';
import { PropTargetKind } from './Attributes';

class SbssCompletionContextParser extends CompletionContextParser {

    parsePropGroupContext(): PropGroupContext | null {
        const line = this.getLogicalLineBeginPos().line;
        const text = this.document.lineAt(line).text;
        const m = text.match(SBSS_PROP_LIST_PREFIX);
        if (m) {
            const target = (() => {
                const selector = m[1];
                switch (selector[0]) {
                    case '@':
                    case '/':
                    case '%':
                        return { kind: PropTargetKind.Section };
                    default:
                        return { kind: PropTargetKind.Unknown };
                }
            })();
            const beginPos = new vscode.Position(line, text.indexOf(':') + 1);
            return { kind: PropGroupKind.List, target, beginPos };
        }

        for (let pos = new vscode.Position(line - 1, 0); pos && pos.line > 0; pos = pos.with(pos.line - 1)) {
            const text = this.document.lineAt(pos.line).text;
            const m = text.match(SBSS_PROP_BLOCK_PREFIX);
            if (m) {
                const target = (() => {
                    const selector = m[1];
                    switch (selector[0]) {
                        case '@':
                        case '/':
                        case '%':
                            return { kind: PropTargetKind.Section };
                        default:
                            return { kind: PropTargetKind.Unknown };
                    }
                })();
                const beginPos = new vscode.Position(pos.line + 1, 0);
                return { kind: PropGroupKind.Block, target, beginPos };
            }
            if (SBSS_PROP_LIST_PREFIX.test(text) || SBSS_PROP_BLOCK_SUFFIX.test(text)) {
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