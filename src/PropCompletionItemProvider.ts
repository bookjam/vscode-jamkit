import * as vscode from 'vscode';
import { PropConfigStore } from './PropConfigStore';
import {
    PropContext,
    PropGroupKind,
    PropNameContext,
    PropValueContext
} from './ContextParser';
import { assert } from 'console';

export class PropCompletionItemProvider {
    readonly context: PropContext;
    readonly document: vscode.TextDocument;
    readonly position: vscode.Position;
    readonly triggerChar: string | undefined;

    constructor(context: PropContext, document: vscode.TextDocument, position: vscode.Position, triggerChar: string | undefined) {
        this.context = context;
        this.document = document;
        this.position = position;
        this.triggerChar = triggerChar;
    }

    provide(): vscode.CompletionItem[] | undefined {
        console.log(`provideCompletionItems: ${this.position.line}:${this.position.character}`);
        console.log(this.context);

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

        let suggestions = PropConfigStore.getPropValueSpec(context.target, context.name)?.getSuggestions();
        if (suggestions) {
            if (context.valuePrefix) {
                const prefix = context.valuePrefix;
                suggestions = suggestions.filter(suggestion => suggestion.label.startsWith(prefix));
            }
            return suggestions.map((suggestion, index) => {
                const item = new vscode.CompletionItem(suggestion.label, suggestion.kind);
                if (this.triggerChar === ':') {
                    item.insertText = ' ' + suggestion.label;
                }
                item.sortText = index.toString();
                return item;
            });
        }
    }
}
