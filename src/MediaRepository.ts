import * as path from 'path';
import { readdirSync, existsSync } from 'fs';

const IMAGE_SUFFIXES = ['.png', '.jpg'];


export class MediaRepository {
    static imageNamesMap = new Map</*directory path*/string, /*filenames*/string[]>;

    static enumerateImageNames(documentPath: string): string[] {
        const uniqueImageNames = new Set<string>();

        const pathComponents = documentPath.split(path.sep);

        // remove current document filename
        pathComponents.pop();

        const activeDirPath = pathComponents.join(path.sep);
        readdirSync(activeDirPath).forEach(filename => {
            if (isImageFilename(filename))
                uniqueImageNames.add(stripAtSuffix(filename));
        });

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
            readdirSync(imageDirPath).forEach(filename => {
                if (isImageFilename(filename))
                    uniqueImageNames.add('~/' + stripAtSuffix(filename));
            });
        }

        return Array.from(uniqueImageNames);
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