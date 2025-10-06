import * as vscode from "vscode";
import * as path from "path";

export class ProjectDetector {
    private cache: Map<string, boolean> = new Map();
    private fileWatcher: vscode.FileSystemWatcher | null = null;

    public async isJamkitProject(filePath: string): Promise<boolean> {
        const dir = path.dirname(filePath);

        if (this.cache.has(dir)) {
            return this.cache.get(dir)!;
        }

        const result = await this.findBonFile(dir);
        this.cache.set(dir, result);

        return result;
    }

    private async findBonFile(dir: string): Promise<boolean> {
        let currentDir = dir;
        const root = path.parse(currentDir).root;

        while (currentDir !== root) {
            const packageBon = path.join(currentDir, "package.bon");
            const bookBon = path.join(currentDir, "book.bon");

            try {
                await vscode.workspace.fs.stat(vscode.Uri.file(packageBon));
                return true;
            } catch {
                // File doesn't exist, continue
            }

            try {
                await vscode.workspace.fs.stat(vscode.Uri.file(bookBon));
                return true;
            } catch {
                // File doesn't exist, continue
            }

            const parentDir = path.dirname(currentDir);

            if (parentDir === currentDir) {
                break; // Reached root
            }

            currentDir = parentDir;
        }

        return false;
    }

    public initializeWatcher(context: vscode.ExtensionContext): void {
        this.fileWatcher = vscode.workspace.createFileSystemWatcher("**/*.bon");

        this.fileWatcher.onDidCreate(() => this.clearCache());
        this.fileWatcher.onDidDelete(() => this.clearCache());

        context.subscriptions.push(this.fileWatcher);
    }

    public clearCache(): void {
        this.cache.clear();
    }

    public dispose(): void {
        this.fileWatcher?.dispose();
        this.cache.clear();
    }
}
