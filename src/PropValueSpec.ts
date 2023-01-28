import { CompletionItemKind } from "vscode";

const KNOWN_CATEGORIES: string[] = [
    // '#image-filename',
    // '#audio-filename',
    // '#video-filename',
    // '#style-name',
    // '#function-name',
    // '#color',
    // '#length',
];

export interface PropValueSuggestion {
    label: string;
    kind: CompletionItemKind;
}

export class PropValueSpec {
    private values: string[];
    private suggestions: string[];
    private categories: string[];  // '#length', '#color', '#image-filename', '#script-function', etc.
    private patterns: string[];

    static from(valueSpec: any) {
        let values: string[] | undefined;
        let suggestions: string[] | undefined;
        let category: string | undefined;
        let pattern: string | undefined;

        if (typeof valueSpec == 'string') {
            const specialValue = valueSpec as string;
            if (KNOWN_CATEGORIES.includes(specialValue)) {
                category = specialValue;
            }
        }
        else if (Array.isArray(valueSpec)) {
            values = valueSpec as string[];
        }
        else {
            const keys = Object.keys(valueSpec) as Array<keyof typeof valueSpec>;
            keys.forEach(key => {
                switch (key as string) {
                    case 'values':
                        values = valueSpec[key] as string[];
                        break;
                    case 'suggestions':
                        suggestions = valueSpec[key] as string[];
                        break;
                    case 'value-category':
                        category = valueSpec[key] as string;
                        break;
                    case 'value-pattern':
                        pattern = valueSpec[key] as string;
                        break;
                }
            });
        }

        return new this(values, suggestions, category, pattern);
    }

    private constructor(values?: string[], suggestions?: string[], category?: string, pattern?: string) {
        this.values = values ?? [];
        this.suggestions = suggestions ?? [];
        this.categories = category ? [category] : [];
        this.patterns = pattern ? [pattern] : [];
    }

    verify(value: string): boolean {
        if (this.values.length == 0 && this.patterns.length == 0 && this.categories.length == 0) {
            return true;
        }

        if (this.values.includes(value)) {
            return true;
        }

        for (let pattern of this.patterns) {
            if (new RegExp(pattern).test(value))
                return true;
        }

        for (let _category of this.categories) {
            // TODO: handle known categories
        }

        return false;
    }

    merge(other: PropValueSpec): void {
        mergeUnique(this.values, other.values);
        mergeUnique(this.suggestions, other.suggestions);
        mergeUnique(this.categories, other.categories);
        mergeUnique(this.suggestions, other.patterns);
    }

    getSuggestions(): PropValueSuggestion[] | undefined {
        let suggestions = (() => {
            if (this.suggestions.length != 0)
                return this.suggestions.map(label => ({ label, kind: CompletionItemKind.Value }));
            if (this.values.length != 0)
                return this.values.map(label => ({ label, kind: CompletionItemKind.EnumMember }));
        })();

        // TODO: categories

        return suggestions;
    }
}

function mergeUnique<T>(dst: T[], src: T[]): void {
    src.forEach(addition => {
        if (!dst.includes(addition))
            dst.push(addition);
    });
}