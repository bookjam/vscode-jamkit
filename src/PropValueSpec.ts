export class PropValueSpec {
    private readonly values?: string[];
    private readonly suggestions?: string[];
    private readonly specials?: string[];  // '#length', '#color', '#image-filename', '#script-function', etc.
    private readonly snippets?: string[];
    private readonly patterns?: RegExp[];

    constructor(values?: string[], suggestions?: string[], special?: string, snippet?: string, pattern?: RegExp) {
        this.values = values;
        this.suggestions = suggestions;
        this.specials = special ? [special] : undefined;
        this.snippets = snippet ? [snippet] : undefined;
        this.patterns = pattern ? [pattern] : undefined;
    }

    static from(valueSpec: any) {
        let values: string[] | undefined;
        let suggestions: string[] | undefined;
        let speical: string | undefined;
        let snippet: string | undefined;
        let pattern: RegExp | undefined;

        if (typeof valueSpec == 'string') {
            const specialValue = valueSpec as string;
            if (specialValue.startsWith('#')) {
                speical = specialValue;
            }
        } else if (Array.isArray(valueSpec)) {
            values = valueSpec as string[];
        } else {
            const keys = Object.keys(valueSpec) as Array<keyof typeof valueSpec>;
            keys.forEach(key => {
                if (key as string === 'values') {
                    values = valueSpec[key] as string[];
                }
                if (key as string === 'suggestions') {
                    suggestions = valueSpec[key] as string[];
                }
                if (key as string == 'value-snippet') {
                    snippet = valueSpec[key] as string;
                }
                if (key as string == 'value-pattern') {
                    pattern = new RegExp(valueSpec[key] as string);
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