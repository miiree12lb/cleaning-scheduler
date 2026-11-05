import { Hono } from "hono";
import { requireAuth } from "../lib/auth";
import { type AppEnv } from "../types/types";

const auth = new Hono<AppEnv>();

auth.get("/me", requireAuth, (c) => {
    return c.json(c.get("user"));
});

export default auth;