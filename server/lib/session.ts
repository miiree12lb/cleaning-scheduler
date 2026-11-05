import { type SessionUser } from "../../shared/types";

function generateSessionId(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createSession(db: D1Database, userId: number): Promise<string> {
    const array = new Uint32Array(10);
    const sessionId = generateSessionId();
    await db
        .prepare(
            "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))"
        )
        .bind(sessionId, userId)
        .run();
    return sessionId;
} 

export async function getSessionUser(db: D1Database, sessionId: string): Promise<SessionUser | null> {
    return await db
        .prepare(
            `SELECT users.id, users.email, users.name
             FROM sessions
             JOIN users ON users.id = sessions.user_id
             WHERE sessions.id = ? AND sessions.expires_at > datetime('now')`,
        )
        .bind(sessionId)
        .first<SessionUser>();
}

export async function deleteSession(db: D1Database, sessionId: string): Promise<void> {
    await db.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
}
