import { Hono } from "hono";
import type { AppEnv } from "./types/types";
import health from "./routes/health";
import auth from "./routes/auth";
import houses from "./routes/houses";
import tasks from "./routes/tasks";
import invite from "./routes/invite";
import join from "./routes/join";

const app = new Hono<AppEnv>().basePath("/api");

app.route("/health", health);
app.route("/auth", auth);
app.route("/houses", houses);
app.route("/houses/:houseId/tasks", tasks);
app.route("/houses/:houseId/invite", invite);
app.route("/join", join);

export default app;
