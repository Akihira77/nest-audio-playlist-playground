import { extname } from "path";
import { randomBytes } from "crypto";

export function generateRandomFileName(originalName: string): string {
    const fileExtension = extname(originalName);

    const randomName = randomBytes(16).toString("hex");

    return `${randomName}${fileExtension}`;
}
