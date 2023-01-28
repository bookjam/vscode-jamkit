import * as vscode from "vscode";
import { readdirSync } from 'fs';
import { assert } from "console";
import { PropTarget, PropTargetKind } from "./PropTarget";
import { PropValueSpec } from "./PropValueSpec";

export class PropConfig {
    private readonly map = new Map<string, PropValueSpec>();

    static fromJSON(json: any): PropConfig {
        const config = new PropConfig();
        Object.entries(json).forEach(entry => {
            config.map.set(entry[0], PropValueSpec.from(entry[1] as any));
        });
        return config;
    }

    get propNames(): string[] {
        return Array.from(this.map.keys());
    }

    get(propName: string): PropValueSpec | undefined {
        return this.map.get(propName);
    }

    merge(propName: string, valueSpec: PropValueSpec): void {
        const existingSpec = this.map.get(propName);
        if (existingSpec) {
            existingSpec.merge(valueSpec);
        }
        else {
            const newSpec = PropValueSpec.from({});
            newSpec.merge(valueSpec);
            this.map.set(propName, newSpec);
        }
    }

    forEach(callback: (value: PropValueSpec, key: string) => void): void {
        this.map.forEach(callback);
    }
}

export class PropConfigStore {
    private static readonly globalConfig = new PropConfig();
    private static readonly configMap = new Map</*filename*/string, PropConfig>();

    static init(context: vscode.ExtensionContext): void {
        const configDirs = ['attributes', 'attributes/objects'];
        configDirs.forEach(configDir => {
            readdirSync(`${context.extensionPath}/${configDir}`).forEach(filename => {
                if (!filename.endsWith('.json'))
                    return;
                try {
                    const json = require(`../${configDir}/${filename}`);
                    const config = PropConfig.fromJSON(json);
                    this.configMap.set(filename, config);

                    config.forEach((valueSpec, propName) => {
                        this.globalConfig.merge(propName, valueSpec);
                    });
                } catch (e) {
                    console.error(e);
                }
            });
        });
    }

    static getKnownPropNames(target: PropTarget): string[] {
        if (target.kind == PropTargetKind.Unknown) {
            return this.globalConfig.propNames;
        }

        const propNameSet = new Set<string>();
        this.getPropFileSequence(target).forEach(filename => {
            const config = this.configMap.get(filename);
            if (config) {
                config.propNames.forEach(propName => {
                    propNameSet.add(propName);
                });
            }
        });
        return Array.from(propNameSet);
    }

    static getPropValueSpec(target: PropTarget, propName: string): PropValueSpec | undefined {
        if (target.kind == PropTargetKind.Unknown) {
            return this.globalConfig.get(propName);
        }
        else {
            for (let filename of this.getPropFileSequence(target)) {
                const config = this.configMap.get(filename);
                if (config) {
                    const valueSpec = config.get(propName);
                    if (valueSpec) {
                        return valueSpec;
                    }
                }
            }
        }
    }

    private static getPropFileSequence(target: PropTarget): string[] {
        if (target.kind == PropTargetKind.Text) {
            return ['core.text.json', 'core.common.json'];
        }

        if (target.kind == PropTargetKind.Section) {
            return ['core.section.json', 'core.box.json', 'core.common.json'];
        }

        if (target.kind == PropTargetKind.BlockObject) {
            const sequence = [`core.object.block.json`, 'core.object.json', 'core.box.json', 'core.common.json'];
            if (target.objectType) {
                return [`${target.objectType}.json`].concat(sequence);
            }
            return sequence;
        }

        if (target.kind == PropTargetKind.InlineObject) {
            const sequence = [`core.object.inline.json`, 'core.object.json', 'core.common.json'];
            if (target.objectType) {
                return [`${target.objectType}.json`].concat(sequence);
            }
            return sequence;
        }

        assert(target.kind == PropTargetKind.Unknown);
        return Array.from(this.configMap.keys());
    }
}

