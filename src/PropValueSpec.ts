export class PropValueSpec {
    private values?: string[];
    private suggestions?: string[];
    private categories?: string[];  // '#length', '#color', '#image-filename', '#script-function', etc.
    private patterns?: string[];

    constructor(values?: string[], suggestions?: string[], category?: string, pattern?: string) {
        this.values = values;
        this.suggestions = suggestions;
        this.categories = category ? [category] : undefined;
        this.patterns = pattern ? [pattern] : undefined;
    }

    static from(valueSpec: any) {
        let values: string[] | undefined;
        let suggestions: string[] | undefined;
        let category: string | undefined;
        let pattern: string | undefined;

        if (typeof valueSpec == 'string') {
            const specialValue = valueSpec as string;
            if (specialValue.startsWith('#')) {
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

    verify(value: string): boolean {
        if (!this.values && !this.patterns && !this.categories) {
            return true;
        }

        if (this.values?.includes(value)) {
            return true;
        }

        if (this.patterns) {
            for (let pattern of this.patterns) {
                if (new RegExp(pattern).test(value))
                    return true;
            }
        }

        if (this.categories) {
            for (let _category of this.categories) {
                // TODO: handle '#image-filename'  ...
            }
        }

        return false;
    }

    merge(other: PropValueSpec): void {
        this.values = mergeUnique(this.values, other.values);
        this.suggestions = mergeUnique(this.suggestions, other.suggestions);
        this.categories = mergeUnique(this.categories, other.categories);
        this.patterns = mergeUnique(this.suggestions, other.patterns);
    }

    getSuggestions(): string[] | undefined {
        if (this.suggestions) {
            return this.suggestions;
        }

        // TODO: categories

        return this.values;
    }
}

function mergeUnique<T>(mine?: T[], others?: T[]): T[] | undefined {
    if (mine) {
        others?.forEach(addition => {
            if (!mine.includes(addition))
                mine.push(addition);
        });
        return mine;
    }
    return others;
}