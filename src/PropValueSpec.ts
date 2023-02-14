import { assert } from "console";
import { CompletionItemKind as PropValueSuggestionIcon } from "vscode";
import { AssetKind, AssetRepository } from "./AssetRepository";
import { VariableCache } from "./VariableCache";
import { ScriptNameCache } from "./ScriptNameCache";
import { isColorText } from "./utils";
import { checkLength } from "./Expression";

type NonTextAssetValueCategory = '#image-filename' | '#audio-filename' | '#video-filename' | '#sound-filename' | '#effect-filename';

function isNonTextResourceValueCategory(s: string): s is NonTextAssetValueCategory {
    return (
        s === '#image-filename' ||
        s === '#audio-filename' ||
        s === '#video-filename' ||
        s === '#sound-filename' ||
        s === '#effect-filename'
    );
}

function toResouceKind(valueCategory: NonTextAssetValueCategory):
    AssetKind.Image | AssetKind.Audio | AssetKind.Video | AssetKind.Sound | AssetKind.Effect {
    if (valueCategory == '#image-filename') return AssetKind.Image;
    if (valueCategory == '#audio-filename') return AssetKind.Audio;
    if (valueCategory == '#video-filename') return AssetKind.Video;
    if (valueCategory == '#sound-filename') return AssetKind.Sound;
    return AssetKind.Effect;
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
    '#font-size'
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
                if (AssetRepository.enumerateFileNames(toResouceKind(category), documentPath).includes(value)) {
                    return { success: true };
                }

                errorMessage = `'${value}' does not exist.`;
            }
            else if (category === '#json-filename') {
                if (AssetRepository.enumerateTextFileNames(documentPath, '.json').includes(value)) {
                    return { success: true };
                }

                errorMessage = `'${value}' does not exist.`;
            }
            else if (category == '#function') {
                const candidates = ScriptNameCache.getTopLevelFunctionNames(documentPath);
                if (candidates.includes(value)) {
                    return { success: true };
                }

                errorMessage =
                    `Please make sure '${value}' is a top-level function name ` +
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
            else if (category === '#font-size') {
                if (value.match(/^[0-9]+(\.[0-9]+)?(em)?$/)) {
                    return { success: true };
                }

                errorMessage = 'Invalid font size. A font size should be a number (usually, 0.5 ~ 5) with an optional "em" unit suffix. ex) 1.2, 0.8em';
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
                AssetRepository.enumerateFileNames(toResouceKind(category), documentPath).forEach(resourceName => {
                    suggestions.push(makeSuggestion(PropValueSuggestionIcon.File, resourceName));
                });
            }
            else if (category === '#json-filename') {
                AssetRepository.enumerateTextFileNames(documentPath, '.json').forEach(fileName => {
                    suggestions.push(makeSuggestion(PropValueSuggestionIcon.File, fileName));
                });
            }
            else if (category == '#function') {
                ScriptNameCache.getTopLevelFunctionNames(documentPath).forEach(funcName => {
                    suggestions.push(makeSuggestion(PropValueSuggestionIcon.Function, funcName));
                });
            }
            else if (category == '#color' || category == '#length' || category == '#4-sided-length') {
                // do nothing
            }
            else if (category == '#font-size') {
                ['1.2', '1.3', '1.5', '2.0', '2.5', '3.0'].forEach(fontSize => {
                    suggestions.push(makeSuggestion(PropValueSuggestionIcon.Value, fontSize));
                });
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