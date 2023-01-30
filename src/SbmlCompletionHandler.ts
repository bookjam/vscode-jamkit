import * as vscode from 'vscode';
import { PropCompletionItemProvider } from './PropCompletionItemProvider';
import { ImageNameContext, ObjectTypeContext, SbmlContextParser } from './SbmlContextParser';
import { MediaRepository } from './MediaRepository';
import { PropConfigStore } from './PropConfigStore';

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
                            return new PropCompletionItemProvider(document, context, _context.triggerCharacter).provide();
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
                            let objectTypes = PropConfigStore.getKnownObjectTypes();
                            if (context.prefix) {
                                const prefix = context.prefix;
                                objectTypes = objectTypes.filter(objectType => objectType.startsWith(prefix));
                            }
                            return objectTypes.map(objectType => {
                                return new vscode.CompletionItem(objectType, vscode.CompletionItemKind.Class);
                            });
                        }
                        else if (context instanceof ImageNameContext) {
                            let imageNames = MediaRepository.enumerateImageNames(document.fileName);
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