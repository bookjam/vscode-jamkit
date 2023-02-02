import * as vscode from 'vscode';
import { PropConfigStore } from './PropConfigStore';
import { MediaRepository } from './MediaRepository';
import { VariableCache } from './VariableCache';
import { toString } from './utils';
import { SbmlSyntaxAnalyser } from './SbmlSyntaxAnalyser';
import { SbssSyntaxAnalyser } from './SbssSyntaxAnalyser';
import { SbssCompletionHandler } from './SbssCompletionHandler';
import { SbmlCompletionHandler } from './SbmlCompletionHandler';

export class JamkitExtension {
    static init(context: vscode.ExtensionContext): void {

        VariableCache.init(context);
        PropConfigStore.init(context);
        MediaRepository.init(context);
        SbssCompletionHandler.init(context);
        SbmlCompletionHandler.init(context);

        const collection = vscode.languages.createDiagnosticCollection('jamkit');
        const instance = new JamkitExtension(collection);

        const currentDocument = vscode.window.activeTextEditor?.document;
        if (currentDocument) {
            instance.setActiveDocument(currentDocument);
        }
        context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
            instance.setActiveDocument(editor?.document);
        }));
        context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
            if (event.contentChanges.length == 0) {
                return;
            }
            if (instance.currentFileName === event.document.fileName) {
                instance.analize(event.document);
            }
            else {
                instance.clearDiagnostics(event.document);
            }
        }));

        ['sbml', 'sbss'].forEach(documentSelector => {
            vscode.languages.registerColorProvider(documentSelector, {
                provideDocumentColors: (document) => {
                    console.log(`provideDocumentColors - ${document.fileName}`);

                    // Occasionally, alalyse() is called slight later than provideDocumentColors().
                    const COLOR_INFO_DELAY = 0.2;
                    return new Promise((resolve, _) => {
                        setTimeout(() => {
                            resolve(instance.colorInfoCollection.get(document.fileName));
                        }, COLOR_INFO_DELAY);
                    });
                },
                provideColorPresentations: (color) => {
                    return [new vscode.ColorPresentation(toString(color))];
                }
            });
        });
    }

    private colorInfoCollection: Map<string, vscode.ColorInformation[]> = new Map();
    private diagnosticCollection: vscode.DiagnosticCollection;
    private currentFileName?: string;

    private constructor(collection: vscode.DiagnosticCollection) {
        this.diagnosticCollection = collection;
    }

    private setActiveDocument(document: vscode.TextDocument | undefined): void {
        if (document) {
            if (this.currentFileName !== document.fileName) {
                this.currentFileName = document.fileName;
                if (!this.diagnosticCollection.has(document.uri)) {
                    this.analize(document);
                }
            }
        }
        else {
            this.currentFileName = undefined;
        }
    }

    private analize(document: vscode.TextDocument): void {
        console.log(`analize - ${document.fileName}`);
        const analyser = (() => {
            if (document.fileName.endsWith('.sbml')) {
                return new SbmlSyntaxAnalyser(document);
            }
            if (document.fileName.endsWith('.sbss')) {
                return new SbssSyntaxAnalyser(document);
            }
        })();
        if (analyser) {
            const diagnostics = analyser.analyse();

            this.diagnosticCollection.set(document.uri, diagnostics);
            this.colorInfoCollection.set(document.fileName, analyser.getColorInfomrations());
        }
    }

    private clearDiagnostics(document: vscode.TextDocument): void {
        console.log(`clearDiagnostics: ${document.fileName}`);

        this.diagnosticCollection.delete(document.uri);
    }
}
