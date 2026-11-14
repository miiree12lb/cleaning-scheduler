import { Hono, type Context } from "hono";
import { requireAuth } from "../lib/auth";
import { type AppEnv } from "../types/types";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { SESSION_DAYS, createSession, deleteSession } from "../lib/session";
import { randomHex } from "../lib/random";
import { exchangeCode } from "../lib/google";
import { removeMember } from "../lib/members";
import { rateLimit } from "../lib/rateLimit";
import { safeReturnTo } from "../../shared/returnTo";
import {
    hashPassword,
    verifyPassword,
    type StoredPassword,
} from "../lib/passwords";
import { parseEmail, parseName, parsePassword } from "../lib/validate";
import type { SessionUser } from "../../shared/types";

const auth = new Hono<AppEnv>();

// ---------- Helpers ----------

// Read the JSON body; null if it isn't valid JSON
async function readBody(
    c: Context<AppEnv>,
): Promise<Record<string, unknown> | null> {
    try {
        const body = await c.req.json();
        return body !== null && typeof body === "object" ? body : {};
    } catch {
        return null;
    }
}

// Log someone in: clean up expired sessions, create a new one, and set the cookie
async function startSession(c: Context<AppEnv>, userId: number) {
    await c.env.DB.prepare(
        "DELETE FROM sessions WHERE expires_at < datetime('now')",
    ).run();
    const token = await createSession(c.env.DB, userId);
    setCookie(c, "session", token, {
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
        secure: new URL(c.req.url).protocol === "https:",
        maxAge: SESSION_DAYS * 24 * 60 * 60,
    });
}

// Checked when the email doesn't exist, so a wrong email takes as long as a wrong password.
// Otherwise the response time would tell an attacker which emails have an account.
const DUMMY_PASSWORD: StoredPassword = {
    hash: "0".repeat(64),
    salt: "0".repeat(32),
    iterations: 100_000,
};

// ---------- Who am I ----------

auth.get("/me", requireAuth, (c) => {
    return c.json(c.get("user"));
});

auth.delete("/me", requireAuth, async (c) => {
    const user = c.get("user");

    const { results: blocking } = await c.env.DB.prepare(
        `SELECT houses.id, houses.name
         FROM house_members AS me
         JOIN houses ON houses.id = me.house_id
         WHERE me.user_id = ? AND me.role = 'admin'
           AND (SELECT COUNT(*) FROM house_members AS a
                WHERE a.house_id = me.house_id AND a.role = 'admin') = 1
         ORDER BY houses.name`,
    )
        .bind(user.id)
        .all<{ id: number; name: string }>();

    if (blocking.length > 0) {
        return c.json({ error: "last_admin", houses: blocking }, 409);
    }

    const { results: memberships } = await c.env.DB.prepare(
        "SELECT house_id AS houseId FROM house_members WHERE user_id = ?",
    )
        .bind(user.id)
        .all<{ houseId: number }>();

    for (const { houseId } of memberships) {
        const result = await removeMember(c.env.DB, houseId, user.id);
        if (result === "last_admin") {
            return c.json({ error: "last_admin", houses: [] }, 409);
        }
    }

    await c.env.DB.prepare("DELETE FROM users WHERE id = ?")
        .bind(user.id)
        .run();

    deleteCookie(c, "session", { path: "/" });
    return c.json({ ok: true });
});

// ---------- Email and password ----------

auth.post("/register", rateLimit("AUTH_LIMITER"), async (c) => {
    const body = await readBody(c);
    if (!body) return c.json({ error: "Body must be JSON" }, 400);

    // Each error says which field it's about, so the form can mark that field
    const nameResult = parseName(body.name);
    if (!nameResult.ok)
        return c.json({ error: nameResult.error, field: "name" }, 400);
    const emailResult = parseEmail(body.email);
    if (!emailResult.ok)
        return c.json({ error: emailResult.error, field: "email" }, 400);
    const passwordResult = parsePassword(body.password);
    if (!passwordResult.ok)
        return c.json({ error: passwordResult.error, field: "password" }, 400);

    // Only exactly true counts: a missing value, "true" as text, or 1 are all refused
    if (body.ageConfirmed !== true) {
        return c.json(
            {
                error: "You need to be 16 or older, and agree to the Terms, to create an account",
                field: "ageConfirmed",
            },
            400,
        );
    }

    const name = nameResult.value;
    const email = emailResult.value;

    // One account per email. Say which login it uses, so a Google user knows where to go.
    const existing = await c.env.DB.prepare(
        `SELECT users.id, password_logins.user_id IS NOT NULL AS hasPassword
         FROM users
         LEFT JOIN password_logins ON password_logins.user_id = users.id
         WHERE users.email = ? COLLATE NOCASE`,
    )
        .bind(email)
        .first<{ id: number; hasPassword: number }>();

    if (existing) {
        return c.json(
            {
                error: existing.hasPassword
                    ? "This email already has an account. Log in instead."
                    : "This email already uses Google login. Continue with Google instead.",
                field: "email",
            },
            409,
        );
    }

    const stored = await hashPassword(passwordResult.value);

    // google_id is required, so password users get a placeholder that can never match a real
    // Google id (those are numbers). Both inserts run together, or not at all.
    let user: { id: number } | null;
    try {
        const [userRes] = await c.env.DB.batch([
            c.env.DB.prepare(
                "INSERT INTO users (email, name, google_id) VALUES (?, ?, ?) RETURNING id",
            ).bind(email, name, `password:${randomHex(16)}`),
            c.env.DB.prepare(
                `INSERT INTO password_logins (user_id, hash, salt, iterations)
                 VALUES ((SELECT id FROM users WHERE email = ?), ?, ?, ?)`,
            ).bind(email, stored.hash, stored.salt, stored.iterations),
        ]);
        user = (userRes.results[0] as { id: number } | undefined) ?? null;
    } catch (err) {
        // Two sign-ups with the same email at the same moment: the UNIQUE index stops the second
        console.error("Registering failed:", err);
        return c.json(
            {
                error: "This email already has an account. Log in instead.",
                field: "email",
            },
            409,
        );
    }
    if (!user) return c.json({ error: "Could not create the account" }, 500);

    await startSession(c, user.id);

    const created: SessionUser = { id: user.id, email, name };
    return c.json(created, 201);
});

