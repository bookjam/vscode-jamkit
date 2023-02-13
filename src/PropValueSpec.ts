import { assert } from "console";
import { CompletionItemKind as PropValueSuggestionIcon } from "vscode";
import { ResourceKind, ResourceRepository } from "./ResourceRepository";
import { VariableCache } from "./VariableCache";
import { isColorText } from "./utils";
import { checkLength } from "./Expression";
import { FuncNameCache } from "./FuncNameCache";

type NonTextResourceValueCategory = '#image-filename' | '#audio-filename' | '#video-filename' | '#sound-filename' | '#effect-filename';

function isNonTextResourceValueCategory(s: string): s is NonTextResourceValueCategory {
    return (
        s === '#image-filename' ||
        s === '#audio-filename' ||
        s === '#video-filename' ||
        s === '#sound-filename' ||
        s === '#effect-filename'
    );
}

function toResouceKind(valueCategory: NonTextResourceValueCategory):
    ResourceKind.Image | ResourceKind.Audio | ResourceKind.Video | ResourceKind.Sound | ResourceKind.Effect {
    if (valueCategory == '#image-filename') return ResourceKind.Image;
    if (valueCategory == '#audio-filename') return ResourceKind.Audio;
    if (valueCategory == '#video-filename') return ResourceKind.Video;
    if (valueCategory == '#sound-filename') return ResourceKind.Sound;
    return ResourceKind.Effect;
}

const KNOWN_CATEGORIES: string[] = [
    '#image-filename',
    '#audio-filename',
    '#video-filename',
    '#sound-filename',
    '#effect-filename',
    '#json-filename',
    // '#style-name',
    '#4-sided-length',
    '#color',
    '#length',
    '#function',
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

    static from(valueSpec: unknown) {
        let values: string[] | undefined;
        let suggestions: string[] | undefined;
        let category: string | undefined;
        let pattern: string | undefined;

        if (Array.isArray(valueSpec)) {
            values = valueSpec as string[];
        }
        else if (typeof valueSpec == 'string') {
            const specialValue = valueSpec as string;
            if (KNOWN_CATEGORIES.includes(specialValue)) {
                category = specialValue;
            }
        }
        else if (typeof valueSpec === 'object') {
            const specObj = valueSpec as object;
            if ('values' in specObj) {
                values = specObj.values as string[];
            }
            if ('suggestions' in specObj) {
                suggestions = specObj.suggestions as string[];
            }
            if ('value-category' in specObj) {
                const valueCategory = specObj['value-category'] as string;
                if (KNOWN_CATEGORIES.includes(valueCategory)) {
                    category = valueCategory;
                }
            }
            if ('value-pattern' in specObj) {
                pattern = specObj['value-pattern'] as string;
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
            if (!pattern.startsWith('^'))
                pattern = '^' + pattern;
            if (!pattern.endsWith('$'))
                pattern += '$';
            if (new RegExp(pattern).test(value))
                return { success: true };
        }

        for (const category of this.categories) {
            if (isNonTextResourceValueCategory(category)) {
                if (ResourceRepository.enumerateResourceFileNames(toResouceKind(category), documentPath).includes(value)) {
                    return { success: true };
                }

                errorMessage = `'${value}' does not exist.`;
            }
            else if (category === '#json-filename') {
                if (ResourceRepository.enumerateTextFileNames(documentPath, '.json').includes(value)) {
                    return { success: true };
                }

                errorMessage = `'${value}' does not exist.`;
            }
            else if (category == '#function') {
                if (FuncNameCache.getFuncNames(documentPath).includes(value)) {
                    return { success: true };
                }

                errorMessage =
                    `Unknown function name. Please make sure '${value}' is a top-level function name ` +
                    `defined in '${documentPath.substring(0, documentPath.length - 4) + 'js'}'.`;
            }
            else if (category == '#color') {
                if (isColorText(value)) {
                    return { success: true };
                }

                errorMessage = `Invalid color format.`;
            }
            else if (category == '#length') {
                const result = checkLength(value);
                if (result.success) {
                    return { success: true };
                }

                errorMessage = result.message;
            }
            else if (category == '#4-sided-length') {
                if (is4SidedLength(value)) {
                    return { success: true };
                }

                errorMessage = 'This attribute should have 1, 2 or 4 length values separated by whitespaces.';
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
        const suggestions = (() => {
            if (this.suggestions.length != 0)
                return this.suggestions.map(label => makeSuggestion(PropValueSuggestionIcon.Value, label));
            if (this.values.length != 0)
                return this.values.map(label => makeSuggestion(PropValueSuggestionIcon.EnumMember, label));
        })() ?? [];

        for (const category of this.categories) {
            if (isNonTextResourceValueCategory(category)) {
                ResourceRepository.enumerateResourceFileNames(toResouceKind(category), documentPath).forEach(resourceName => {
                    suggestions.push(makeSuggestion(PropValueSuggestionIcon.File, resourceName));
                });
            }
            else if (category === '#json-filename') {
                ResourceRepository.enumerateTextFileNames(documentPath, '.json').forEach(fileName => {
                    suggestions.push(makeSuggestion(PropValueSuggestionIcon.File, fileName));
                });
            }
            else if (category == '#function') {
                FuncNameCache.getFuncNames(documentPath).forEach(funcName => {
                    suggestions.push(makeSuggestion(PropValueSuggestionIcon.Function, funcName));
                });
            }
            else if (category == '#color' || category == '#length' || category == '#4-sided-length') {
                // do nothing
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

// function makeSnippetSuggestion(kind: PropValueSuggestionIcon, label: string, text: string): PropValueSuggestion {
//     return { label, text, icon: kind, isSnippet: true };
// }

function is4SidedLength(value: string): boolean {
    const arr = value.split(/\s+/);
    if (arr.length != 1 && arr.length != 2 && arr.length != 4) {
        return false;
    }
    for (const length of arr) {
        if (!checkLength(length))
            return false;
    }
    return true;
}