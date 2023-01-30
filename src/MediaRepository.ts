import * as path from 'path';
import { readdirSync, existsSync } from 'fs';

const IMAGE_SUFFIXES = ['.png', '.jpg'];


export class MediaRepository {
    static imageNamesCache = new Map</*directory path*/string, /*filenames*/string[]>;

    static enumerateImageNames(documentPath: string): string[] {
        const imageNames: string[] = [];

        const pathComponents = documentPath.split(path.sep);

        // remove current document filename
        pathComponents.pop();

        const activeDirPath = pathComponents.join(path.sep);
        imageNames.concat(this.getImageNamesAtDirPath(activeDirPath));

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
            imageNames.concat(this.getImageNamesAtDirPath(imageDirPath));
        }

        return imageNames;
    }

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