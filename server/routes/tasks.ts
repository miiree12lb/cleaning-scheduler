import { Hono } from "hono";
import type { AppEnv } from "../types/types";
import { requireAuth } from "../lib/auth";
import { requireAdmin, requireMember } from "../lib/membership";
import type { Task } from "../../shared/types";

const tasks = new Hono<AppEnv>();
tasks.use(requireAuth, requireMember);

tasks.get("/", async (c) => {
    const { houseId } = c.get("membership");
    const { results } = await c.env.DB.prepare(
        `SELECT id, house_id, name, description 
        FROM tasks WHERE house_id = ? 
        ORDER BY active DESC, name`
    ).bind(houseId).all<Task>();
    return c.json(results);
});

tasks.post("/", requireAdmin, async (c) => {
    let body;
    try {
        body = await c.req.json();
    } catch {
        return c.json({ error: "Body must be JSON" }, 400);
    }

    if (typeof body.name !== "string") {
        return c.json({ error: "Name must be text" }, 400);
    }

    const name = body.name.trim();
    if (name.length === 0) {
        return c.json({ error: "Name cannot be empty" }, 400);
    }

    if (name.length > 50) {
        return c.json({ error: "Name cannot have more than 50 characters" }, 400);
    }

    let description: string | null = null;

    if (body.description !== undefined && body.description !== null) {
        if (typeof body.description !== "string") {
            return c.json({ error: "Description must be text" }, 400);
        }

        const trimmed = body.description.trim();
        if (trimmed.length > 200) {
            return c.json({ error: "Description cannot have more than 200 characters" }, 400);
        }

        description = trimmed === "" ? null : trimmed;
    }

    const { houseId } = c.get("membership");
    const existing = await c.env.DB.prepare("SELECT id, active FROM tasks WHERE house_id = ? AND name = ? COLLATE NOCASE").bind(houseId, name).first<{ id: number, active: number }>();

    if (existing !== null) {
        if (existing.active === 1) {
            return c.json({ error: "A task with this name already exists", taskId: existing.id }, 409);
        }
        else {
            return c.json({ error: "archived_exists", taskId: existing.id }, 409);
        }
    }

    const task = await c.env.DB.prepare(
        `INSERT INTO tasks (house_id, name, description) 
        VALUES (?, ?, ?)
        RETURNING id, name, description, active`
    ).bind(houseId, name, description).first<Task>();

    return c.json(task, 201);
});

export default tasks;