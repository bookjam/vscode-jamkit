import * as vscode from 'vscode';
import { SbmlSyntaxAnalyser } from './SbmlSyntaxAnalyser';
import { SbssSyntaxAnalyser } from './SbssSyntaxAnalyser';

export class SyntaxAnalyser {
    static register(context: vscode.ExtensionContext): void {
        const collection = vscode.languages.createDiagnosticCollection('jamkit');
        const instance = new SyntaxAnalyser(collection);

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
                provideDocumentColors: (document: vscode.TextDocument, _token: vscode.CancellationToken) => {
                    console.log(`provideDocumentColors - ${document.fileName}`);
                    return instance.colorInfoCollection.get(document.fileName);
                },
                provideColorPresentations: () => { return undefined; }
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

