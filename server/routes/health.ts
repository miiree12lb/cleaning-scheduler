import { Hono } from "hono";

const health = new Hono<{ Bindings: Env }>();

health.get("/", async (c) => {
    return c.json({ ok: true });
});

export default health;