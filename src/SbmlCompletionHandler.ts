import * as vscode from 'vscode';
import { CompletionItemProvider } from './CompletionItemProvider';
import { CompletionContextParser, PropGroupContext, PropListContext } from './CompletionContextParser';
import { SBML_PROP_LIST_PREFIX } from './patterns';
import { PropTarget, PropTargetKind } from './Attributes';

class SbmlCompletionContextParser extends CompletionContextParser {
    getPropListContext(): PropListContext | null {
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
            return { target, beginPos: new vscode.Position(line, beginIndex) };
        }
        return null;
    }

    getPropGroupContext(): PropGroupContext | null {
        return null;
    }
}

export class SbmlCompletionHandler {
    static register(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(
            'sbml',
            {
                provideCompletionItems(
                    document: vscode.TextDocument,
                    position: vscode.Position,
                    _token: vscode.CancellationToken,
                    context: vscode.CompletionContext
                ) {
                    const contextParser = new SbmlCompletionContextParser(document, position);
                    return new CompletionItemProvider(contextParser, document, position, context.triggerCharacter).provide();
                }
            },
            ':', ',', '='
        ));
    }
}