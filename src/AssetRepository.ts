import * as vscode from "vscode";
import * as path from "path";
import { readdirSync, existsSync } from "fs";

export enum AssetKind {
    Image, Audio, Video, Sound, Effect, Text
}

const ASSET_DIR_NAMES = [
    toAssetDirName(AssetKind.Image),
    toAssetDirName(AssetKind.Audio),
    toAssetDirName(AssetKind.Video),
    toAssetDirName(AssetKind.Sound),
    toAssetDirName(AssetKind.Effect),
    toAssetDirName(AssetKind.Text)
];

export type NonTextAssetKind = AssetKind.Image | AssetKind.Audio | AssetKind.Video | AssetKind.Sound | AssetKind.Effect;

export class AssetRepository {
    static init(context: vscode.ExtensionContext) {
        const globPattern = `**/{${ASSET_DIR_NAMES.join(',')}}/*.*`;
        const watcher = vscode.workspace.createFileSystemWatcher(
            globPattern,
            /*ignoreCreateEvents*/ false,
            /*ignoreChangeEvents*/ true,
            /*ignoreDeleteEvents*/ false
        );
        watcher.onDidCreate(event => this.updateCache(event.fsPath));
        watcher.onDidDelete(event => this.updateCache(event.fsPath));
        context.subscriptions.push(watcher);
    }

    static enumerateImageFileNames(documentPath: string): string[] {
        return this.enumerateFileNames(AssetKind.Image, documentPath);
    }

    static enumerateTextFileNames(documentPath: string, suffix: string | undefined): string[] {
        return this.enumerateFileNames(AssetKind.Text, documentPath, suffix);
    }

    static enumerateFileNames(kind: AssetKind, documentPath: string, suffix: string | undefined = undefined): string[] {

        const assetDirName = toAssetDirName(kind);

        const assetNames: string[] = [];

        const pathComponents = documentPath.split(path.sep);

        const currentAssetDirPath = (() => {
            pathComponents.pop();
            pathComponents.push(assetDirName);
            return pathComponents.join(path.sep);
        })();
        for (const name of this.getAssetNamesAtDirPath(currentAssetDirPath)) {
            if (suffix === undefined || name.endsWith(suffix)) {
                assetNames.push(name);
            }
        }

        const rootAssetDirPath = (() => {
            while (pathComponents.length > 0) {

                for (const projectFileName of [ "catalog.bon", "book.bon" ]) {
                    pathComponents.pop();
                    pathComponents.push(projectFileName);

                    const projectFilePath = pathComponents.join(path.sep);
                    if (existsSync(projectFilePath)) {
                        pathComponents.pop();
                        pathComponents.push(assetDirName);
                        return pathComponents.join(path.sep);
                    }
                }

                pathComponents.pop();
            }
        })();
        if (rootAssetDirPath) {
            this.getAssetNamesAtDirPath(rootAssetDirPath).forEach(name => {
                if (suffix === undefined || name.endsWith(suffix)) {
                    assetNames.push("~/" + name);
                }
            });
        }

        return assetNames;
    }

    private static assetNamesCache = new Map</*dirPath*/ string, /*imageNames*/ string[]>;

    private static getAssetNamesAtDirPath(dirPath: string): string[] {
        let assetNames = this.assetNamesCache.get(dirPath);
        if (!assetNames) {
            const uniqueNames = new Set<string>();
            readdirSync(dirPath).forEach(filename => {
                if (filename.startsWith("."))
                    return;
                uniqueNames.add(stripAtSuffix(filename));
            });
            assetNames = Array.from(uniqueNames);
            this.assetNamesCache.set(dirPath, assetNames);
        }
        return assetNames;
    }

    private static updateCache(filePath: string): void {
        if (isAssetFilePath(filePath)) {
            const pathComponents = filePath.split(path.sep);
            pathComponents.pop();
            const dirPath = pathComponents.join(path.sep);
            this.assetNamesCache.delete(dirPath);
        }
    }
}

function isAssetFilePath(filePath: string): boolean {
    const dirName = filePath.split(path.sep).at(-2);
    return dirName !== undefined && ASSET_DIR_NAMES.includes(dirName);
}

/// subview_btn_back@m.png -> subview_btn_back.png
function stripAtSuffix(filename: string): string {
    return filename.replace(/@[^.]+/, '');
}

function toAssetDirName(kind: AssetKind): string {
    return AssetKind[kind] + 's';
}