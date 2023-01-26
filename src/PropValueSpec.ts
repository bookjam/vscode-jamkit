export class PropValueSpec {
    readonly values?: string[];
    readonly suggestions?: string[];
    readonly specials?: string[];  // '#image-filename', '#audio-filename', '#script-function', etc.
    readonly snippets?: string[];
    readonly patterns?: RegExp[];

    constructor(values?: string[], suggestions?: string[], special?: string, snippet?: string, pattern?: RegExp) {
        this.values = values;
        this.suggestions = suggestions;
        this.specials = special ? [special] : undefined;
        this.snippets = snippet ? [snippet] : undefined;
        this.patterns = pattern ? [pattern] : undefined;
    }

    static from(obj: object) {
        let values: string[] | undefined;
        let suggestions: string[] | undefined;
        let speical: string | undefined;
        let snippet: string | undefined;
        let pattern: RegExp | undefined;

        if (typeof obj == 'string') {
            const specialValue = obj as string;
            if (specialValue.startsWith('#')) {
                speical = specialValue;
            }
        } else if (Array.isArray(obj)) {
            values = obj as string[];
        } else {
            const keys = Object.keys(obj) as Array<keyof typeof obj>;
            keys.forEach(key => {
                if (key as string === 'values') {
                    values = obj[key] as string[];
                }
                if (key as string === 'suggestions') {
                    suggestions = obj[key] as string[];
                }
                if (key as string == 'value-snippet') {
                    snippet = obj[key] as string;
                }
                if (key as string == 'value-pattern') {
                    pattern = new RegExp(obj[key] as string);
                }
            });
        }

        return new this(values, suggestions, speical, snippet, pattern);
    }

    verify(value: string): boolean {
        if (this.values) {
            return this.values.includes(value);
        }
        return false;
    }

    getSuggestions(): string[] | undefined {
        return this.suggestions ?? this.values;
    }
}