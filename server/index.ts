import { Hono } from "hono";
import health from "./routes/health";
import auth from "./routes/auth";

const app = new Hono<{ Bindings: Env }>().basePath("/api");

app.route("/health", health);
app.route("/auth", auth);

export default app;