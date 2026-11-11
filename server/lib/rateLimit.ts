import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../types/types";

type Limiter = "AUTH_LIMITER" | "JOIN_LIMITER" | "API_LIMITER";

// Limits requests per IP address. When the limit is reached:
// - "json": answers 429, for fetch() calls from the app
// - "redirect": sends the browser back to the login page, for pages the browser opens directly
export function rateLimit(
    limiter: Limiter,
    onLimit: "json" | "redirect" = "json",
): MiddlewareHandler<AppEnv> {
    return async (c, next) => {
        // Cloudflare puts the visitor's real IP in this header
        const ip = c.req.header("cf-connecting-ip") ?? "unknown";
        const { success } = await c.env[limiter].limit({ key: ip });

        if (!success) {
            console.warn(`Rate limit (${limiter}) reached`);
            if (onLimit === "redirect") {
                return c.redirect("/login?error=too_many");
            }
            return c.json(
                { error: "Too many attempts. Wait a minute and try again." },
                429,
            );
        }

        await next();
    };
}
