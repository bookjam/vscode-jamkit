import { stringify } from "querystring";

const KNOWN_ATTRIBUTES = require('../attributes/object.block.json');

const PROP_FILE_MAP = new Map<string, object>();

export enum PropTargetKind {
    Unknown,
    Text,
    Section,
    BlockObject,
    InlineObject,
}

export interface PropTarget {
    kind: PropTargetKind;
    objectType?: string;
}

function loadPropFile(filename: string): object {
    const obj = PROP_FILE_MAP.get(filename);
    if (obj) {
        return obj;
    }

    PROP_FILE_MAP.set(filename, (() => {
        try {
            return require(`../attributes/${filename}`);
        }
        catch (e) {
            return {};
        }
    })());
    return PROP_FILE_MAP.get(filename)!;
}

export function getKnownPropNames(target: PropTarget): string[] {

    if (target.kind == PropTargetKind.Unknown) {
        // enumerate names from all files
    } else {

    }

    const propFileSequence = (() => {
        switch (target.kind) {
            case PropTargetKind.Text:
                return ['text.json', 'common.json'];
            case PropTargetKind.Section:
                return ['section.json', 'common.json'];
            case PropTargetKind.BlockObject:
                return ['object.block.json', 'object.json', 'common.json'];
            case PropTargetKind.InlineObject:
                return ['object.inline.json', 'object.json', 'common.json'];
        }
    })();
    const names = Object.keys(KNOWN_ATTRIBUTES);
    return names ? names : [];
}

export function getKnownPropValues(_target: PropTarget, propName: string): string[] {
    return KNOWN_ATTRIBUTES[propName];
}
