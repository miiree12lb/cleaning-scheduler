import { Hono } from "hono";

const health = new Hono<{ Bindings: Env }>();

health.get("/", async (c) => {
    const row = await c.env.DB.prepare("SELECT COUNT(*) AS count FROM users").first<{ count: number }>();
    const userCount = row?.count ?? 0;

    return c.json({ ok: true, users: userCount });
});

export default health;