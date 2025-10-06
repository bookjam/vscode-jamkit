import * as cp from "child_process";
import * as path from "path";
import * as fs from "fs";

export class TypeScriptPathResolver {
    private static globalNodeModulesPath: string | null = null;
    private static jamkitTypesPath: string | null = null;

    public static getGlobalNodeModulesPath(): string | null {
        if (this.globalNodeModulesPath !== null) {
            return this.globalNodeModulesPath;
        }

        try {
            const result = cp.execSync("npm root -g", { encoding: "utf-8" });
            this.globalNodeModulesPath = result.trim();
            return this.globalNodeModulesPath;
        } catch (error) {
            console.error("Failed to get global node_modules path:", error);
            return null;
        }
    }

    public static getJamkitTypesPath(): string | null {
        if (this.jamkitTypesPath !== null) {
            return this.jamkitTypesPath;
        }

        const globalPath = this.getGlobalNodeModulesPath();
        if (!globalPath) {
            return null;
        }

        const typesPath = path.join(globalPath, "jamkit", "@types");

        if (fs.existsSync(typesPath)) {
            this.jamkitTypesPath = typesPath;
            return this.jamkitTypesPath;
        }

        console.warn("Jamkit @types path not found:", typesPath);
        return null;
    }

    public static resetCache(): void {
        this.globalNodeModulesPath = null;
        this.jamkitTypesPath = null;
    }
}
