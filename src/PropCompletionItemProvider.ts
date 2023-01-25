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
            const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.EnumMember);
            if (this.contextParser.propGroupContext?.kind == PropGroupKind.List) {
                if (this.triggerChar == ',' || this.triggerChar == ':') {
                    item.insertText = ` ${name}=`;
                } else {
                    item.insertText = `${name}=`;
                }
            } else {
                item.insertText = new vscode.SnippetString(name + ': ${1};');
            }
            item.command = { title: 'Select a value...', command: 'editor.action.triggerSuggest' };
            return item;
        });
    }

    private getPropertyValueCompletionItems(context: PropValueCompletionContext) {
        console.log(`property value: name=${context.name}, valuePrefix=${context.valuePrefix}`);

        let values = PropConfigStore.getKnownPropValues(context.target, context.name);
        if (context.valuePrefix) {
            const valuePrefix = context.valuePrefix;
            values = values.filter(value => value.startsWith(valuePrefix));
        }
        return values.map(value => {
            const item = new vscode.CompletionItem(value, vscode.CompletionItemKind.EnumMember);
            if (this.triggerChar == ':') {
                item.insertText = ` ${value}`;
            }
            return item;
        });
    }
}
