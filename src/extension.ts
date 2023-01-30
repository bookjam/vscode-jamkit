import { ExtensionContext } from 'vscode';
import { SbssCompletionHandler } from './SbssCompletionHandler';
import { SbmlCompletionHandler } from './SbmlCompletionHandler';
import { SyntaxAnalyser } from './SyntaxAnalyser';
import { PropConfigStore } from './PropConfigStore';
import { MediaRepository } from './MediaRepository';

export function activate(context: ExtensionContext) {
    PropConfigStore.init(context);
    MediaRepository.init(context);
    SyntaxAnalyser.register(context);
    SbssCompletionHandler.register(context);
    SbmlCompletionHandler.register(context);
}
