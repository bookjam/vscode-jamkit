import * as vscode from 'vscode';
import { PropCompletionItemProvider } from './PropCompletionItemProvider';
import { SbmlContextParser } from './SbmlContextParser';


// TODO: read this from object-*.json
const OBJECT_TYPES = ["tabbar",
    "section",
    "sbml",
    "sbmls",
    "image",
    "label",
    "button",
    "textfield",
    "text",
    "checkbox",
    "choices",
    "progress",
    "slider",
    "timer",
    "input",
    "point",
    "drawing",
    "photo",
    "photozoom",
    "photoplus",
    "photoroll",
    "photoscroll",
    "multiphoto",
    "map",
    "minimap",
    "audio",
    "video",
    "webvideo",
    "youtube",
    "twitch",
    "vimeo",
    "webtoon",
    "web",
    "comic",
    "pdf",
    "sprite",
    "effect",
    "animation",
    "chart",
    "camera",
    "blank",
    "editor",
    "image.qrcode",
    "record",
    "epub",
    "ad",
    "node",
    "hub",
    "spoke"];

function shouldSuggestDirectives(document: vscode.TextDocument, position: vscode.Position, context: vscode.CompletionContext): boolean {
    return (
        context.triggerCharacter == '=' &&
        document.lineAt(position.line).text.trim() == '=' &&
        (
            position.line == 0 ||
            !document.lineAt(position.line - 1).text.endsWith('\\')
        )
    );
}

function getDirectiveCompletionItems() {

    return ['begin', 'end', 'object', 'comment', 'style', 'if', 'else', 'elif'].map(directive => {
        const item = new vscode.CompletionItem(directive, vscode.CompletionItemKind.Keyword);
        if (directive == 'object') {
            item.insertText = new vscode.SnippetString('object ${1|' + OBJECT_TYPES.join(',') + '|}: ');
        }
        return item;
    }
    );
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
                    if (shouldSuggestDirectives(document, position, context)) {
                        return getDirectiveCompletionItems();
                    }

                    const contextParser = new SbmlContextParser(document, position);
                    return new PropCompletionItemProvider(contextParser, document, position, context.triggerCharacter).provide();
                }
            },
            ':', ',', '='
        ));
    }
}