import * as vscode from 'vscode';
import { SbmlDiagnosticCollector } from './SbmlDiagnosticCollector';
import { SbssSyntaxAnalyser } from './SbssDiagnosticCollector';

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

        vscode.languages.registerColorProvider('sbml', {
            provideDocumentColors: (document: vscode.TextDocument, _token: vscode.CancellationToken) => {
                console.log(`provideDocumentColors - ${document.fileName}`);
                return [new vscode.ColorInformation(new vscode.Range(0, 2, 0, 3), new vscode.Color(1, 0, 0, 1))];
            },

            provideColorPresentations: () => { return undefined; }
        });
    }

    private collection: vscode.DiagnosticCollection;
    private currentFileName?: string;

    constructor(collection: vscode.DiagnosticCollection) {
        this.collection = collection;
    }

    private setActiveDocument(document: vscode.TextDocument | undefined): void {
        if (document) {
            if (this.currentFileName !== document.fileName) {
                this.currentFileName = document.fileName;
                if (!this.collection.has(document.uri)) {
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
        const diagnosticCollector = (() => {
            if (document.fileName.endsWith('.sbml')) {
                return new SbmlDiagnosticCollector(document);
            }
            if (document.fileName.endsWith('.sbss')) {
                return new SbssSyntaxAnalyser(document);
            }
        })();
        if (diagnosticCollector) {
            this.collection.set(document.uri, diagnosticCollector.collect());
        }
    }

    private clearDiagnostics(document: vscode.TextDocument): void {
        console.log(`clearDiagnostics: ${document.fileName}`);

        this.collection.delete(document.uri);
    }
}

