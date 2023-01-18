import { ExtensionContext } from 'vscode';
import { SbssCompletionItemProvider } from './SbssCompletionItemProvider';
import { SbmlCompletionItemProvider } from './SbmlCompletionItemProvider';

export function activate(context: ExtensionContext) {
    SbssCompletionItemProvider.register(context);
    SbmlCompletionItemProvider.register(context);
}