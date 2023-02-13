import * as vscode from 'vscode';
import * as path from 'path';
import { readdirSync, existsSync } from 'fs';

const IMAGE_FOLDER_NAME = 'Images';
const AUDIO_FOLDER_NAME = 'Audios';
const VIDEO_FOLDER_NAME = 'Videos';
const SOUND_FOLDER_NAME = 'Sounds';
const EFFECT_FOLDER_NAME = 'Effects';
const TEXT_FOLDER_NAME = 'Texts';

const ALL_FOLDER_NAMES = [
    IMAGE_FOLDER_NAME,
    AUDIO_FOLDER_NAME,
    VIDEO_FOLDER_NAME,
    SOUND_FOLDER_NAME,
    EFFECT_FOLDER_NAME,
    TEXT_FOLDER_NAME
];

export enum ResourceKind {
    Image, Audio, Video, Sound, Effect, Text
}

export type NonTextResourceKind = ResourceKind.Image | ResourceKind.Audio | ResourceKind.Video | ResourceKind.Sound | ResourceKind.Effect;

export class ResourceRepository {
    static init(context: vscode.ExtensionContext) {
        const globPattern = `**/{${ALL_FOLDER_NAMES.join(',')}}/*.*`;
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
        return this.enumerateResourceFileNames(ResourceKind.Image, documentPath);
    }

    static enumerateTextFileNames(documentPath: string, suffix: string | undefined): string[] {
        return this.enumerateResourceFileNames(ResourceKind.Text, documentPath, suffix);
    }

    static enumerateResourceFileNames(kind: ResourceKind, documentPath: string, suffix: string | undefined = undefined): string[] {

        const resourceDirName = toResourceDirName(kind);

        const resourceNames: string[] = [];

        const pathComponents = documentPath.split(path.sep);

        const currentResDirPath = (() => {
            pathComponents.pop();
            pathComponents.push(resourceDirName);
            return pathComponents.join(path.sep);
        })();
        for (const name of this.getResourceNamesAtDirPath(currentResDirPath)) {
            if (suffix === undefined || name.endsWith(suffix)) {
                resourceNames.push(name);
            }
        }

        const rootResDirPath = (() => {
            while (pathComponents.length > 0) {

                for (const projectFileName of ['catalog.bon', 'book.bon']) {
                    pathComponents.pop();
                    pathComponents.push(projectFileName);

                    const projectFilePath = pathComponents.join(path.sep);
                    if (existsSync(projectFilePath)) {
                        pathComponents.pop();
                        pathComponents.push(resourceDirName);
                        return pathComponents.join(path.sep);
                    }
                }

                pathComponents.pop();
            }
        })();
        if (rootResDirPath) {
            this.getResourceNamesAtDirPath(rootResDirPath).forEach(name => {
                if (suffix === undefined || name.endsWith(suffix)) {
                    resourceNames.push('~/' + name);
                }
            });
        }

        return resourceNames;
    }

    private static resourceNamesCache = new Map</*dirPath*/ string, /*imageNames*/ string[]>;

    private static getResourceNamesAtDirPath(dirPath: string): string[] {
        let resourceNames = this.resourceNamesCache.get(dirPath);
        if (!resourceNames) {
            const uniqueNames = new Set<string>();
            readdirSync(dirPath).forEach(filename => {
                if (filename.startsWith('.'))
                    return;
                uniqueNames.add(stripAtSuffix(filename));
            });
            resourceNames = Array.from(uniqueNames);
            this.resourceNamesCache.set(dirPath, resourceNames);
        }
        return resourceNames;
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
    const dirName = filePath.split(path.sep).at(-2);
    return dirName !== undefined && ALL_FOLDER_NAMES.includes(dirName);
}

/// subview_btn_back@m.png -> subview_btn_back.png
function stripAtSuffix(filename: string): string {
    return filename.replace(/@[^.]+/, '');
}

function toResourceDirName(kind: ResourceKind): string {
    if (kind == ResourceKind.Image) return IMAGE_FOLDER_NAME;
    if (kind == ResourceKind.Audio) return AUDIO_FOLDER_NAME;
    if (kind == ResourceKind.Video) return VIDEO_FOLDER_NAME;
    if (kind == ResourceKind.Sound) return SOUND_FOLDER_NAME;
    if (kind == ResourceKind.Effect) return EFFECT_FOLDER_NAME;
    return TEXT_FOLDER_NAME;
}