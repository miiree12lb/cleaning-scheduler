// Accepts a whole invite link (".../join/2646e9d0c3") or just the code
export function extractCode(input: string): string | null {
    const match = input
        .trim()
        .toLowerCase()
        .match(/([0-9a-f]{10})\/?$/);
    return match ? match[1] : null;
}
