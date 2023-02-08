import { assert } from 'console';
import { readFileSync } from 'fs';
import * as vscode from 'vscode';

/**
 * Keeps top-level function names in memory for *.js files.
 */
export class FuncNameCache {
    static init(context: vscode.ExtensionContext) {
        const watcher = vscode.workspace.createFileSystemWatcher('**/*.js', /*ignoreCreationEvents*/ true);
        watcher.onDidChange(event => this.removeCache(event.fsPath));
        watcher.onDidDelete(event => this.removeCache(event.fsPath));
        context.subscriptions.push(watcher);
    }

    private static cache = new Map<string, string[]>();

    static getFuncNames(documentPath: string): string[] {
        assert(documentPath.endsWith('.sbss') || documentPath.endsWith('.sbml'));

        const scriptFilePath = documentPath.substring(0, documentPath.length - 4) + 'js';

        let funcNames = this.cache.get(scriptFilePath);
        if (!funcNames) {
            funcNames = this.parseFuncNames(scriptFilePath);
            this.cache.set(scriptFilePath, funcNames);
        }
        return funcNames;
    }

    private static removeCache(filePath: string) {

        console.log(`${filePath} has changed. Cache invalidated.`);

        // invalidate cached variables
        this.cache.delete(filePath);
    }

    private static parseFuncNames(filePath: string): string[] {

        const TOP_LEVEL_FUNC_DEF = /^function\s+(\w[\w\d]+)\s*\(+/;

        const funcNames: string[] = [];

        try {
            const content = readFileSync(filePath, 'utf-8');
            content.split(/\r?\n/).forEach(text => {
                const m = text.match(TOP_LEVEL_FUNC_DEF);
                if (m) {
                    funcNames.push(m[1]);
                }
            });
        }
        catch (e) {
            console.error(e);
        }

        return funcNames;
    }
}