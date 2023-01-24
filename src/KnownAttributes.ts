const KNOWN_ATTRIBUTES = require('../known-attributes.json');

export enum PropTarget {
    Unknown,
    Section,
    BlockObject,
    InlineObject,
}

export function getKnownAttributeNames(_target: PropTarget): string[] {
    const names = Object.keys(KNOWN_ATTRIBUTES);
    return names ? names : [];
}

export function getKnownAttributeValues(_target: PropTarget, attributeName: string): string[] {
    return KNOWN_ATTRIBUTES[attributeName];
}
