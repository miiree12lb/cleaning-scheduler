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

export default members;
