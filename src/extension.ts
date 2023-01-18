import { ExtensionContext } from 'vscode';
import { SbssCompletionItemProvider } from './SbssCompletionItemProvider';
import { SbmlCompletionItemProvider } from './SbmlCompletionItemProvider';
import { SyntaxAnalyser } from './SyntaxAnalyser';

export function activate(context: ExtensionContext) {
    SbssCompletionItemProvider.register(context);
    SbmlCompletionItemProvider.register(context);
    SyntaxAnalyser.register(context);
}