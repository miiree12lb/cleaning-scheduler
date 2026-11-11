import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import type { AppEnv } from "../types/types";
import { getSessionUser } from "./session";

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
    const sessionId = getCookie(c, "session");
    if (!sessionId) return c.json({ error: "Not authenticated" }, 401);

    const sessionUser = await getSessionUser(c.env.DB, sessionId);
    if (!sessionUser)
        return c.json({ error: "Invalid or expired session" }, 401);

    c.set("user", sessionUser);

    await next();
});
