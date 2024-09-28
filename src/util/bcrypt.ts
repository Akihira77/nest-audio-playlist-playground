import * as bcrypt from "bcrypt";

export async function hashString(
    str: string,
    salt: number = 10,
): Promise<string> {
    try {
        return await bcrypt.hash(str, salt);
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function matchingString(
    str: string,
    hash: string,
): Promise<boolean> {
    return await bcrypt.compare(str, hash);
}
