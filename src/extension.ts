import { ExtensionContext } from 'vscode';
import { SbssCompletionHandler } from './SbssCompletionHandler';
import { SbmlCompletionHandler } from './SbmlCompletionHandler';
import { SyntaxAnalyser } from './SyntaxAnalyser';
import { PropConfigStore } from './PropConfigStore';

let extensionPath: string | undefined;

export function getExtensionPath(): string {
    return extensionPath!;
}

export function activate(context: ExtensionContext) {
    extensionPath = context.extensionPath;

    PropConfigStore.init(context);
    SyntaxAnalyser.register(context);
    SbssCompletionHandler.register(context);
    SbmlCompletionHandler.register(context);
}
