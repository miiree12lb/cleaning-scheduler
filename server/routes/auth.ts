import { Hono } from "hono";
import { requireAuth } from "../lib/auth";
import { type AppEnv } from "../types/types";
import { deleteCookie, getCookie } from "hono/cookie";
import { deleteSession } from "../lib/session";

const auth = new Hono<AppEnv>();

auth.get("/me", requireAuth, (c) => {
    return c.json(c.get("user"));
});


auth.post("/logout", async (c) => {
    const sessionId = getCookie(c, "session");
    if (sessionId) {
        await deleteSession(c.env.DB, sessionId);
    }
    deleteCookie(c, "session");
    return c.json({ ok: true });
});

export default auth;