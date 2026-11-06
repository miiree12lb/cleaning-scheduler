import { Hono } from "hono";
import { requireAuth } from "../lib/auth";
import { type AppEnv } from "../types/types";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { deleteSession } from "../lib/session";
import { randomHex } from "../lib/random";
import { SESSION_DAYS, createSession } from "../lib/session";
import { exchangeCode } from "../lib/google";

const auth = new Hono<AppEnv>();

auth.get("/me", requireAuth, (c) => {
    return c.json(c.get("user"));
});

auth.get("/login", (c) => {
    const state = randomHex(16);
    const secure = new URL(c.req.url).protocol === "https:";

    // Remember the state for 10 minutes, to check it in the callback
    setCookie(c, "oauth_state", state, {
        path: "/api/auth",
        httpOnly: true,
        sameSite: "Lax",
        secure,
        maxAge: 10 * 60,
    });

    // Where to go after logging in (e.g. an invite link), only paths inside this app
    const returnTo = c.req.query("returnTo");
    if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
        setCookie(c, "oauth_return", returnTo, {
            path: "/api/auth",
            httpOnly: true,
            sameSite: "Lax",
            secure,
            maxAge: 10 * 60,
        });
    }

    const params = new URLSearchParams({
        client_id: c.env.GOOGLE_CLIENT_ID,
        redirect_uri: new URL("/api/auth/callback", c.req.url).toString(),
        response_type: "code",
        scope: "openid email profile",
        state,
        prompt: "select_account",
    });

    return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

auth.get("/callback", async (c) => {
    const secure = new URL(c.req.url).protocol === "https:";

    // Read and clear the short-lived login cookies
    const expectedState = getCookie(c, "oauth_state");
    const returnTo = getCookie(c, "oauth_return");
    deleteCookie(c, "oauth_state", { path: "/api/auth" });
    deleteCookie(c, "oauth_return", { path: "/api/auth" });

    // The person cancelled at Google, or something went wrong there
    if (c.req.query("error")) {
        return c.redirect("/login?error=cancelled");
    }

    // 1. The state must match: this login was started in this browser
    const state = c.req.query("state");
    const code = c.req.query("code");
    if (!code || !state || !expectedState || state !== expectedState) {
        return c.redirect("/login?error=failed");
    }

    // 2. Exchange the code for the user's Google profile
    const profile = await exchangeCode(
        code,
        new URL("/api/auth/callback", c.req.url).toString(),
        c.env.GOOGLE_CLIENT_ID,
        c.env.GOOGLE_CLIENT_SECRET,
    );
    if (!profile) {
        return c.redirect("/login?error=failed");
    }

    // 3. Find the user by their Google ID, or create them; keep name and email up to date
    let user: { id: number } | null;
    try {
        user = await c.env.DB.prepare(
            `INSERT INTO users (google_id, email, name)
             VALUES (?, ?, ?)
             ON CONFLICT (google_id) DO UPDATE SET email = excluded.email, name = excluded.name
             RETURNING id`,
        )
            .bind(profile.googleId, profile.email, profile.name)
            .first<{ id: number }>();
    } catch {
        // e.g. another account already uses this email
        return c.redirect("/login?error=email_in_use");
    }
    if (!user) {
        return c.redirect("/login?error=failed");
    }

    // 4. Start a session
    const sessionId = await createSession(c.env.DB, user.id);
    setCookie(c, "session", sessionId, {
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
        secure,
        maxAge: SESSION_DAYS * 24 * 60 * 60,
    });

    // 5. Back into the app, or to where they were going
    return c.redirect(returnTo ?? "/");
});

auth.post("/logout", async (c) => {
    const sessionId = getCookie(c, "session");
    if (sessionId) {
        await deleteSession(c.env.DB, sessionId);
    }
    deleteCookie(c, "session");
    return c.json({ ok: true });
});

export default auth;