import { type SessionUser } from "../../shared/types";
import { randomHex } from "./random";

function generateSessionId(): string {
    return randomHex(32);
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
