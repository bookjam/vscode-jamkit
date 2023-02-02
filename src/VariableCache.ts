import { readFileSync } from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';
import { assert } from 'console';
import { unquote } from './utils';
import { parseSbssVariableDefinition } from './patterns';

const IMPORT_PATTERN = /^\s*import\s+"?([\w-]+\.sbss)"?/;

export class VariableValues {
    private readonly map = new Map<string, string[]>();

    get size(): number {
        return this.map.size;
    }

    add(name: string, value: string): void {
        const values = this.map.get(name) ?? [];
        if (!values.includes(value)) {
            values.push(value);
            this.map.set(name, values);
        }
    }

    merge(other: VariableValues): void {
        other.forEach((values, name) => this.map.set(name, values));
    }

    forEach(callback: (values: string[], name: string) => void): void {
        this.map.forEach(callback);
    }
}

type VariableMap = Map</*filePath*/ string, VariableValues>;
type DependencyMap = Map</*filePath*/ string, /*dependentFilePaths*/ string[]>;

export class VariableCache {
    static init(context: vscode.ExtensionContext) {
        const watcher = vscode.workspace.createFileSystemWatcher('**/*.sbss', /*ignoreCreationEvents*/ true);
        watcher.onDidChange(event => this.removeCache(event.fsPath));
        watcher.onDidDelete(event => this.removeCache(event.fsPath));
        context.subscriptions.push(watcher);
    }

    private static cache: VariableMap = new Map();
    private static depencencyMap: DependencyMap = new Map();

    static getVariables(documentPath: string): VariableValues {
        assert(documentPath.endsWith('.sbml'));

        const filePath = documentPath.substring(0, documentPath.length - 4) + 'sbss';
        // console.log(`======= ${filePath} ========`);
        // this.getValueMap(filePath).forEach((values, name) => {
        //     console.log(`${name}: ${values}`);
        // });
        return this.getValueMap(filePath);
    }

    private static removeCache(filePath: string) {

        console.log(`${filePath} has changed. Cache invalidated.`);

        // invalidate cached variables
        this.cache.delete(filePath);

        // if filePath was dependening on other files, clear that.
        // it will be re-parsed and re
        this.depencencyMap.forEach((files, _) => {
            const index = files.indexOf(filePath);
            if (index >= 0) {
                files.splice(index, 1);
            }
        });

        const dependentFiles = this.depencencyMap.get(filePath);
        if (dependentFiles) {
            console.log('Also invalidating cache for the following files:');
            dependentFiles.forEach(filePath => {
                console.log(`- ${filePath}`);
                this.removeCache(filePath);
            });
        }
    }

    private static parsingFiles = new Set<string>(); // recursive import detection

    private static getValueMap(filePath: string): VariableValues {
        let valueMap = this.cache.get(filePath);
        if (!valueMap) {
            valueMap = this.parseValueMap(filePath);
            this.cache.set(filePath, valueMap);
        }
        return valueMap;
    }

    private static parseValueMap(filePath: string): VariableValues {

        const valueMap = new VariableValues();

        if (!this.parsingFiles.has(filePath)) {
            this.parsingFiles.add(filePath);

            try {
                const content = readFileSync(filePath, 'utf-8');
                content.split(/\r?\n/).forEach((text, line) => {

                    const varDef = parseSbssVariableDefinition(text);
                    if (varDef) {
                        if (varDef.value.length == 0)
                            return;

                        valueMap.add(varDef.name, varDef.value);
                    }
                    else {
                        const m = text.match(IMPORT_PATTERN);
                        if (m) {
                            const fileName = m[1];
                            const importFilePath = filePath.substring(0, filePath.lastIndexOf(path.sep) + 1) + fileName;
                            valueMap.merge(this.getValueMap(importFilePath));

                            this.updateDependencyMap(importFilePath, filePath);
                        }
                    }
                });
            } catch (e) {
                // NOOP
            }

            this.parsingFiles.delete(filePath);
        }

        return valueMap;
    }

    private static updateDependencyMap(importeePath: string, importerPath: string) {
        const dependentFilePaths = this.depencencyMap.get(importeePath) ?? [];
        if (!dependentFilePaths.includes(importerPath)) {
            dependentFilePaths.push(importerPath);
            this.depencencyMap.set(importeePath, dependentFilePaths);
        }
    }
}