import * as vscode from 'vscode';
import { PropConfigStore } from './PropConfigStore';
import {
    PropGroupKind,
    PropNameContext,
    PropValueContext
} from './ContextParser';

export class PropCompletionItemProvider {
    readonly document;
    readonly context;
    readonly triggerChar;

    constructor(document: vscode.TextDocument, context: PropNameContext | PropValueContext, triggerChar: string | undefined) {
        this.document = document;
        this.context = context;
        this.triggerChar = triggerChar;
    }

    provide(): vscode.CompletionItem[] | undefined {
        if (this.context instanceof PropNameContext) {
            return this.getPropNameCompletionItems(this.context);
        }
        if (this.context instanceof PropValueContext) {
            return this.getPropValueCompletionItems(this.context);
        }
    }

    private getPropNameCompletionItems(context: PropNameContext) {
        console.log(`property name: namePrefix=${context.namePrefix}`);

        let names = PropConfigStore.getKnownPropNames(context.target);
        if (context.namePrefix) {
            const namePrefix = context.namePrefix;
            names = names.filter(name => name.startsWith(namePrefix));
        }
        return names.map(name => {
            const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Property);
            if (this.context.kind == PropGroupKind.List) {
                if (this.triggerChar == ',' || this.triggerChar == ':') {
                    item.insertText = ` ${name}=`;
                }
                else {
                    item.insertText = `${name}=`;
                }
            }
            else {
                item.insertText = new vscode.SnippetString(name + ': ${1};');
            }
            item.command = { title: 'Select a value...', command: 'editor.action.triggerSuggest' };
            return item;
        });
    }

    private getPropValueCompletionItems(context: PropValueContext) {
        console.log(`property value: name=${context.name}, valuePrefix=${context.valuePrefix}`);

        const propValueSpec = PropConfigStore.getPropValueSpec(context.target, context.name);
        let suggestions = propValueSpec?.getSuggestions(this.document.fileName);
        if (suggestions) {
            if (context.valuePrefix) {
                const prefix = context.valuePrefix;
                suggestions = suggestions.filter(suggestion => suggestion.text.startsWith(prefix));
            }
            return suggestions.map((suggestion, index) => {
                const item = (() => {
                    if (!suggestion.isSnippet && (suggestion.hint || suggestion.label !== suggestion.text)) {
                        const label = suggestion.label;
                        const description = suggestion.hint ?? suggestion.text;
                        return new vscode.CompletionItem({ label, description }, suggestion.icon);
                    }
                    return new vscode.CompletionItem(suggestion.label, suggestion.icon);
                })();

                if (suggestion.isSnippet) {
                    item.insertText = new vscode.SnippetString(suggestion.text);
                }
                else if (this.triggerChar === ':') {
                    item.insertText = ' ' + suggestion.text;
                }
                else if (context.valuePrefix === '$' || context.valuePrefix === '~' || context.valuePrefix === '~/') {
                    item.insertText = suggestion.text.substring(context.valuePrefix.length);
                }
                else {
                    item.insertText = suggestion.text;
                }

                item.sortText = index.toString();

                return item;
            });
        }
    }
}
