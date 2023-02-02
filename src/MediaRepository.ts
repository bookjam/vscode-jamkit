import * as vscode from 'vscode';
import * as path from 'path';
import { readdirSync, existsSync } from 'fs';

const IMAGE_FOLDER_NAME = 'Images';
const AUDIO_FOLDER_NAME = 'Audios';
const VIDEO_FOLDER_NAME = 'Videos';

export class MediaRepository {
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
        return this.enumerateMediaNames(IMAGE_FOLDER_NAME, documentPath);
    }

    private static enumerateMediaNames(mediaFolderName: string, documentPath: string): string[] {
        const mediaNames: string[] = [];

        const pathComponents = documentPath.split(path.sep);

        const currentMediaDirPath = (() => {
            pathComponents.pop();
            pathComponents.push(mediaFolderName);
            return pathComponents.join(path.sep);
        })();
        mediaNames.push(...this.getMediaNamesAtDirPath(currentMediaDirPath));

        const rootMediaDirPath = (() => {
            while (pathComponents.length > 0) {

                for (let projectFileName of ['catalog.bon', 'book.bon']) {
                    pathComponents.pop();
                    pathComponents.push(projectFileName);

                    const projectFilePath = pathComponents.join(path.sep);
                    if (existsSync(projectFilePath)) {
                        pathComponents.pop();
                        pathComponents.push(mediaFolderName);
                        return pathComponents.join(path.sep);
                    }
                }

                pathComponents.pop();
            }
        })();
        if (rootMediaDirPath) {
            this.getMediaNamesAtDirPath(rootMediaDirPath).forEach(imageName => {
                mediaNames.push('~/' + imageName);
            });
        }

        return mediaNames;
    }

    private static mediaNamesCache = new Map</*dirPath*/ string, /*imageNames*/ string[]>;

    private static getMediaNamesAtDirPath(dirPath: string): string[] {
        let imageNames = this.mediaNamesCache.get(dirPath);
        if (!imageNames) {
            const uniqueMediaNames = new Set<string>();
            readdirSync(dirPath).forEach(filename => {
                if (filename.startsWith('.'))
                    return;
                uniqueMediaNames.add(stripAtSuffix(filename));
            });
            imageNames = Array.from(uniqueMediaNames);
            this.mediaNamesCache.set(dirPath, imageNames);
        }
        return imageNames;
    }

    private static updateCache(filePath: string): void {
        if (isMediaFilePath(filePath)) {
            const pathComponents = filePath.split(path.sep);
            pathComponents.pop();
            const dirPath = pathComponents.join(path.sep);
            this.mediaNamesCache.delete(dirPath);
        }
    }
}

function isMediaFilePath(filePath: string): boolean {
    switch (filePath.split(path.sep).at(-2)) {
        case IMAGE_FOLDER_NAME:
        case AUDIO_FOLDER_NAME:
        case VIDEO_FOLDER_NAME:
            return true;
        default:
            return false;
    }
}

/// subview_btn_back@m.png -> subview_btn_back.png
function stripAtSuffix(filename: string): string {
    return filename.replace(/@[^\.]+/, '');
}