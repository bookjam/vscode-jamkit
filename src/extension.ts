import { ExtensionContext } from 'vscode';
import { SbssCompletionHandler } from './SbssCompletionHandler';
import { SbmlCompletionHandler } from './SbmlCompletionHandler';
import { SyntaxAnalyser } from './SyntaxAnalyser';

export function activate(context: ExtensionContext) {
    SbssCompletionHandler.register(context);
    SbmlCompletionHandler.register(context);
    SyntaxAnalyser.register(context);
}
