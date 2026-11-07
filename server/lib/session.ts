import { randomHex } from "./random";
import type { SessionUser } from "../../shared/types";

export const SESSION_DAYS = 30;

// The cookie holds the token; the database only stores its SHA-256 hash.
// The token is 32 random bytes, far too many to guess, so a plain hash (without salt) is enough.
async function hashToken(token: string): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Creates a session and returns the token for the cookie
export async function createSession(db: D1Database, userId: number): Promise<string> {
    const token = randomHex(32);
    await db
        .prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, datetime('now', ?))")
        .bind(await hashToken(token), userId, `+${SESSION_DAYS} days`)
        .run();
    return token;
}

// The user a cookie token belongs to, or null if it's unknown or expired
export async function getSessionUser(db: D1Database, token: string): Promise<SessionUser | null> {
    return db
        .prepare(
            `SELECT users.id, users.email, users.name
             FROM sessions
             JOIN users ON users.id = sessions.user_id
             WHERE sessions.id = ? AND sessions.expires_at > datetime('now')`,
        )
        .bind(await hashToken(token))
        .first<SessionUser>();
}

export async function deleteSession(db: D1Database, token: string): Promise<void> {
    await db.prepare("DELETE FROM sessions WHERE id = ?").bind(await hashToken(token)).run();
}
