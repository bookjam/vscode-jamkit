import { CompletionItem, CompletionItemKind } from "vscode";

interface PropValueSpec {
    verify(value: string): boolean;
    suggestions(): CompletionItem[] | undefined;
}

function createPropValueSpec(obj: object): PropValueSpec | undefined {
    if (Array.isArray(obj)) {
        const values = obj as string[];
        return {
            verify: (value) => {
                return values.includes(value);
            },
            suggestions: () => {
                return values.map(value => new CompletionItem(value, CompletionItemKind.EnumMember));
            }
        };
    }
}