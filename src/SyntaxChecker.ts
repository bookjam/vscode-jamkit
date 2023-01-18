import * as vscode from 'vscode';
import { SbmlDiagnosticCollector } from './SbmlDiagnosticCollector';

export class SyntaxChecker {
    static register(context: vscode.ExtensionContext) {
        const collection = vscode.languages.createDiagnosticCollection('jamkit');

        const instance = new SyntaxChecker(collection);

        const currentDocument = vscode.window.activeTextEditor?.document;
        if (currentDocument) {
            instance.setActiveDocument(currentDocument);
        }

        context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
            instance.setActiveDocument(editor?.document);
        }));

        context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
            console.log(`onDidChangeTextDocument - ${event.contentChanges.length}`);

            if (event.contentChanges.length > 0) {
                instance.applyDocumentChange(event.document);
            }
        }));
    }

    private collection: vscode.DiagnosticCollection;
    private currentFileName?: string;

    constructor(collection: vscode.DiagnosticCollection) {
        this.collection = collection;
    }

    setActiveDocument(document: vscode.TextDocument | undefined): void {
        if (document) {
            if (this.currentFileName !== document.fileName) {
                this.currentFileName = document.fileName;
                if (this.collection.get(document.uri) == undefined) {
                    this.updateDiagnostics(document);
                }
            }
        } else {
            this.currentFileName = undefined;
        }
    }

    applyDocumentChange(document: vscode.TextDocument): void {
        if (this.currentFileName === document.fileName) {
            this.updateDiagnostics(document);
        } else {
            this.collection.delete(document.uri);
        }
    }

    updateDiagnostics(document: vscode.TextDocument): void {

        //console.log(`updateDiagnostics - ${document.fileName}`);
        console.log("updateDiagnostics");

        this.collection.delete(document.uri);
        if (document.fileName.endsWith('.sbml')) {
            const diagnosticCollector = new SbmlDiagnosticCollector(document);
            this.collection.set(document.uri, diagnosticCollector.collect());
        }
        else if (document.fileName.endsWith('.sbss')) {
            // TODO: collect sbss diagnostics
            this.collection.set(document.uri, []);
        }
    }
}

