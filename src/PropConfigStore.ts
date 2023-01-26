import * as vscode from "vscode";
import { readdirSync } from 'node:fs';
import { assert } from "console";
import { PropTarget, PropTargetKind } from "./PropTarget";
import { PropValueSpec } from "./PropValueSpec";

export class PropConfig {
    private readonly entries = new Map<string, PropValueSpec>();

    static fromJSON(json: any): PropConfig {
        const config = new PropConfig();
        Object.entries(json).forEach(entry => {
            config.entries.set(entry[0], PropValueSpec.from(entry[1] as any));
        });
        return config;
    }

    get propNames(): string[] {
        return Array.from(this.entries.keys());
    }

    get(propName: string): PropValueSpec | undefined {
        return this.entries.get(propName);
    }
}

export class PropConfigStore {
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
                } catch (e) {
                    console.error(e);
                }
            });
        });
    }

    static getKnownPropNames(target: PropTarget): string[] {
        const propNameSet = new Set<string>();
        if (target.kind == PropTargetKind.Unknown) {
            this.configMap.forEach(config => {
                config.propNames.forEach(propName => propNameSet.add(propName));
            });
        } else {
            this.getPropFileSequence(target).forEach(filename => {
                const config = this.configMap.get(filename);
                if (config) {
                    config.propNames.forEach(propName => propNameSet.add(propName));
                }
            });
        }
        return Array.from(propNameSet);
    }

    static getKnownPropValues(target: PropTarget, propName: string): string[] {
        const valueSet = new Set<string>();
        if (target.kind == PropTargetKind.Unknown) {
            this.configMap.forEach(config => {
                const valueSpec = config.get(propName);
                valueSpec?.getSuggestions()?.forEach(value => valueSet.add(value));
            });
        } else {
            this.getPropFileSequence(target).forEach(filename => {
                const config = this.configMap.get(filename);
                if (config) {
                    const valueSpec = config.get(propName);
                    valueSpec?.getSuggestions()?.forEach(value => valueSet.add(value));
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
        return Array.from(this.configMap.keys());
    }

}

