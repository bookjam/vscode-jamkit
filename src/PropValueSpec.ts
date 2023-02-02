import { assert } from "console";
import { CompletionItemKind as PropValueSuggestionIcon } from "vscode";
import { MediaKind, MediaRepository } from "./MediaRepository";
import { VariableCache } from "./VariableCache";
import { isColorText } from "./utils";

const KNOWN_CATEGORIES: string[] = [
    '#image-filename',
    '#audio-filename',
    '#video-filename',
    // '#style-name',
    // '#function-name',
    '#color',
    // '#length',
];

export interface PropValueSuggestion {
    icon: PropValueSuggestionIcon;
    label: string;
    text: string;
    hint?: string;
    isSnippet?: boolean;
}

export interface PropValueVerifyResult {
    success: boolean;
    errorMessage?: string;
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

    verify(value: string, documentPath: string): PropValueVerifyResult {

        let errorMessage;

        if (!this.hasValidationRules()) {
            return { success: true };
        }

        if (this.values.includes(value)) {
            return { success: true };
        }

        for (let pattern of this.patterns) {
            if (new RegExp(pattern).test(value))
                return { success: true };
        }

        for (let category of this.categories) {
            if (category == '#image-filename' || category == '#audio-filename' || category == '#video-filename') {
                if (MediaRepository.enumerateMediaNames(toMediaKind(category), documentPath).includes(value)) {
                    return { success: true };
                }

                errorMessage = `'${value}' does not exist.`;
            }
            else if (category == '#color') {
                if (isColorText(value)) {
                    return { success: true };
                }

                errorMessage = `Invalid color format.`;
            }
            else {
                assert(false, `WTF? Unknown value category: ${category}`);
            }
        }

        return { success: false, errorMessage };
    }

    merge(other: PropValueSpec): void {
        mergeUnique(this.values, other.values);
        mergeUnique(this.suggestions, other.suggestions);
        mergeUnique(this.categories, other.categories);
        mergeUnique(this.patterns, other.patterns);
    }

    hasValidationRules(): boolean {
        return this.values.length > 0 || this.patterns.length > 0 || this.categories.length > 0;
    }

    getSuggestions(triggerChar: string | undefined, documentPath: string): PropValueSuggestion[] {
        let suggestions = (() => {
            if (this.suggestions.length != 0)
                return this.suggestions.map(label => makeSuggestion(PropValueSuggestionIcon.Value, label));
            if (this.values.length != 0)
                return this.values.map(label => makeSuggestion(PropValueSuggestionIcon.EnumMember, label));
        })() ?? [];

        for (let category of this.categories) {
            if (category == '#image-filename' || category == '#audio-filename' || category == '#video-filename') {
                MediaRepository.enumerateMediaNames(toMediaKind(category), documentPath).forEach(imageName => {
                    suggestions.push(makeSuggestion(PropValueSuggestionIcon.File, imageName));
                });
            }
            else if (category == '#color') {
                // Now that we can suggest variables and we usually have a bunch of color variables in themes.sbss,
                // these don't seem to help much better.

                /*suggestions.push(makeSuggestion(PropValueSuggestionIcon.Color, 'black - #rrggbb', '#000000'));
                suggestions.push(makeSuggestion(PropValueSuggestionIcon.Color, 'white - #rrggbb', '#ffffff'));
                suggestions.push(makeSuggestion(PropValueSuggestionIcon.Color, 'black - #rrggbbaa', '#000000ff'));
                suggestions.push(makeSuggestion(PropValueSuggestionIcon.Color, 'white - #rrggbbaa', '#ffffffff'));
                suggestions.push(makeSnippetSuggestion(
                    PropValueSuggestionIcon.Function,
                    'rgb($red, $green, $blue)',
                    '"rgb(${1:255},${2:255},${3:255})"')
                );
                suggestions.push(makeSnippetSuggestion(
                    PropValueSuggestionIcon.Function,
                    'rgba($red, $green, $blue, $alpha)',
                    '"rgba(${1:255},${2:255},${3:255},${4:0.5})"')
                );*/
            }
            else {
                assert(false, `WTF? Unknown value category: ${category}`);
            }
        }

        // Variables can be suggested either when:
        //  - users really want them (triggerChar == '$'), or
        //  - we have strict rules to verify the variables.
        if (triggerChar == '$' || this.hasValidationRules()) {
            const variables = VariableCache.getVariables(documentPath);
            if (variables.size > 0) {
                variables.forEach((values, name) => {
                    const validValues = values.filter(value => this.verify(value, documentPath).success);
                    if (validValues.length > 0) {
                        const label = `$${name}`;
                        suggestions.push({
                            icon: PropValueSuggestionIcon.Variable,
                            label: label,
                            text: label,
                            hint: validValues.toString()
                        });
                    }
                });
            }
        }

        return suggestions;
    }
}

function mergeUnique<T>(dst: T[], src: T[]): void {
    src.forEach(addition => {
        if (!dst.includes(addition)) {
            dst.push(addition);
        }
    });
}

function makeSuggestion(kind: PropValueSuggestionIcon, label: string, text?: string): PropValueSuggestion {
    return { label, text: text ?? label, icon: kind };
}

function makeSnippetSuggestion(kind: PropValueSuggestionIcon, label: string, text: string): PropValueSuggestion {
    return { label, text, icon: kind, isSnippet: true };
}

function toMediaKind(valueCategory: '#image-filename' | '#audio-filename' | '#video-filename'): MediaKind {
    if (valueCategory == '#image-filename')
        return MediaKind.Image;
    if (valueCategory == '#audio-filename')
        return MediaKind.Audio;
    return MediaKind.Video;
}