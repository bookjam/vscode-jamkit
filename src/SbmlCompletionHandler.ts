import * as vscode from 'vscode';
import { PropCompletionItemProvider } from './PropCompletionItemProvider';
import { SbmlContextParser } from './SbmlContextParser';
import { ImageStore } from './ImageStore';
import { PropContext } from './ContextParser';


// TODO: read this from object-*.json
const OBJECT_TYPES = [
    "ad",
    "animation",
    "audio",
    "blank",
    "button",
    "camera",
    "chart",
    "checkbox",
    "choices",
    "comic",
    "drawing",
    "editor",
    "effect",
    "epub",
    "hub",
    "image.qrcode",
    "image",
    "input",
    "label",
    "map",
    "minimap",
    "multiphoto",
    "node",
    "pdf",
    "photo",
    "photoplus",
    "photoroll",
    "photoscroll",
    "photozoom",
    "point",
    "progress",
    "record",
    "sbml",
    "sbmls",
    "section",
    "slider",
    "spoke",
    "sprite",
    "tabbar",
    "text",
    "textfield",
    "timer",
    "twitch",
    "video",
    "vimeo",
    "web",
    "webtoon",
    "webvideo",
    "youtube",
];

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
    });
}

function shouldSuggestInlineObject(document: vscode.TextDocument, position: vscode.Position, context: vscode.CompletionContext): boolean {
    return (
        context.triggerCharacter == '(' &&
        document.lineAt(position.line).text.substring(0, position.character).endsWith('=(')
    );
}

function getInlineObjectCompletionItems(document: vscode.TextDocument) {
    const objectItem = new vscode.CompletionItem("object", vscode.CompletionItemKind.Keyword);
    objectItem.insertText = new vscode.SnippetString('object ${1|' + OBJECT_TYPES.join(',') + '|}: ${2})=');
    objectItem.sortText = "1";

    const imageItem = new vscode.CompletionItem("image", vscode.CompletionItemKind.Keyword);
    const imageNames = ImageStore.enumerateImageNames(document.fileName);
    imageItem.insertText = new vscode.SnippetString('image ${1|' + imageNames.join(',') + '|}: ${2})='); // TODO: abc.png -> #image-filename
    objectItem.sortText = "2";

    return [objectItem, imageItem];
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
                    const contextParser = new SbmlContextParser(document, position);

                    const sbmlContext = contextParser.parse();
                    if (sbmlContext instanceof PropContext) {
                        return new PropCompletionItemProvider(sbmlContext, document, position, context.triggerCharacter).provide();
                    }

                    if (shouldSuggestDirectives(document, position, context)) {
                        return getDirectiveCompletionItems();
                    }

                    if (shouldSuggestInlineObject(document, position, context)) {
                        return getInlineObjectCompletionItems(document);
                    }
                }
            },
            ':', ',', '=', '('
        ));
    }
}