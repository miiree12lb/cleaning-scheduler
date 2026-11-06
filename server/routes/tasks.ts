import { Hono } from "hono";
import type { AppEnv } from "../types/types";
import { requireAuth } from "../lib/auth";
import { requireAdmin, requireMember } from "../lib/membership";
import type { Task } from "../../shared/types";
import { parseDescription, parseName, parseId } from "../lib/validate";
import { assignTaskThisWeek } from "../lib/schedule";

const tasks = new Hono<AppEnv>();
tasks.use(requireAuth, requireMember);

// List the house's tasks: admins also see archived ones
tasks.get("/", async (c) => {
    const { houseId, role } = c.get("membership");

    if (role === "admin") {
        const { results } = await c.env.DB.prepare(
            `SELECT id, name, description, active
             FROM tasks
             WHERE house_id = ?
             ORDER BY active DESC, name`,
        )
            .bind(houseId)
            .all<Task>();
        return c.json(results);
    }

    const { results } = await c.env.DB.prepare(
        `SELECT id, name, description, active
         FROM tasks
         WHERE house_id = ? AND active = 1
         ORDER BY name`,
    )
        .bind(houseId)
        .all<Task>();
    return c.json(results);
});

// Create a task, and assign it this week if the week already exists
tasks.post("/", requireAdmin, async (c) => {
    let body;
    try {
        body = await c.req.json();
    } catch {
        return c.json({ error: "Body must be JSON" }, 400);
    }

    const nameResult = parseName(body?.name);
    if (!nameResult.ok) {
        return c.json({ error: nameResult.error }, 400);
    }
    const name = nameResult.value;

    const descResult = parseDescription(body?.description);
    if (!descResult.ok) {
        return c.json({ error: descResult.error }, 400);
    }
    const description = descResult.value;

    const { houseId } = c.get("membership");
    const existing = await c.env.DB.prepare(
        "SELECT id, active FROM tasks WHERE house_id = ? AND name = ? COLLATE NOCASE",
    )
        .bind(houseId, name)
        .first<{ id: number; active: number }>();

    if (existing !== null) {
        if (existing.active === 1) {
            return c.json({ error: "A task with this name already exists", taskId: existing.id }, 409);
        }
        return c.json({ error: "archived_exists", taskId: existing.id }, 409);
    }

    const task = await c.env.DB.prepare(
        `INSERT INTO tasks (house_id, name, description)
         VALUES (?, ?, ?)
         RETURNING id, name, description, active`,
    )
        .bind(houseId, name, description)
        .first<Task>();

    if (task) {
        await assignTaskThisWeek(c.env.DB, houseId, task.id);
    }

    return c.json(task, 201);
});

// Delete a task that was never used, archive one with history
tasks.delete("/:taskId", requireAdmin, async (c) => {
    const taskId = parseId(c.req.param("taskId"));
    if (taskId === null) {
        return c.json({ error: "Invalid task id" }, 400);
    }

    const { houseId } = c.get("membership");
    const existing = await c.env.DB.prepare("SELECT id FROM tasks WHERE id = ? AND house_id = ?")
        .bind(taskId, houseId)
        .first<{ id: number }>();
    if (!existing) {
        return c.json({ error: "Task not found" }, 404);
    }

    const history = await c.env.DB.prepare("SELECT 1 FROM assignments WHERE task_id = ? LIMIT 1")
        .bind(taskId)
        .first();
    if (!history) {
        await c.env.DB.prepare("DELETE FROM tasks WHERE id = ?").bind(taskId).run();
        return c.json({ result: "deleted" });
    }

    await c.env.DB.prepare("UPDATE tasks SET active = 0 WHERE id = ?").bind(taskId).run();
    // TODO (next mid-week rule): remove this week's assignment, unless it's already done
    return c.json({ result: "archived" });
});

// Restore an archived task, and assign it this week like a new one
tasks.post("/:taskId/restore", requireAdmin, async (c) => {
    const taskId = parseId(c.req.param("taskId"));
    if (taskId === null) {
        return c.json({ error: "Invalid task id" }, 400);
    }

    const { houseId } = c.get("membership");
    const task = await c.env.DB.prepare(
        "UPDATE tasks SET active = 1 WHERE id = ? AND house_id = ? RETURNING id, name, description, active",
    )
        .bind(taskId, houseId)
        .first<Task>();
    if (!task) {
        return c.json({ error: "Task not found" }, 404);
    }

    await assignTaskThisWeek(c.env.DB, houseId, task.id);

    return c.json(task);
});

// Edit a task's name and/or description
tasks.patch("/:taskId", requireAdmin, async (c) => {
    const taskId = parseId(c.req.param("taskId"));
    if (taskId === null) {
        return c.json({ error: "Invalid task id" }, 400);
    }

    let body;
    try {
        body = await c.req.json();
    } catch {
        return c.json({ error: "Body must be JSON" }, 400);
    }

    // Which fields were sent? Missing means "don't change it".
    const isObject = body !== null && typeof body === "object";
    const hasName = isObject && "name" in body;
    const hasDescription = isObject && "description" in body;

    if (!hasName && !hasDescription) {
        return c.json({ error: "Nothing to update" }, 400);
    }

    // Load the current task, which also checks it belongs to this house
    const { houseId } = c.get("membership");
    const current = await c.env.DB.prepare(
        "SELECT id, name, description, active FROM tasks WHERE id = ? AND house_id = ?",
    )
        .bind(taskId, houseId)
        .first<Task>();

    if (!current) {
        return c.json({ error: "Task not found" }, 404);
    }

    // Start from the current values, and replace only what was sent
    let name = current.name;
    if (hasName) {
        const result = parseName(body.name);
        if (!result.ok) {
            return c.json({ error: result.error }, 400);
        }
        name = result.value;

        const duplicate = await c.env.DB.prepare(
            "SELECT id FROM tasks WHERE house_id = ? AND name = ? COLLATE NOCASE AND id != ?",
        )
            .bind(houseId, name, taskId)
            .first<{ id: number }>();

        if (duplicate) {
            return c.json({ error: "Another task has this name" }, 409);
        }
    }

    let description = current.description;
    if (hasDescription) {
        const result = parseDescription(body.description);
        if (!result.ok) {
            return c.json({ error: result.error }, 400);
        }
        description = result.value;
    }

    const task = await c.env.DB.prepare(
        `UPDATE tasks SET name = ?, description = ?
         WHERE id = ? AND house_id = ?
         RETURNING id, name, description, active`,
    )
        .bind(name, description, taskId, houseId)
        .first<Task>();

    return c.json(task);
});

export default tasks;
