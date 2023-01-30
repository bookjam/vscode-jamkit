import * as path from 'path';
import { readdirSync, existsSync } from 'fs';
import * as vscode from 'vscode';

const IMAGE_SUFFIXES = ['.png', '.jpg'];


export class MediaRepository {
    static init(context: vscode.ExtensionContext) {
        const watcher = vscode.workspace.createFileSystemWatcher(
            '**/*',
            /*ignoreCreateEvents*/ false,
            /*ignoreChangeEvents*/ true,
            /*ignoreDeleteEvents*/ false
        );
        watcher.onDidCreate(event => this.updateCache(event.fsPath));
        watcher.onDidDelete(event => this.updateCache(event.fsPath));
        context.subscriptions.push(watcher);
    }

    static enumerateImageNames(documentPath: string): string[] {
        const imageNames: string[] = [];

        const pathComponents = documentPath.split(path.sep);

        // remove current document filename
        pathComponents.pop();

        const activeDirPath = pathComponents.join(path.sep);
        imageNames.push(...this.getImageNamesAtDirPath(activeDirPath));

        const imageDirPath = (() => {
            let catalogBonPath = path.join(activeDirPath, 'catalog.bon');
            while (true) {
                if (existsSync(catalogBonPath)) {
                    pathComponents.push('Images');
                    return pathComponents.join(path.sep);
                }
                if (pathComponents.length == 0)
                    break;
                pathComponents.pop();
                catalogBonPath = pathComponents.join(path.sep);
            }
        })();
        if (imageDirPath) {
            this.getImageNamesAtDirPath(imageDirPath).forEach(imageName => {
                imageNames.push('~/' + imageName);
            });
        }

        return imageNames;
    }

    private static imageNamesCache = new Map</*dirPath*/ string, /*imageNames*/ string[]>;

    private static getImageNamesAtDirPath(dirPath: string): string[] {
        let imageNames = this.imageNamesCache.get(dirPath);
        if (!imageNames) {
            const uniqueImageNames = new Set<string>();
            readdirSync(dirPath).forEach(filename => {
                if (isImageFilename(filename))
                    uniqueImageNames.add(stripAtSuffix(filename));
            });
            imageNames = Array.from(uniqueImageNames);
            this.imageNamesCache.set(dirPath, imageNames);
        }
        return imageNames;
    }

    private static updateCache(filePath: string): void {
        if (isImageFilename(filePath)) {
            const pathComponents = filePath.split(path.sep);
            pathComponents.pop();
            const dirPath = pathComponents.join(path.sep);
            this.imageNamesCache.delete(dirPath);
        }
    }
}

function isImageFilename(filename: string): boolean {
    for (let suffix of IMAGE_SUFFIXES) {
        if (filename.endsWith(suffix))
            return true;
    }
    return false;
}

function stripAtSuffix(filename: string): string {
    return filename.replace(/@[^\.]+/, '');
}