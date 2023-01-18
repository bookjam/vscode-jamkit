import { ExtensionContext } from 'vscode';
import { SbssCompletionItemProvider } from './SbssCompletionItemProvider';
import { SbmlCompletionItemProvider } from './SbmlCompletionItemProvider';
import { SyntaxChecker } from './SyntaxChecker';

export function activate(context: ExtensionContext) {
    SbssCompletionItemProvider.register(context);
    SbmlCompletionItemProvider.register(context);
    SyntaxChecker.register(context);
}