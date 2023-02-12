import * as vscode from 'vscode';
import * as path from 'path';
import { readdirSync, existsSync } from 'fs';

const IMAGE_FOLDER_NAME = 'Images';
const AUDIO_FOLDER_NAME = 'Audios';
const VIDEO_FOLDER_NAME = 'Videos';
const TEXT_FOLDER_NAME = 'Texts';

export enum ResourceKind {
    Image, Audio, Video, Text
}

export class ResourceRepository {
    static init(context: vscode.ExtensionContext) {
        const globPattern = `**/{${[IMAGE_FOLDER_NAME, AUDIO_FOLDER_NAME, VIDEO_FOLDER_NAME].join(',')}}/*.*`;
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

    static enumerateImageNames(documentPath: string): string[] {
        return this.enumerateResourceNames(ResourceKind.Image, documentPath);
    }

    static enumerateResourceNames(kind: ResourceKind, documentPath: string): string[] {
        const resourceFolderName = (() => {
            if (kind == ResourceKind.Image) return IMAGE_FOLDER_NAME;
            if (kind == ResourceKind.Audio) return AUDIO_FOLDER_NAME;
            if (kind == ResourceKind.Video) return VIDEO_FOLDER_NAME;
            return TEXT_FOLDER_NAME;
        })();

        const resourceNames: string[] = [];

        const pathComponents = documentPath.split(path.sep);

        const currentResDirPath = (() => {
            pathComponents.pop();
            pathComponents.push(resourceFolderName);
            return pathComponents.join(path.sep);
        })();
        resourceNames.push(...this.getResourceNamesAtDirPath(currentResDirPath));

        const rootResDirPath = (() => {
            while (pathComponents.length > 0) {

                for (const projectFileName of ['catalog.bon', 'book.bon']) {
                    pathComponents.pop();
                    pathComponents.push(projectFileName);

                    const projectFilePath = pathComponents.join(path.sep);
                    if (existsSync(projectFilePath)) {
                        pathComponents.pop();
                        pathComponents.push(resourceFolderName);
                        return pathComponents.join(path.sep);
                    }
                }

                pathComponents.pop();
            }
        })();
        if (rootResDirPath) {
            this.getResourceNamesAtDirPath(rootResDirPath).forEach(name => {
                resourceNames.push('~/' + name);
            });
        }

        return resourceNames;
    }

    private static resourceNamesCache = new Map</*dirPath*/ string, /*imageNames*/ string[]>;

    private static getResourceNamesAtDirPath(dirPath: string): string[] {
        let imageNames = this.resourceNamesCache.get(dirPath);
        if (!imageNames) {
            const uniqueResNames = new Set<string>();
            readdirSync(dirPath).forEach(filename => {
                if (filename.startsWith('.'))
                    return;
                uniqueResNames.add(stripAtSuffix(filename));
            });
            imageNames = Array.from(uniqueResNames);
            this.resourceNamesCache.set(dirPath, imageNames);
        }
        return imageNames;
    }

    private static updateCache(filePath: string): void {
        if (isResourceFilePath(filePath)) {
            const pathComponents = filePath.split(path.sep);
            pathComponents.pop();
            const dirPath = pathComponents.join(path.sep);
            this.resourceNamesCache.delete(dirPath);
        }
    }
}

function isResourceFilePath(filePath: string): boolean {
    switch (filePath.split(path.sep).at(-2)) {
        case IMAGE_FOLDER_NAME:
        case AUDIO_FOLDER_NAME:
        case VIDEO_FOLDER_NAME:
        case TEXT_FOLDER_NAME:
            return true;
        default:
            return false;
    }
}

/// subview_btn_back@m.png -> subview_btn_back.png
function stripAtSuffix(filename: string): string {
    return filename.replace(/@[^.]+/, '');
}