auth.post("/login", rateLimit("AUTH_LIMITER"), async (c) => {
    const body = await readBody(c);
    if (!body) return c.json({ error: "Body must be JSON" }, 400);

    // Same message for every failure, so it doesn't reveal which emails have an account
    const wrong = () => c.json({ error: "Wrong email or password" }, 401);

    const emailResult = parseEmail(body.email);
    if (!emailResult.ok || typeof body.password !== "string") return wrong();

    const row = await c.env.DB.prepare(
        `SELECT users.id, users.email, users.name,
                password_logins.hash, password_logins.salt, password_logins.iterations
         FROM users
         JOIN password_logins ON password_logins.user_id = users.id
         WHERE users.email = ? COLLATE NOCASE`,
    )
        .bind(emailResult.value)
        .first<SessionUser & StoredPassword>();

    // Always run the hash, even without a matching account (see DUMMY_PASSWORD)
    const ok = await verifyPassword(body.password, row ?? DUMMY_PASSWORD);
    if (!row || !ok) return wrong();

    await startSession(c, row.id);

    const user: SessionUser = { id: row.id, email: row.email, name: row.name };
    return c.json(user);
});

// ---------- Google ----------

auth.get("/login", rateLimit("AUTH_LIMITER", "redirect"), (c) => {
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
    const returnTo = safeReturnTo(c.req.query("returnTo"));
    if (returnTo) {
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

auth.get("/callback", rateLimit("AUTH_LIMITER", "redirect"), async (c) => {
    // Read and clear the short-lived login cookies
    const expectedState = getCookie(c, "oauth_state");
    const returnTo = safeReturnTo(getCookie(c, "oauth_return"));
    deleteCookie(c, "oauth_state", { path: "/api/auth" });
    deleteCookie(c, "oauth_return", { path: "/api/auth" });

    // The person cancelled at Google, or something went wrong there
    if (c.req.query("error")) {
        console.error("Google returned an error:", c.req.query("error"));
        return c.redirect("/login?error=cancelled");
    }

    // 1. The state must match: this login was started in this browser
    const state = c.req.query("state");
    const code = c.req.query("code");
    if (!code || !state || !expectedState || state !== expectedState) {
        console.error("State check failed:", {
            hasCode: !!code,
            hasState: !!state,
            hasCookie: !!expectedState,
            matches: state === expectedState,
        });
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

    // 3. Find the user by their Google ID, or create them; keep name and email up to date.
    //    If the email belongs to a password account, the UNIQUE index refuses it.
    let user: { id: number } | null;
    try {
        user = await c.env.DB.prepare(
            `INSERT INTO users (google_id, email, name)
             VALUES (?, ?, ?)
             ON CONFLICT (google_id) DO UPDATE SET email = excluded.email, name = excluded.name
             RETURNING id`,
        )
            .bind(profile.googleId, profile.email.toLowerCase(), profile.name)
            .first<{ id: number }>();
    } catch (err) {
        console.error("Saving the user failed:", err);
        return c.redirect("/login?error=email_in_use");
    }
    if (!user) {
        console.error("Saving the user returned no row");
        return c.redirect("/login?error=failed");
    }

    // 4. Start a session
    await startSession(c, user.id);

    // 5. Back into the app, or to where they were going
    return c.redirect(returnTo ?? "/");
});

auth.post("/logout", async (c) => {
    const token = getCookie(c, "session");
    if (token) {
        await deleteSession(c.env.DB, token);
    }
    deleteCookie(c, "session", { path: "/" });
    return c.json({ ok: true });
});

// Ends every session of this user, on every device (for a lost phone, or a shared computer)
auth.post("/logout-everywhere", requireAuth, async (c) => {
    await c.env.DB.prepare("DELETE FROM sessions WHERE user_id = ?")
        .bind(c.get("user").id)
        .run();
    deleteCookie(c, "session", { path: "/" });
    return c.json({ ok: true });
});

export default auth;
