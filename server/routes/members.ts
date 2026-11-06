import { Hono } from "hono";
import type { AppEnv } from "../types/types";
import { requireMember, requireAdmin } from "../lib/membership";
import { requireAuth } from "../lib/auth";
import type { Member } from "../../shared/types";
import { parseId, parseRole } from "../lib/validate";
import { removeMember } from "../lib/members";

const members = new Hono<AppEnv>();
members.use(requireAuth, requireMember);

members.get("/", async (c) => {
    const { houseId } = c.get("membership");

    const { results } = await c.env.DB.prepare(`
        SELECT users.name, users.id, house_members.role, house_members.uses_dishwasher
        FROM house_members
        JOIN users ON users.id = house_members.user_id
        WHERE house_members.house_id = ?
        ORDER BY house_members.rotation_order
    `).bind(houseId).all<Member>();

    return c.json({ results });
});

members.patch("/me", async (c) => {
    let body;
    try {
        body = await c.req.json();
    } catch {
        return c.json({ error: "Body must be JSON" }, 400);
    }

    const usesDishwasher = body?.uses_dishwasher;
    if (typeof usesDishwasher !== "boolean") {
        return c.json({ error: "Uses dishwasher must be a boolean" }, 400);
    }

    const value = usesDishwasher ? 1 : 0;
    const user = c.get("user");
    const { houseId } = c.get("membership");
    
    const row = await c.env.DB.prepare(`
        UPDATE house_members SET uses_dishwasher = ?
        WHERE house_id = ? AND user_id = ?
        RETURNING uses_dishwasher
    `).bind(value, houseId, user.id).first<{ uses_dishwasher: number }>();

    if (!row) {
        return c.json({ error: "Uses dishwasher not found" }, 404);
    }
    return c.json({ uses_dishwasher: row.uses_dishwasher });
});

members.delete("/me", async (c) => {
    const { houseId } = c.get("membership");
    const user = c.get("user");

    const result = await removeMember(c.env.DB, houseId, user.id);

    if (result === "last_admin") {
        return c.json(
            { error: "You're the only admin. Make someone else admin first, or delete the house." },
            409,
        );
    }
    return c.json({ ok: true });
});

members.delete("/:userId", requireAdmin, async (c) => {
    const { houseId } = c.get("membership");
    
    const userId = parseId(c.req.param("userId"));
    if (!userId) {
        return c.json({ error: "Invalid user id" }, 400)
    }

    const result = await removeMember(c.env.DB, houseId, userId);

    if (result === "last_admin") {
        return c.json(
            { error: "There must be at least one admin in the house. Make someone else admin first, or delete the house." },
            409,
        );
    }
    else if (result === "not_found") {
        return c.json("Member not found", 404);
    }
    return c.json({ ok: true });
});

members.patch("/:userId/role", requireAdmin, async (c) => {
    const userId = parseId(c.req.param("userId"));
    if (!userId) {
        return c.json({ error: "Invalid user id" }, 400);
    }

    let body;
    try {
        body = await c.req.json();
    } catch {
        return c.json({ error: "Body must be JSON" }, 400);
    }

    const role = parseRole(body.role);
    if (!role) {
        c.json({ error: "Invalid role" }, 400);
    }

    const { houseId } = c.get("membership");

    const row = await c.env.DB.prepare(`
        UPDATE house_members SET role = ?
        WHERE house_id = ? AND user_id = ?
        AND (
            ? = 'admin'
            OR role = 'member'
            OR (SELECT COUNT(*) FROM house_members WHERE house_id = ? AND role = 'admin') > 1
        )
        RETURNING user_id, role    
    `).bind(role, houseId, userId, role, houseId).first<{ user_id: number, role: string }>();

    if (row) {
        return c.json(row);
    }
    
    const member = await c.env.DB.prepare(
        "SELECT 1 FROM house_members WHERE house_id = ? AND user_id = ?",
    )
        .bind(houseId, userId)
        .first();

    if (!member) {
        return c.json({ error: "Member not found" }, 404);
    }

    return c.json(
        { error: "There must be at least one admin. Make someone else admin first." },
        409,
    );
});

export default members;
