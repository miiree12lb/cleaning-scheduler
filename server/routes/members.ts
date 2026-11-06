import { Hono } from "hono";
import type { AppEnv } from "../types/types";
import { requireMember, requireAdmin } from "../lib/membership";
import { requireAuth } from "../lib/auth";
import type { Member } from "../../shared/types";

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

export default members;
