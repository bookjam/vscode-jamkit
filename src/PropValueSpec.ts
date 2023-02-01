import { assert } from "console";
import { CompletionItemKind } from "vscode";
import { MediaRepository } from "./MediaRepository";

const KNOWN_CATEGORIES: string[] = [
    '#image-filename',
    // '#audio-filename',
    // '#video-filename',
    // '#style-name',
    // '#function-name',
    '#color',
    // '#length',
];

export interface PropValueSuggestion {
    label: string;
    text: string;
    kind: CompletionItemKind;
    isSnippet: boolean;
}

export interface PropValueError {
    message: string;
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
            if ('values' in keys) {
                values = valueSpec.values as string[];
            }
            if ('suggestions' in keys) {
                suggestions = valueSpec.suggestions as string[];
            }
            if ('value-category' in keys) {
                const valueCategory = valueSpec['value-category'] as string;
                if (KNOWN_CATEGORIES.includes(valueCategory)) {
                    category = valueCategory;
                }
            }
            if ('value-pattern' in keys) {
                pattern = valueSpec['value-pattern'] as string;
            }
        }

        return new this(values, suggestions, category, pattern);
    }

    private constructor(values?: string[], suggestions?: string[], category?: string, pattern?: string) {
        this.values = values ?? [];
        this.suggestions = suggestions ?? [];
        this.categories = category ? [category] : [];
        this.patterns = pattern ? [pattern] : [];
    }

    verify(name: string, value: string, documentPath: string): PropValueError | undefined {

        let errorMessage = `"${value}" is not valid for "${name}" here.`;

        if (this.values.length == 0 && this.patterns.length == 0 && this.categories.length == 0) {
            return;
        }

        if (this.values.includes(value)) {
            return;
        }

        for (let pattern of this.patterns) {
            if (new RegExp(pattern).test(value))
                return;
        }

        for (let category of this.categories) {
            if (category == '#image-filename') {
                if (MediaRepository.enumerateImageNames(documentPath).includes(value))
                    return;
                errorMessage = `'${value}' does not exist.`;
            }
            else if (category == '#color') {
                if (value.match(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/))
                    return;
                if (value.match(/^rgb\(\s*\d+%?\s*,\s*\d+%?\s*,\s*\d+%?\s*\)$/))
                    return;
                if (value.match(/^rgba\(\s*\d+%?\s*,\s*\d+%?\s*,\s*\d+%?\s*,\s*[\d\.]+\s*\)$/))
                    return;
                errorMessage = `Invalid color format.`;
            }
            else {
                assert(false, `WTF? Unknown value category: ${category}`);
            }
        }

        return { message: errorMessage };
    }

    merge(other: PropValueSpec): void {
        mergeUnique(this.values, other.values);
        mergeUnique(this.suggestions, other.suggestions);
        mergeUnique(this.categories, other.categories);
        mergeUnique(this.patterns, other.patterns);
    }

    getSuggestions(documentPath: string): PropValueSuggestion[] | undefined {
        let suggestions = (() => {
            if (this.suggestions.length != 0)
                return this.suggestions.map(label => makeSuggestion(label, CompletionItemKind.Value));
            if (this.values.length != 0)
                return this.values.map(label => makeSuggestion(label, CompletionItemKind.EnumMember));
        })();

        for (let category of this.categories) {
            if (!suggestions) suggestions = [];
            if (category == '#image-filename') {
                MediaRepository.enumerateImageNames(documentPath).forEach(imageName => {
                    suggestions?.push(makeSuggestion(imageName, CompletionItemKind.File));
                });
            }
            else if (category == '#color') {
                suggestions.push(makeSuggestion('black - #rrggbb', CompletionItemKind.Color, '#000000'));
                suggestions.push(makeSuggestion('white - #rrggbb', CompletionItemKind.Color, '#ffffff'));
                suggestions.push(makeSuggestion('black - #rrggbbaa', CompletionItemKind.Color, '#000000ff'));
                suggestions.push(makeSuggestion('white - #rrggbbaa', CompletionItemKind.Color, '#ffffffff'));
                suggestions.push(makeSnippetSuggestion(
                    'rgb($red, $green, $blue)',
                    '"rgb(${1:255},${2:255},${3:255})"',
                    CompletionItemKind.Function)
                );
                suggestions.push(makeSnippetSuggestion(
                    'rgba($red, $green, $blue, $alpha)',
                    '"rgb(${1:255},${2:255},${3:255},${4:0.5})"',
                    CompletionItemKind.Function)
                );
            }
            else {
                assert(false, `WTF? Unknown value category: ${category}`);
            }
        }

        return suggestions;
    }
}

function mergeUnique<T>(dst: T[], src: T[]): void {
    src.forEach(addition => {
        if (!dst.includes(addition))
            dst.push(addition);
    });
}

function makeSuggestion(label: string, kind: CompletionItemKind, text?: string): PropValueSuggestion {
    return { label, text: text ?? label, kind, isSnippet: false };
}

function makeSnippetSuggestion(label: string, text: string, kind: CompletionItemKind): PropValueSuggestion {
    return { label, text, kind, isSnippet: true };
}

