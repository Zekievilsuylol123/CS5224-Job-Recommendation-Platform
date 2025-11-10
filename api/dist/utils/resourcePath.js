import * as path from "node:path";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export function resourcePath(rel) {
    return path.resolve(__dirname, "..", "..", "resources", rel);
}
