import type { RemoveResult } from "../types/types";
import { reassignUnfinished } from "./schedule";

export async function removeMember(
    db: D1Database,
    houseId: number,
    userId: number,
): Promise<RemoveResult> {
    const result = await db
        .prepare(
            `DELETE FROM house_members
             WHERE house_id = ? AND user_id = ?
               AND (
                   role = 'member'
                   OR (SELECT COUNT(*) FROM house_members WHERE house_id = ? AND role = 'admin') > 1
               )`,
        )
        .bind(houseId, userId, houseId)
        .run();

    if (result.meta.changes === 1) {
        await db
            .prepare(
                `DELETE FROM section_members
             WHERE user_id = ?
               AND section_id IN (SELECT id FROM rule_sections WHERE house_id = ?)`,
            )
            .bind(userId, houseId)
            .run();
        await reassignUnfinished(db, houseId, userId);
        return "removed";
    }

    const member = await db
        .prepare(
            "SELECT 1 FROM house_members WHERE house_id = ? AND user_id = ?",
        )
        .bind(houseId, userId)
        .first();

    return member ? "last_admin" : "not_found";
}
