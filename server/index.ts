import { Hono } from "hono";
import type { AppEnv } from "./types/types";
import health from "./routes/health";
import auth from "./routes/auth";
import houses from "./routes/houses";
import tasks from "./routes/tasks";
import invite from "./routes/invite";
import join from "./routes/join";
import members from "./routes/members";
import weeks from "./routes/weeks";
import rules from "./routes/rules";
import { secureHeaders } from "hono/secure-headers";
import { rateLimit } from "./lib/rateLimit";

const app = new Hono<AppEnv>().basePath("/api");
app.use("*", secureHeaders());
app.use("/api/*", rateLimit("API_LIMITER"));

app.route("/health", health);
app.route("/auth", auth);
app.route("/houses", houses);
app.route("/houses/:houseId/tasks", tasks);
app.route("/houses/:houseId/invite", invite);
app.route("/join", join);
app.route("/houses/:houseId/members", members);
app.route("/houses/:houseId/weeks", weeks);
app.route("/houses/:houseId/rules", rules);

export default app;
