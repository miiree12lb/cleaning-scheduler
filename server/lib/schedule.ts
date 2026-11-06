import type { WeekPlan } from "../../shared/types";
import { planWeek } from "./rotation";
import { mondayOf, dateIn, dateOfTimestamp } from "./weeks";

export type RotationInput = {
    members: { id: number; name: string }[];   // in rotation order
    tasks: { id: number; name: string }[];     // active only, by id
};

export async function loadRotationInput(db: D1Database, houseId: number): Promise<RotationInput> {
    const { results: members } = await db
        .prepare(
            `SELECT users.id, users.name
             FROM house_members
             JOIN users ON users.id = house_members.user_id
             WHERE house_members.house_id = ?
             ORDER BY house_members.rotation_order`,
        )
        .bind(houseId)
        .all<{ id: number; name: string }>();

    const { results: tasks } = await db
        .prepare("SELECT id, name FROM tasks WHERE house_id = ? AND active = 1 ORDER BY id")
        .bind(houseId)
        .all<{ id: number; name: string }>();

    return { members, tasks };
}

export async function readStoredWeek(
    db: D1Database,
    houseId: number,
    weekStart: string,
): Promise<WeekPlan["assignments"]> {
    const { results } = await db
        .prepare(
            `SELECT assignments.task_id AS taskId,
                    tasks.name          AS taskName,
                    assignments.user_id AS userId,
                    users.name          AS userName,
                    assignments.done_at AS doneAt
             FROM assignments
             JOIN tasks ON tasks.id = assignments.task_id
             LEFT JOIN users ON users.id = assignments.user_id
             WHERE assignments.house_id = ? AND assignments.week_start = ?
             ORDER BY tasks.id`,
        )
        .bind(houseId, weekStart)
        .all<WeekPlan["assignments"][number]>();

    return results;
}

export async function ensureCurrentWeek(
    db: D1Database,
    houseId: number,
    weekStart: string,
    week: number,
): Promise<void> {
    const row = await db.prepare("SELECT 1 FROM assignments WHERE house_id = ? AND week_start = ? LIMIT 1").bind(houseId, weekStart).first();
    if (row) {
        return;
    }

    const { members, tasks } = await loadRotationInput(db, houseId);
    const planned = planWeek(
        members.map((m) => m.id),
        tasks.map((t) => t.id),
        week,
    );
    
    if (planned.length === 0) {
        return;
    }

    const statements = planned.map((a) =>
        db
            .prepare(
                `INSERT INTO assignments (house_id, week_start, task_id, user_id)
                VALUES (?, ?, ?, ?)
                ON CONFLICT (house_id, week_start, task_id) DO NOTHING`,
            )
            .bind(houseId, weekStart, a.taskId, a.userId),
    );

    await db.batch(statements);
}

export async function loadHouseWeeks(db: D1Database, houseId: number) {
    const houseDates = await db.prepare("SELECT timezone, created_at FROM houses WHERE id = ?").bind(houseId).first<{ timezone: string, created_at: string }>();
    if (!houseDates) {
        return null;
    }
    
    const firstMonday = mondayOf(dateOfTimestamp(houseDates.created_at, houseDates.timezone));
    const thisMonday = mondayOf(dateIn(houseDates.timezone));

    return { thisMonday, firstMonday };
}
