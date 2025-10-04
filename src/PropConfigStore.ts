import * as vscode from "vscode";
import { readdirSync, readFileSync } from "fs";
import { assert } from "console";
import { PropTarget, PropTargetKind } from "./PropTarget";
import { PropValueSpec } from "./PropValueSpec";
import * as path from "path";

class PropConfig {
    private readonly map;

    constructor(map?: Map<string, PropValueSpec>) {
        this.map = map ?? new Map<string, PropValueSpec>();
    }

    static fromJsonPath(jsonPath: string): PropConfig | undefined {
        try {
            const json = JSON.parse(readFileSync(jsonPath, "utf-8"));
            const config = new PropConfig();
            Object.entries(json).forEach(entry => {
                if (entry[0] == "@import") {
                    const filenames = entry[1] as string[];
                    filenames.forEach(filename => {
                        const pathComponents = jsonPath.split(path.sep);
                        pathComponents.pop();
                        pathComponents.push(filename);
                        const importPath = pathComponents.join(path.sep);
                        this.fromJsonPath(importPath)?.forEach((value, key) => config.map.set(key, value));
                    });
                }
                else {
                    config.map.set(entry[0], PropValueSpec.from(entry[1] as object));
                }
            });
            return config;
        } catch (e) {
            console.error(e);
        }

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
    private static readonly objectTypes: string[] = [];

    static init(context: vscode.ExtensionContext): void {
        const configDirs = [ "attributes", "attributes/objects" ];
        configDirs.forEach((configDir, index) => {
            const isObjectDir = index == 1;
            readdirSync(`${context.extensionPath}/${configDir}`).forEach(filename => {
                if (!filename.endsWith(".json") || filename.startsWith("_"))
                    return;
                if (isObjectDir) {
                    this.objectTypes.push(filename.substring(0, filename.length - 5));
                }

                const config = PropConfig.fromJsonPath(`${context.extensionPath}/${configDir}/${filename}`);
                if (config) {
                    this.configMap.set(filename, config);
                    config.forEach((valueSpec, propName) => {
                        this.globalConfig.merge(propName, valueSpec);
                    });
                }
            });
        });
    }

    static getKnownObjectTypes(): string[] {
        return this.objectTypes;
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

        for (const filename of this.getPropFileSequence(target)) {
            const valueSpec = this.configMap.get(filename)?.get(propName);
            if (valueSpec) {
                return valueSpec;
            }
        }

        if (propName === "script" || propName.startsWith("script-when-") || propName.endsWith("-script")) {
            return PropValueSpec.from("#function");
        }

        if (propName === "sound" || propName.startsWith("sound-when-")) {
            return PropValueSpec.from("#sound-filename");
        }
    }

    private static getPropFileSequence(target: PropTarget): string[] {
        if (target.kind == PropTargetKind.Text) {
            return [ "core.text.json", "core.common.json" ];
        }

        if (target.kind == PropTargetKind.Section) {
            return [ "core.section.json", "core.box.json", "core.common.json" ];
        }

        if (target.kind == PropTargetKind.BlockObject) {
            const sequence = [ "core.object.block.json", "core.object.json", "core.box.json", "core.common.json" ];
            if (target.objectType) {
                return [`${target.objectType}.json`].concat(sequence);
            }
            return sequence;
        }

        if (target.kind == PropTargetKind.InlineObject) {
            const sequence = [ "core.object.inline.json", "core.object.json", "core.common.json" ];
            if (target.objectType) {
                return [`${target.objectType}.json`].concat(sequence);
            }
            return sequence;
        }

        assert(target.kind == PropTargetKind.Unknown);
        return Array.from(this.configMap.keys());
    }
}

