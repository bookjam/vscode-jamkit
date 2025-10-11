import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export class ProjectDetector {
    private static cache: Map<string, string | null> = new Map();

    static init(context: vscode.ExtensionContext): void {
        const watcher = vscode.workspace.createFileSystemWatcher("**/*.bon");

        watcher.onDidCreate(() => this.clearCache());
        watcher.onDidDelete(() => this.clearCache());

        context.subscriptions.push(watcher);
    }

    static async findProjectRoot(filePath: string): Promise<string | null> {
        const dir = path.dirname(filePath);

        if (this.cache.has(dir)) {
            return this.cache.get(dir)!;
        }

        const result = await this.findBonFile(dir);
        this.cache.set(dir, result);

        return result;
    }

    private static async findBonFile(dir: string): Promise<string | null> {
        const root = path.parse(dir).root;
        let currentDir = dir;

        while (currentDir !== root) {
            const packageBon = path.join(currentDir, "package.bon");
            const bookBon = path.join(currentDir, "book.bon");

            if (fs.existsSync(packageBon) || fs.existsSync(bookBon)) {
                return currentDir;
            }

            currentDir = path.dirname(currentDir);
        }

        return null;
    }

    private static clearCache(): void {
        this.cache.clear();
    }
}
