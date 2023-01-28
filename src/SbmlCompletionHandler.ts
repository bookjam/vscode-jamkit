import * as vscode from 'vscode';
import { PropCompletionItemProvider } from './PropCompletionItemProvider';
import { ImageNameContext, ObjectTypeContext, SbmlContextParser } from './SbmlContextParser';
import { ImageStore } from './ImageStore';


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

function shouldSuggestInlineObject(document: vscode.TextDocument, position: vscode.Position, triggerChar: string | undefined): boolean {
    return (
        triggerChar === '(' &&
        document.lineAt(position.line).text.substring(0, position.character).endsWith('=(')
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
                    _context: vscode.CompletionContext
                ) {
                    const contextParser = new SbmlContextParser(document, position);

                    {
                        const context = contextParser.parsePropContext();
                        if (context) {
                            return new PropCompletionItemProvider(context, _context.triggerCharacter).provide();
                        }
                    }

                    {
                        const context = contextParser.parseDirectiveContext();
                        if (context) {
                            return ['begin', 'end', 'object', 'image', 'comment', 'style', 'if', 'else', 'elif'].map((directive, index) => {
                                const item = new vscode.CompletionItem(directive, vscode.CompletionItemKind.Keyword);
                                item.insertText = directive + ' ';
                                item.sortText = index.toString();
                                if (directive === 'object' || directive === 'image') {
                                    item.command = { title: `Select an ${directive}...`, command: 'editor.action.triggerSuggest' };
                                }
                                return item;
                            });
                        }
                    }

                    if (shouldSuggestInlineObject(document, position, _context.triggerCharacter)) {
                        return ['object', 'image'].map((keyword, index) => {
                            const item = new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword);
                            item.insertText = keyword + ' ';
                            item.command = { title: `Select an ${keyword}...`, command: 'editor.action.triggerSuggest' };
                            item.sortText = index.toString();
                            return item;
                        });
                    }

                    {
                        const context = contextParser.parseObjectTypeContext();

                        if (context instanceof ObjectTypeContext) {
                            let objectTypes = OBJECT_TYPES;
                            if (context.prefix) {
                                const prefix = context.prefix;
                                objectTypes = objectTypes.filter(objectType => objectType.startsWith(prefix));
                            }
                            return objectTypes.map(objectType => {
                                return new vscode.CompletionItem(objectType, vscode.CompletionItemKind.Class);
                            });
                        }
                        else if (context instanceof ImageNameContext) {
                            let imageNames = ImageStore.enumerateImageNames(document.fileName);
                            if (context.prefix) {
                                const prefix = context.prefix;
                                imageNames = imageNames.filter(imageName => imageName.startsWith(prefix));
                            }
                            return imageNames.map(imageName => {
                                const item = new vscode.CompletionItem(imageName, vscode.CompletionItemKind.File);
                                if (context.prefix == '~' || context.prefix == '~/') {
                                    item.insertText = imageName.substring(context.prefix.length);
                                }
                                return item;
                            });
                        }
                    }
                }
            },
            ':', ',', '=',
            '(', // inline object/image
            '~', '/', '.' // image name prefix
        ));
    }
}