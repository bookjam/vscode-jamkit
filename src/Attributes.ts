import { assert } from "console";
import * as fs from 'node:fs';
import { getExtensionPath } from "./extension";

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

export function getKnownPropNames(target: PropTarget): string[] {
    const propNameSet = new Set<string>();
    getPropFileSequence(target).forEach(filename => {
        const obj = getPropFileMap().get(filename);
        if (obj) {
            Object.keys(obj).forEach(propName => propNameSet.add(propName));
        }
    });
    return Array.from(propNameSet);
}

export function getKnownPropValues(target: PropTarget, propName: string): string[] {
    if (target.kind == PropTargetKind.Unknown) {

    } else {

    }
    return [];
}

const _PROP_FILE_MAP = new Map<string, object>();
function getPropFileMap(): Map<string, object> {
    if (_PROP_FILE_MAP.size == 0) {
        fs.readdirSync(`${getExtensionPath()}/attributes`).forEach(file => {
            const obj = require(`../attributes/${file}`);
            _PROP_FILE_MAP.set(file, obj);
        });
    }
    return _PROP_FILE_MAP;
};

function getPropFileSequence(target: PropTarget): string[] {
    if (target.kind == PropTargetKind.Text) {
        return ['text.json', 'common.json'];
    }

    if (target.kind == PropTargetKind.Section) {
        return ['section.json', 'common.json'];
    }

    if (target.kind == PropTargetKind.BlockObject || target.kind == PropTargetKind.InlineObject) {
        const display = target.kind == PropTargetKind.BlockObject ? "block" : "inline";
        if (target.objectType) {
            return [
                `object-${target.objectType}.json`,
                `object.${display}.json`,
                'object.json',
                'common.json'
            ];
        }
        return [`object.${display}.json`, 'object.json', 'common.json'];
    }

    assert(target.kind == PropTargetKind.Unknown);
    return Array.from(getPropFileMap().keys());
}
