import { ExtensionContext } from 'vscode';
import { SbssCompletionHandler } from './SbssCompletionHandler';
import { SbmlCompletionHandler } from './SbmlCompletionHandler';
import { SyntaxAnalyser } from './SyntaxAnalyser';

let extensionPath: string | undefined;

export function getExtensionPath(): string {
    return extensionPath!;
}

export function activate(context: ExtensionContext) {
    extensionPath = context.extensionPath;

    SbssCompletionHandler.register(context);
    SbmlCompletionHandler.register(context);
    SyntaxAnalyser.register(context);
}
