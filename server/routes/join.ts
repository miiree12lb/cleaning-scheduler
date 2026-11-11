import { Hono } from "hono";
import type { AppEnv } from "../types/types";
import type { Role } from "../../shared/types";
import { requireAuth } from "../lib/auth";
import { parseInviteCode } from "../lib/validate";
import { rateLimit } from "../lib/rateLimit";
import { LIMITS, countOf } from "../lib/limits";

const join = new Hono<AppEnv>();
join.use(requireAuth);

join.post("/:code", rateLimit("JOIN_LIMITER"), async (c) => {
    const code = parseInviteCode(c.req.param("code"));
    if (code === null) {
        return c.json({ error: "Invalid invite code" }, 400);
    }

    const house = await c.env.DB.prepare(
        "SELECT id, name FROM houses WHERE invite_code = ?",
    )
        .bind(code)
        .first<{ id: number; name: string }>();
    if (!house) {
        return c.json(
            { error: "This invite link is invalid or has been replaced" },
            404,
        );
    }

    const user = c.get("user");

    // 1. Already a member? Then the link just takes them in, with their current role.
    const existing = await c.env.DB.prepare(
        "SELECT role FROM house_members WHERE house_id = ? AND user_id = ?",
    )
        .bind(house.id, user.id)
        .first<{ role: Role }>();
    if (existing) {
        return c.json({ id: house.id, name: house.name, role: existing.role });
    }

    // 2. New member: check the limits before adding them
    const [myHouses, members] = await Promise.all([
        countOf(
            c.env.DB,
            "SELECT COUNT(*) AS count FROM house_members WHERE user_id = ?",
            user.id,
        ),
        countOf(
            c.env.DB,
            "SELECT COUNT(*) AS count FROM house_members WHERE house_id = ?",
            house.id,
        ),
    ]);
    if (myHouses >= LIMITS.housesPerUser) {
        return c.json(
            {
                error: `You can be in at most ${LIMITS.housesPerUser} houses. Leave one first.`,
            },
            409,
        );
    }
    if (members >= LIMITS.membersPerHouse) {
        return c.json(
            {
                error: `This house is full (${LIMITS.membersPerHouse} members).`,
            },
            409,
        );
    }

    // 3. Add them. ON CONFLICT still covers a double click: two requests at the same moment.
    const result = await c.env.DB.prepare(
        `
        INSERT INTO house_members (house_id, user_id, role, rotation_order)
        VALUES (?, ?, 'member', (SELECT COALESCE(MAX(rotation_order), -1) + 1 FROM house_members WHERE house_id = ?))
        ON CONFLICT (house_id, user_id) DO NOTHING
    `,
    )
        .bind(house.id, user.id, house.id)
        .run();

    if (result.meta.changes === 1) {
        return c.json({ id: house.id, name: house.name, role: "member" }, 201);
    }

    // The other request of a double click got there first: they're a member now
    return c.json({ id: house.id, name: house.name, role: "member" });
});

export default join;
