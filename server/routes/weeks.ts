import { Hono } from "hono";
import type { AppEnv } from "../types/types";
import { requireAuth } from "../lib/auth";
import { requireMember } from "../lib/membership";
import { parseWeekStart } from "../lib/validate";
import { mondayOf, dateIn, weeksBetween, dateOfTimestamp } from "../lib/weeks";
import type { WeekPlan } from "../../shared/types";
import { planWeek } from "../lib/rotation"; 
import { loadRotationInput, ensureCurrentWeek, readStoredWeek } from "../lib/schedule";

const weeks = new Hono<AppEnv>();
weeks.use(requireAuth, requireMember);

weeks.get("/:weekStart", async (c) => {
    const { houseId } = c.get("membership");
    const weekStart = parseWeekStart(c.req.param("weekStart"));
    if (!weekStart) {
        return c.json({ error: "weekStart must be a Monday, as YYYY-MM-DD" }, 400);
    }

    const houseDates = await c.env.DB.prepare("SELECT timezone, created_at FROM houses WHERE id = ?").bind(houseId).first<{ timezone: string, created_at: string }>();
    if (!houseDates) {
        return c.json({ error: "Could get the house timezone or creation date" }, 404);
    }

    const firstMonday = mondayOf(dateOfTimestamp(houseDates.created_at, houseDates.timezone));
    const thisMonday = mondayOf(dateIn(houseDates.timezone));
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

export default weeks;
