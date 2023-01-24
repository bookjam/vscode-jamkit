export const SBML_PROP_LIST_PREFIX = /^\s*=(begin|style|object|image)(\s+([\.\w\-]+)\s*(:)?)/;
export const SBML_COMMENT = /^\s*=comment(\s+.*)?$/;
export const SBML_END = /^\s*=end(\s+(.+))?$/;

export const SBSS_PROP_LIST_PREFIX = /^\s*(@root|(#|%)[\.\w- ]+|\/[\/\.\w- ]+)\s*:/;
export const SBSS_PROP_BLOCK_PREFIX = /^\s*(@root|(#|%)[\.\w- ]+|\/[\/\.\w- ]+)\s*{/;
export const SBSS_PROP_BLOCK_SUFFIX = /^\s*}/;