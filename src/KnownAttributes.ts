const KNOWN_ATTRIBUTES = require('../known-attributes.json');

export function getKnownAttributeNames(): string[] | undefined {
    return Object.keys(KNOWN_ATTRIBUTES);
}

export function getKnownAttributeValues(attributeName: string): string[] | undefined {
    return KNOWN_ATTRIBUTES[attributeName];
}
