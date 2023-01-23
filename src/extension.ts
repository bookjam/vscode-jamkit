import { ExtensionContext } from 'vscode';
import { SbssCompletionItemProvider } from './SbssCompletionHandler';
import { SbmlCompletionItemProvider } from './SbmlCompletionHandler';
import { SyntaxAnalyser } from './SyntaxAnalyser';

export function activate(context: ExtensionContext) {
    SbssCompletionItemProvider.register(context);
    SbmlCompletionItemProvider.register(context);
    SyntaxAnalyser.register(context);
}
