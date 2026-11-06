import { Hono } from "hono";
import type { AppEnv } from "../types/types";
import type { Role } from "../../shared/types";
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

    const house = await c.env.DB.prepare("SELECT id, name FROM houses WHERE invite_code = ?")
        .bind(code)
        .first<{ id: number; name: string }>();
    if (!house) {
        return c.json({ error: "This invite link is invalid or has been replaced" }, 404);
    }

    const user = c.get("user");

    const result = await c.env.DB.prepare(`
        INSERT INTO house_members (house_id, user_id, role, rotation_order)
        VALUES (?, ?, 'member', (SELECT COALESCE(MAX(rotation_order), -1) + 1 FROM house_members WHERE house_id = ?))
        ON CONFLICT (house_id, user_id) DO NOTHING
    `)
        .bind(house.id, user.id, house.id)
        .run();

    if (result.meta.changes === 1) {
        return c.json({ id: house.id, name: house.name, role: "member" }, 201);
    }

    const member = await c.env.DB.prepare(
        "SELECT role FROM house_members WHERE house_id = ? AND user_id = ?",
    )
        .bind(house.id, user.id)
        .first<{ role: Role }>();

    return c.json({ id: house.id, name: house.name, role: member?.role ?? "member" });
});

export default join;
