import { Hono } from "hono";
import type { AppEnv } from "../types/types";
import { requireAuth } from "../lib/auth";
import { requireMember } from "../lib/membership";
import { parseWeekStart, parseId } from "../lib/validate";
import {readStoredWeek, loadHouseWeeks, getWeekPlan } from "../lib/schedule";

const weeks = new Hono<AppEnv>();
weeks.use(requireAuth, requireMember);

weeks.get("/current", async (c) => {
    const { houseId } = c.get("membership");
    const info = await loadHouseWeeks(c.env.DB, houseId);
    if (!info) return c.json({ error: "House not found" }, 404);

    const plan = await getWeekPlan(c.env.DB, houseId, info.thisMonday);
    return plan ? c.json(plan) : c.json({ error: "House not found" }, 404);
});

weeks.get("/:weekStart", async (c) => {
    const weekStart = parseWeekStart(c.req.param("weekStart"));
    if (weekStart === null) {
        return c.json({ error: "weekStart must be a Monday, as YYYY-MM-DD" }, 400);
    }

    const { houseId } = c.get("membership");
    const plan = await getWeekPlan(c.env.DB, houseId, weekStart);
    if (!plan) {
        return c.json({ error: "House not found" }, 404);
    }
    return c.json(plan);
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
        return c.json({ error: "Only this week's tasks can be changed" }, 409);
    }

    // Only the person who ticked it can untick it
    const result = await c.env.DB.prepare(
        `UPDATE assignments
         SET done_at = NULL, done_by = NULL
         WHERE house_id = ? AND week_start = ? AND task_id = ? AND done_by = ?`,
    )
        .bind(houseId, weekStart, taskId, user.id)
        .run();

    const assignments = await readStoredWeek(c.env.DB, houseId, weekStart);
    const assignment = assignments.find((a) => a.taskId === taskId);
    if (!assignment) {
        return c.json({ error: "This task isn't part of this week" }, 404);
    }

    // Nothing changed, but it's still done: someone else ticked it
    if (result.meta.changes === 0 && assignment.doneAt !== null) {
        return c.json({ error: "Only the person who marked this task as done can undo it." }, 403);
    }

    return c.json(assignment);
});

export default weeks;
