import type { WeekPlan } from "../../shared/types";
import { planWeek } from "./rotation";
import { mondayOf, dateIn, dateOfTimestamp, weeksBetween, addWeeks } from "./weeks";

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
    timezone: string,
): Promise<WeekPlan["assignments"]> {
    const { results } = await db
        .prepare(
            `SELECT assignments.task_id AS taskId,
                    tasks.name          AS taskName,
                    assignments.user_id AS userId,
                    assignee.name       AS userName,
                    assignments.done_at AS doneAt,
                    assignments.done_by AS doneById,
                    doer.name           AS doneByName
             FROM assignments
             JOIN tasks ON tasks.id = assignments.task_id
             LEFT JOIN users AS assignee ON assignee.id = assignments.user_id
             LEFT JOIN users AS doer     ON doer.id     = assignments.done_by
             WHERE assignments.house_id = ? AND assignments.week_start = ?
             ORDER BY tasks.id`,
        )
        .bind(houseId, weekStart)
        .all<Omit<WeekPlan["assignments"][number], "late">>();

    // Done after the week's Sunday (in the house's timezone) counts as late
    const nextMonday = addWeeks(weekStart, 1);

    return results.map((a) => ({
        ...a,
        late: a.doneAt !== null && dateOfTimestamp(a.doneAt, timezone) >= nextMonday,
    }));
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

export async function loadHouseWeeks(
    db: D1Database,
    houseId: number,
): Promise<{ thisMonday: string; firstMonday: string; timezone: string } | null> {
    const house = await db
        .prepare("SELECT timezone, created_at FROM houses WHERE id = ?")
        .bind(houseId)
        .first<{ timezone: string; created_at: string }>();
    if (!house) return null;

    const firstMonday = mondayOf(dateOfTimestamp(house.created_at, house.timezone));
    const thisMonday = mondayOf(dateIn(house.timezone));

    return { thisMonday, firstMonday, timezone: house.timezone };
}

export async function getWeekPlan(
    db: D1Database,
    houseId: number,
    weekStart: string,
): Promise<WeekPlan | null> {
    const info = await loadHouseWeeks(db, houseId);
    if (!info) return null;

    const week = weeksBetween(info.firstMonday, weekStart);
    const status: WeekPlan["status"] =
        weekStart < info.thisMonday ? "past" : weekStart === info.thisMonday ? "current" : "preview";

    const lastMonday = addWeeks(info.thisMonday, -1);
    const canMark = weekStart === info.thisMonday || weekStart === lastMonday;

    if (status === "preview") {
        const { members, tasks } = await loadRotationInput(db, houseId);
        const planned = planWeek(
            members.map((m) => m.id),
            tasks.map((t) => t.id),
            week,
        );

        const memberNames = new Map(members.map((m) => [m.id, m.name]));
        const taskNames = new Map(tasks.map((t) => [t.id, t.name]));

        const assignments = planned.map((a) => ({
            taskId: a.taskId,
            taskName: taskNames.get(a.taskId) ?? "Unknown task",
            userId: a.userId,
            userName: memberNames.get(a.userId) ?? "Unknown member",
            doneAt: null,
            doneById: null,
            doneByName: null,
            late: false
        }));

        return { weekStart, status, canMark, currentWeekStart: info.thisMonday, firstWeekStart: info.firstMonday, assignments };
    }

    if (status === "current") {
        await ensureCurrentWeek(db, houseId, weekStart, week);
    }

    const assignments = await readStoredWeek(db, houseId, weekStart, info.timezone);
    return { weekStart, status, canMark, currentWeekStart: info.thisMonday, firstWeekStart: info.firstMonday, assignments };
}

export async function assignTaskThisWeek(db: D1Database, houseId: number, taskId: number): Promise<void> {
    const info = await loadHouseWeeks(db, houseId);
    if (!info) return;

    const thisMonday = info.thisMonday;

    const row = await db
    .prepare(
        `SELECT 1 FROM assignments
         WHERE house_id = ? AND week_start = ?
         LIMIT 1`,
    )
    .bind(houseId, thisMonday)
    .first();

    if (!row) {
        return; // no week yet: it'll include the task when it's created
    }
    
    const target = await db
        .prepare(
            `SELECT house_members.user_id AS userId
            FROM house_members
            LEFT JOIN assignments
                ON assignments.user_id = house_members.user_id
                AND assignments.house_id = house_members.house_id
                AND assignments.week_start = ?
            WHERE house_members.house_id = ?
            GROUP BY house_members.user_id
            ORDER BY COUNT(assignments.id), house_members.rotation_order
            LIMIT 1`,
        )
        .bind(thisMonday, houseId)
        .first<{ userId: number }>();

    if (!target) return; // no members at all: nobody to assign it to

    // 4. Assign the task to them for this week
    await db
        .prepare(
            `INSERT INTO assignments (house_id, week_start, task_id, user_id)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (house_id, week_start, task_id) DO NOTHING`,
        )
        .bind(houseId, thisMonday, taskId, target.userId)
        .run();
}

export async function removeTaskThisWeek(db: D1Database, houseId: number, taskId: number): Promise<void> {
    const info = await loadHouseWeeks(db, houseId);
    if (!info) return;

    await db
        .prepare(
            `DELETE FROM assignments
             WHERE house_id = ? AND week_start = ? AND task_id = ? AND done_at IS NULL`,
        )
        .bind(houseId, info.thisMonday, taskId)
        .run();
}

export async function reassignUnfinished(db: D1Database, houseId: number, leavingUserId: number): Promise<void> {
    const info = await loadHouseWeeks(db, houseId);
    if (!info) return;

    const { results: unfinished } = await db
        .prepare(
            `SELECT task_id AS taskId FROM assignments
             WHERE house_id = ? AND week_start = ? AND user_id = ? AND done_at IS NULL`,
        )
        .bind(houseId, info.thisMonday, leavingUserId)
        .all<{ taskId: number }>();

    if (unfinished.length === 0) return;

    const statements = unfinished.map((row) =>
        db
            .prepare(
                `UPDATE assignments
                 SET user_id = (
                     SELECT house_members.user_id
                     FROM house_members
                     LEFT JOIN assignments AS a
                         ON a.user_id = house_members.user_id
                        AND a.house_id = house_members.house_id
                        AND a.week_start = ?
                     WHERE house_members.house_id = ?
                     GROUP BY house_members.user_id
                     ORDER BY COUNT(a.id), house_members.rotation_order
                     LIMIT 1
                 )
                 WHERE house_id = ? AND week_start = ? AND task_id = ? AND done_at IS NULL`,
            )
            .bind(info.thisMonday, houseId, houseId, info.thisMonday, row.taskId),
    );

    await db.batch(statements);
}
