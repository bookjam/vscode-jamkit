import * as path from 'path';
import { readdirSync, existsSync } from 'fs';


export class ImageStore {
    static enumerateImageNames(documentPath: string): string[] {
        const uniqueImageNames = new Set<string>();

        const pathComponents = documentPath.split(path.sep);

        // remove current document filename
        pathComponents.pop();

        const activeDirPath = pathComponents.join(path.sep);
        readdirSync(activeDirPath).forEach(filename => {
            if (!filename.endsWith('.png') || filename.endsWith('.jpg'))
                return;
            uniqueImageNames.add(striptAtSuffix(filename));
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
                if (!filename.endsWith('.png') || filename.endsWith('.jpg'))
                    return;
                uniqueImageNames.add('~/' + striptAtSuffix(filename));
            });
        }

        return Array.from(uniqueImageNames);
    }
}

function striptAtSuffix(filename: string): string {
    return filename.replace(/@[^\.]+/, '');
}