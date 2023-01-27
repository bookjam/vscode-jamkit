import * as vscode from 'vscode';
import { PropConfigStore } from './PropConfigStore';
import {
    ContextParser,
    PropGroupKind,
    PropNameCompletionContext,
    PropValueCompletionContext
} from './ContextParser';
import { assert } from 'console';

export class PropCompletionItemProvider {
    readonly contextParser: ContextParser;
    readonly document: vscode.TextDocument;
    readonly position: vscode.Position;
    readonly triggerChar: string | undefined;

    constructor(contextParser: ContextParser, document: vscode.TextDocument, position: vscode.Position, triggerChar: string | undefined) {
        this.contextParser = contextParser;
        this.document = document;
        this.position = position;
        this.triggerChar = triggerChar;
    }

    provide() {
        console.log(`provideCompletionItems: ${this.position.line}:${this.position.character}`);

        const context = this.contextParser.parse();
        console.log(context);

        if (context instanceof PropNameCompletionContext) {
            return this.getPropertyNameCompletionItems(context);
        }

        if (context instanceof PropValueCompletionContext) {
            return this.getPropertyValueCompletionItems(context);
        }
    }

    private getPropertyNameCompletionItems(context: PropNameCompletionContext) {
        console.log(`property name: namePrefix=${context.namePrefix}`);

        let names = PropConfigStore.getKnownPropNames(context.target);
        if (context.namePrefix) {
            const namePrefix = context.namePrefix;
            names = names.filter(name => name.startsWith(namePrefix));
        }
        return names.map(name => {
            const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Property);
            if (this.contextParser.propGroupContext?.kind == PropGroupKind.List) {
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

    private getPropertyValueCompletionItems(context: PropValueCompletionContext) {
        console.log(`property value: name=${context.name}, valuePrefix=${context.valuePrefix}`);

        let suggestions = PropConfigStore.getPropValueSpec(context.target, context.name)?.getSuggestions();
        if (suggestions) {
            if (context.valuePrefix) {
                const prefix = context.valuePrefix;
                suggestions = suggestions.filter(suggestion => suggestion.startsWith(prefix));
            }
            return suggestions.map((suggestion, index) => {
                const item = new vscode.CompletionItem(suggestion, vscode.CompletionItemKind.Value);
                if (this.triggerChar == ':') {
                    item.insertText = ` ${suggestion}`;
                }
                item.sortText = index.toString();
                return item;
            });
        }
    }
}
