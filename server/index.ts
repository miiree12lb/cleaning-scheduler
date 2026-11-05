import { Hono } from "hono";
import health from "./routes/health";

const app = new Hono<{ Bindings: Env }>().basePath("/api");

app.route("/health", health);

export default app;