import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { ProjectDetector } from "./ProjectDetector";
import { TypeScriptPathResolver } from "./TypeScriptPathResolver";

export class TypeScriptPlugin {
    private api: any;
    private configuredProjects: Set<string> = new Set();

    public async activate(context: vscode.ExtensionContext): Promise<void> {
        const tsExtension = vscode.extensions.getExtension("vscode.typescript-language-features");

        if (!tsExtension) {
            console.warn("TypeScript extension not found");
            return;
        }

        if (!tsExtension.isActive) {
            await tsExtension.activate();
        }

        this.api = tsExtension.exports;

        if (!this.api) {
            console.warn("TypeScript API not available");
            return;
        }

        vscode.window.onDidChangeActiveTextEditor(async (editor) => {
            if (editor && editor.document.languageId === "typescript") {
                await this.onTypeScriptFileOpened(editor.document);
            }
        }, null, context.subscriptions);

        const activeEditor = vscode.window.activeTextEditor;

        if (activeEditor && activeEditor.document.languageId === "typescript") {
            await this.onTypeScriptFileOpened(activeEditor.document);
        }
    }

    private async onTypeScriptFileOpened(document: vscode.TextDocument): Promise<void> {
        const filePath = document.uri.fsPath;
        const projectRoot = await ProjectDetector.findProjectRoot(filePath);

        if (projectRoot && !this.configuredProjects.has(projectRoot)) {
            await this.configureTypeScript(projectRoot);
            this.configuredProjects.add(projectRoot);
        }
    }

    private async configureTypeScript(projectRoot: string): Promise<void> {
        const jamkitTypesPath = TypeScriptPathResolver.getJamkitTypesPath();

        if (!jamkitTypesPath) {
            console.warn("Jamkit types path not found");
            return;
        }

        const tsConfigPath = path.join(projectRoot, "tsconfig.json");
        let tsConfig: any = {};

        if (fs.existsSync(tsConfigPath)) {
            const content = fs.readFileSync(tsConfigPath, "utf-8");
            try {
                tsConfig = JSON.parse(content);
            } catch (error) {
                console.error("Failed to parse tsconfig.json:", error);
                return;
            }
        }

        tsConfig.compilerOptions = tsConfig.compilerOptions || {};
        tsConfig.compilerOptions.typeRoots = tsConfig.compilerOptions.typeRoots || [];

        if (!tsConfig.compilerOptions.typeRoots.includes(jamkitTypesPath)) {
            tsConfig.compilerOptions.typeRoots.push(jamkitTypesPath);

            try {
                fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2), "utf-8");
                console.log(`Updated tsconfig.json at ${tsConfigPath}`);
            } catch (error) {
                console.error("Failed to write tsconfig.json:", error);
            }
        }
    }
}
