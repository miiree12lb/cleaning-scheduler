// Password hashing with PBKDF2 (built into Workers via Web Crypto).
// 100,000 iterations is the maximum Workers allows; the rate limiter covers the rest.
const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

export type StoredPassword = {
    hash: string;
    salt: string;
    iterations: number;
};

function toHex(bytes: Uint8Array): string {
    return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<string> {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
        "deriveBits",
    ]);
    const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", hash: "SHA-256", salt, iterations },
        key,
        HASH_BITS,
    );
    return toHex(new Uint8Array(bits));
}

// Compares two strings in a time that doesn't depend on where they differ,
// so an attacker can't learn the hash one character at a time by timing the answers.
function sameString(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
}

// Hash a new password, with a new random salt
export async function hashPassword(password: string): Promise<StoredPassword> {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    return {
        hash: await derive(password, salt, ITERATIONS),
        salt: toHex(salt),
        iterations: ITERATIONS,
    };
}

// Check a password against what's stored, using the iterations it was saved with
export async function verifyPassword(password: string, stored: StoredPassword): Promise<boolean> {
    const hash = await derive(password, fromHex(stored.salt), stored.iterations);
    return sameString(hash, stored.hash);
}
