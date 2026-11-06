import { Hono } from "hono";
import type { AppEnv } from "../types/types";
import { requireAuth } from "../lib/auth";
import { requireMember } from "../lib/membership";
import { parseWeekStart, parseId } from "../lib/validate";
import { mondayOf, dateIn, weeksBetween, dateOfTimestamp } from "../lib/weeks";
import type { WeekPlan } from "../../shared/types";
import { planWeek } from "../lib/rotation"; 
import { loadRotationInput, ensureCurrentWeek, readStoredWeek, loadHouseWeeks } from "../lib/schedule";

const weeks = new Hono<AppEnv>();
weeks.use(requireAuth, requireMember);

weeks.get("/:weekStart", async (c) => {
    const { houseId } = c.get("membership");
    const weekStart = parseWeekStart(c.req.param("weekStart"));
    if (!weekStart) {
        return c.json({ error: "weekStart must be a Monday, as YYYY-MM-DD" }, 400);
    }

    const weeksInfo = await loadHouseWeeks(c.env.DB, houseId);
    if (!weeksInfo) {
        return c.json({ error: "House not found" }, 404);
    }

    const { thisMonday, firstMonday } = weeksInfo;
    const week = weeksBetween(firstMonday, weekStart);
    
    const status: WeekPlan["status"] =
        weekStart < thisMonday ? "past" : weekStart === thisMonday ? "current" : "preview";

    if (status === "preview") {
        const { members, tasks } = await loadRotationInput(c.env.DB, houseId);

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
        }));

        return c.json({ weekStart, status, assignments });
    }

    if (status === "current") {
        await ensureCurrentWeek(c.env.DB, houseId, weekStart, week);
    }

    // past and current both read what's stored
    const assignments = await readStoredWeek(c.env.DB, houseId, weekStart);
    return c.json({ weekStart, status, assignments });

});

weeks.put("/:weekStart/tasks/:taskId/done", async (c) => {
    const user = c.get("user");
    const { houseId } = c.get("membership");

    const weekStart = parseWeekStart(c.req.param("weekStart"));
    if (weekStart === null) {
        return c.json({ error: "weekStart must be a Monday, as YYYY-MM-DD" }, 400);
    }

    const taskId = parseId(c.req.param("taskId"));
    if (taskId === null) {
        return c.json({ error: "Invalid task id" }, 400);
    }

    const weeksInfo = await loadHouseWeeks(c.env.DB, houseId);
    if (!weeksInfo) {
        return c.json({ error: "House not found" }, 404);
    }

    if (weekStart !== weeksInfo.thisMonday) {
        return c.json({ error: "Only this week's tasks can be marked as done" }, 409);
    }

    await c.env.DB.prepare(
        `UPDATE assignments
         SET done_at = datetime('now'), done_by = ?
         WHERE house_id = ? AND week_start = ? AND task_id = ? AND done_at IS NULL`,
    )
        .bind(user.id, houseId, weekStart, taskId)
        .run();

    const assignments = await readStoredWeek(c.env.DB, houseId, weekStart);
    const assignment = assignments.find((a) => a.taskId === taskId);
    if (!assignment) {
        return c.json({ error: "This task isn't part of this week" }, 404);
    }

    return c.json(assignment);
});

weeks.delete("/:weekStart/tasks/:taskId/done", async (c) => {
    const { houseId } = c.get("membership");

    const weekStart = parseWeekStart(c.req.param("weekStart"));
    if (weekStart === null) {
        return c.json({ error: "weekStart must be a Monday, as YYYY-MM-DD" }, 400);
    }

    const taskId = parseId(c.req.param("taskId"));
    if (taskId === null) {
        return c.json({ error: "Invalid task id" }, 400);
    }

    const weeksInfo = await loadHouseWeeks(c.env.DB, houseId);
    if (!weeksInfo) {
        return c.json({ error: "House not found" }, 404);
    }

    if (weekStart !== weeksInfo.thisMonday) {
        return c.json({ error: "Only this week's tasks can be marked as done" }, 409);
    }

    await c.env.DB.prepare(
        `UPDATE assignments
        SET done_at = NULL, done_by = NULL
        WHERE house_id = ? AND week_start = ? AND task_id = ?`,
    )
        .bind(houseId, weekStart, taskId)
        .run();

    const assignments = await readStoredWeek(c.env.DB, houseId, weekStart);
    const assignment = assignments.find((a) => a.taskId === taskId);
    if (!assignment) {
        return c.json({ error: "This task isn't part of this week" }, 404);
    }

    return c.json(assignment);
});

export default weeks;
