import * as vscode from 'vscode';

export function getLineTextAt(document: vscode.TextDocument, position: vscode.Position): string {
    return document.lineAt(position).text;
}

export function getLogicalLineBeginPosition(document: vscode.TextDocument, position: vscode.Position): vscode.Position {
    let lineBeginPosition = position.with(undefined, 0);
    while (lineBeginPosition.line > 0) {
        const previousLineBeginPosition = lineBeginPosition.with(lineBeginPosition.line - 1);
        if (!document.lineAt(previousLineBeginPosition).text.endsWith('\\'))
            break;
        lineBeginPosition = previousLineBeginPosition;
    }
    return lineBeginPosition;
}