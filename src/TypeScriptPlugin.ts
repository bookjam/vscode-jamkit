import * as vscode from "vscode";
import { ProjectDetector } from "./ProjectDetector";
import { TypeScriptPathResolver } from "./TypeScriptPathResolver";

export class TypeScriptPlugin {
    private projectDetector: ProjectDetector;
    private api: any;

    constructor(projectDetector: ProjectDetector) {
        this.projectDetector = projectDetector;
    }

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

        await this.configureTypeScript();

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

    private async configureTypeScript(): Promise<void> {
        const jamkitTypesPath = TypeScriptPathResolver.getJamkitTypesPath();

        if (!jamkitTypesPath) {
            console.warn("Jamkit types path not found");
            return;
        }

        if (this.api && this.api.configurePlugin) {
            try {
                await this.api.configurePlugin("typescript-jamkit-plugin", {
                    typesPath: jamkitTypesPath
                });
            } catch (error) {
                console.error("Failed to configure TypeScript plugin:", error);
            }
        }
    }

    private async onTypeScriptFileOpened(document: vscode.TextDocument): Promise<void> {
        const filePath = document.uri.fsPath;
        const isJamkitProject = await this.projectDetector.isJamkitProject(filePath);

        if (isJamkitProject) {
            await this.updateTypeScriptConfig(document.uri);
        }
    }

    private async updateTypeScriptConfig(uri: vscode.Uri): Promise<void> {
        const config = vscode.workspace.getConfiguration("typescript", uri);
        const currentTypeRoots = config.get<string[]>("tsserver.typeRoots") || [];
        const jamkitTypesPath = TypeScriptPathResolver.getJamkitTypesPath();

        if (jamkitTypesPath && !currentTypeRoots.includes(jamkitTypesPath)) {
            const updatedTypeRoots = [ ...currentTypeRoots, jamkitTypesPath ];
            console.log(updatedTypeRoots)

            try {
                await config.update(
                    "tsserver.typeRoots",
                    updatedTypeRoots,
                    vscode.ConfigurationTarget.Workspace
                );
            } catch (error) {
                console.error("Failed to update TypeScript configuration:", error);
            }
        }
    }
}
