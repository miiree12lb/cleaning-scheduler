import { Hono } from "hono";
import type { AppEnv, Role } from "../types/types";
import { requireAuth } from "../lib/auth";
import { parseInviteCode } from "../lib/validate";
import type { HouseSummary } from "../../shared/types";

const join = new Hono<AppEnv>();
join.use(requireAuth);

join.post("/:code", async (c) => {
    const code = parseInviteCode(c.req.param("code"));
    if (code === null) {
        return c.json({ error: "Invalid invite code" }, 400);
    }

    const house = await c.env.DB.prepare("SELECT id, name FROM houses WHERE invite_code = ?").bind(code).first<{ id: number; name: string }>();
    if (!house) {
        return c.json({ error: "This invite link is invalid or has been replaced" }, 404);
    }

    const user = c.get("user"); 
    const houseMember = await c.env.DB.prepare("SELECT role FROM house_members WHERE house_id = ? and user_id = ?").bind(house.id, user.id).first<{ role: Role }>();
    if (houseMember) {
        return c.json({ id: house.id, name: house.name, role: houseMember.role });
    }

    await c.env.DB.prepare(`
        INSERT INTO house_members (house_id, user_id, role, rotation_order)
        VALUES (?, ?, 'member', (SELECT COALESCE(MAX(rotation_order), -1) + 1 FROM house_members WHERE house_id = ?))
    `).bind(house.id, user.id, house.id).run();

    return c.json({ id: house.id, name: house.name, role: "member" }, 201);
});

export default join;
