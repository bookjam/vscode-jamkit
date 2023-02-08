import { assert } from 'console';
import { readFileSync } from 'fs';
import * as vscode from 'vscode';
import * as acorn from 'acorn';

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

        const funcNames: string[] = [];

        try {
            const content = readFileSync(filePath, 'utf-8');
            const program = acorn.parse(content, { ecmaVersion: 'latest' });
            if ('body' in program) {
                (program.body as acorn.Node[]).forEach(node => {
                    console.log(node);
                    if (node.type === 'FunctionDeclaration') {
                        const funcName = getNodeIdName(node);
                        if (funcName)
                            funcNames.push(funcName);
                    }
                    else if (node.type === 'VariableDeclaration' && 'declarations' in node) {
                        (node.declarations as acorn.Node[]).forEach(node => {
                            if (node.type !== 'VariableDeclarator')
                                return;
                            if ('init' in node && node.init instanceof acorn.Node && node.init.type === 'ArrowFunctionExpression') {
                                const funcName = getNodeIdName(node);
                                if (funcName)
                                    funcNames.push(funcName);
                            }
                        });
                    }
                });
            }
        }
        catch (e) {
            console.error(e);
        }

        return funcNames;
    }
}

function getNodeIdName(node: acorn.Node): string | undefined {
    if ('id' in node && node.id instanceof acorn.Node &&
        'name' in node.id && typeof node.id.name === 'string') {
        return node.id.name;
    }
}