import { createMiddleware } from "hono/factory";
import type { AppEnv, Role } from "../types/types";
import type { SessionUser } from "../../shared/types";

export const requireMember = createMiddleware<AppEnv>(async (c, next) => {
    const user: SessionUser = c.get("user");
    
    const houseId = Number(c.req.param("houseId"));
    if (!Number.isInteger(houseId) || houseId <= 0) {
        return c.json({ error: "Invalid house id" }, 400);
    }

    const row = await c.env.DB.prepare("SELECT role FROM house_members WHERE house_id = ? AND user_id = ?").bind(houseId, user.id).first<{ role: Role }>();

    if (!row) {
        return c.json({ error: "You are not a member of this house" }, 404);
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
