import { unquote } from "./utils";

export const SBML_PROP_LIST_PREFIX = /^\s*=(begin|style|object|image)\s+((~\/)?[\.\w\-]+)\s*(:)?/;
export const SBML_COMMENT = /^\s*=comment(\s+.*)?$/;
export const SBML_END = /^\s*=end(\s+(.+))?$/;
export const SBML_INLINE_OBJECT_PREFIX = /(object|image)\s+((~\/)?[\.\w\-]+)\s*:/;

export const SBSS_PROP_GROUP_PREFIX = /^\s*(@root|(#|%)[\.\w- ]+|\/[\/\.\w- ]+)\s*(:|{)/;
export const SBSS_PROP_LIST_PREFIX = /^\s*(@root|(#|%)[\.\w- ]+|\/[\/\.\w- ]+)\s*:/;
export const SBSS_PROP_BLOCK_PREFIX = /^\s*(@root|(#|%)[\.\w- ]+|\/[\/\.\w- ]+)\s*{/;
export const SBSS_PROP_BLOCK_SUFFIX = /^\s*}/;

const SBSS_VARIABLE_DEFINITION_PREFIX = /^\s*\$([A-Z_]+)\s*=/;

export function parseSbssVariableDefinition(text: string): { name: string, value: string; } | undefined {
    const m = text.match(SBSS_VARIABLE_DEFINITION_PREFIX);
    if (m) {
        const name = m[1];
        const value = unquote(text.substring(text.indexOf('=') + 1).trim());
        return { name, value };
    }
}