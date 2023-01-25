import { ExtensionContext } from 'vscode';
import { SbssCompletionHandler } from './SbssCompletionHandler';
import { SbmlCompletionHandler } from './SbmlCompletionHandler';
import { SyntaxAnalyser } from './SyntaxAnalyser';
import { PropConfigStore } from './PropConfigStore';

export function activate(context: ExtensionContext) {
    PropConfigStore.init(context);
    SyntaxAnalyser.register(context);
    SbssCompletionHandler.register(context);
    SbmlCompletionHandler.register(context);
}
