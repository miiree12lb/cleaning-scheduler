import { createMiddleware } from "hono/factory";
import type { AppEnv, Role } from "../types/types";
import type { SessionUser } from "../../shared/types";
import { parseId } from "./validate";

export const requireMember = createMiddleware<AppEnv>(async (c, next) => {
    const user: SessionUser = c.get("user");
    
    const houseId = parseId(c.req.param("houseId"));
    if (houseId === null) {
        return c.json({ error: "Invalid house id" }, 400);
    }

    const row = await c.env.DB.prepare("SELECT role FROM house_members WHERE house_id = ? AND user_id = ?").bind(houseId, user.id).first<{ role: Role }>();

    if (!row) {
        return c.json({ error: "Home not found" }, 404);
    }

    c.set("membership", { houseId, role: row.role });
    await next();
});

export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
    const membership = c.get("membership");
    if (membership.role !== "admin") {
        return c.json({ error: "Only admins can do this" }, 403);
    }
    await next();
});
