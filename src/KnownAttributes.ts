const KNOWN_ATTRIBUTES = require('../known-attributes.json')

export function getKnownAttributeValues(attributeName: string): string[] | undefined {
    return KNOWN_ATTRIBUTES[attributeName];
}
