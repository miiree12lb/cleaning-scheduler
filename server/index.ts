import { Hono } from "hono";
import health from "./routes/health";
import auth from "./routes/auth";
import houses from "./routes/houses";

const app = new Hono<{ Bindings: Env }>().basePath("/api");

app.route("/health", health);
app.route("/auth", auth);
app.route("/houses", houses);

export default app;