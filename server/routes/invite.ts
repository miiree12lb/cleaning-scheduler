import { Hono } from "hono";
import type { AppEnv } from "../types/types";
import { requireAuth } from "../lib/auth";
import { requireMember, requireAdmin } from "../lib/membership";
import { randomHex } from "../lib/random";

const invite = new Hono<AppEnv>();
invite.use(requireAuth, requireMember, requireAdmin);

invite.get("/", async (c) => {
    const { houseId } = c.get("membership");
    const row = await c.env.DB.prepare(
        "SELECT invite_code FROM houses WHERE id = ?",
    )
        .bind(houseId)
        .first<{ invite_code: string }>();
    if (!row) {
        return c.json({ error: "Invite code not found" }, 404);
    }
    return c.json({ code: row.invite_code });
});

invite.post("/regenerate", async (c) => {
    const { houseId } = c.get("membership");
    const code = randomHex(5);

    const row = await c.env.DB.prepare(
        "UPDATE houses SET invite_code = ? WHERE id = ? RETURNING invite_code",
    )
        .bind(code, houseId)
        .first<{ invite_code: string }>();

    if (!row) {
        return c.json({ error: "House not found" }, 404);
    }
    return c.json({ code: row.invite_code });
});

export default invite;
