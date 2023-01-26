import * as vscode from "vscode";
import { readdirSync } from 'node:fs';
import { assert } from "console";
import { PropTarget, PropTargetKind } from "./PropTarget";
import { PropValueSpec } from "./PropValueSpec";

export class PropConfigStore {
    private static extensionPath: string;
    private static readonly propFileMap = new Map<string, Map<string, any>>();

    static init(context: vscode.ExtensionContext): void {
        this.extensionPath = context.extensionPath;

        const proConfigDirs = ['attributes', 'attributes/objects'];

        proConfigDirs.forEach(propConfigDir => {
            readdirSync(`${this.extensionPath}/${propConfigDir}`).forEach(filename => {
                if (!filename.endsWith('.json'))
                    return;
                const json = require(`../${propConfigDir}/${filename}`);
                try {
                    const config = new Map<string, any>(Object.entries(json));
                    this.propFileMap.set(filename, config);
                } catch (e) {
                    console.error(e);
                }
            });
        });
    }

    static getKnownPropNames(target: PropTarget): string[] {
        const propNameSet = new Set<string>();
        if (target.kind == PropTargetKind.Unknown) {
            this.propFileMap.forEach(config => {
                Array.from(config.keys()).forEach(propName => propNameSet.add(propName));
            });
        } else {
            this.getPropFileSequence(target).forEach(filename => {
                const config = this.propFileMap.get(filename);
                if (config) {
                    Array.from(config.keys()).forEach(propName => propNameSet.add(propName));
                }
            });
        }
        return Array.from(propNameSet);
    }

    static getKnownPropValues(target: PropTarget, propName: string): string[] {
        const valueSet = new Set<string>();
        if (target.kind == PropTargetKind.Unknown) {
            this.propFileMap.forEach(config => {
                const propValues = config.get(propName);
                if (Array.isArray(propValues)) {
                    propValues.forEach(value => valueSet.add(value));
                }
            });
        } else {
            this.getPropFileSequence(target).forEach(filename => {
                const config = this.propFileMap.get(filename);
                if (config) {
                    const propValues = config.get(propName);
                    if (Array.isArray(propValues)) {
                        propValues.forEach(value => valueSet.add(value));
                    }

                    else if (propValues != undefined) {
                        PropValueSpec.from(propValues);
                    }
                }
            });
        }
        return Array.from(valueSet);
    }

    private static getPropFileSequence(target: PropTarget): string[] {
        if (target.kind == PropTargetKind.Text) {
            return ['core.text.json', 'core.common.json'];
        }

        if (target.kind == PropTargetKind.Section) {
            return ['core.section.json', 'core.common.json'];
        }

        if (target.kind == PropTargetKind.BlockObject || target.kind == PropTargetKind.InlineObject) {
            const display = target.kind == PropTargetKind.BlockObject ? "block" : "inline";
            if (target.objectType) {
                return [
                    `${target.objectType}.json`,
                    `core.object.${display}.json`,
                    'core.object.json',
                    'core.common.json'
                ];
            }
            return [`core.object.${display}.json`, 'core.object.json', 'core.common.json'];
        }

        assert(target.kind == PropTargetKind.Unknown);
        return Array.from(this.propFileMap.keys());
    }

}

