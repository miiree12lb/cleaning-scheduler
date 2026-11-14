import { describe, expect, it } from "vitest";
import { api, sessionFrom, signUp } from "./helpers";

const PASSWORD = "long enough password";

describe("sign-up", () => {
    it("refuses an email that already has an account, on the email field", async () => {
        const user = await signUp();
        const res = await api("/api/auth/register", {
            method: "POST",
            body: {
                name: "Copy",
                email: user.email.toUpperCase(),
                password: PASSWORD,
                ageConfirmed: true,
            },
        });
        expect(res.status).toBe(409);
        expect(await res.json()).toMatchObject({ field: "email" });
    });

    it("needs the age confirmation", async () => {
        const res = await api("/api/auth/register", {
            method: "POST",
            body: {
                name: "Young",
                email: `young-${Date.now()}@test.local`,
                password: PASSWORD,
            },
        });
        expect(res.status).toBe(400);
        expect(await res.json()).toMatchObject({ field: "ageConfirmed" });
    });

    it("refuses a short password, on the password field", async () => {
        const res = await api("/api/auth/register", {
            method: "POST",
            body: {
                name: "Short",
                email: `short-${Date.now()}@test.local`,
                password: "123456789",
                ageConfirmed: true,
            },
        });
        expect(res.status).toBe(400);
        expect(await res.json()).toMatchObject({ field: "password" });
    });
});

describe("login", () => {
    it("works with the email in different capitals", async () => {
        const user = await signUp("Capitals");
        const res = await api("/api/auth/login", {
            method: "POST",
            body: { email: user.email.toUpperCase(), password: PASSWORD },
        });
        expect(res.status).toBe(200);
        expect(sessionFrom(res)).toBeTruthy();
    });

    it("gives the same answer for a wrong password and an unknown email", async () => {
        const user = await signUp();
        const wrongPassword = await api("/api/auth/login", {
            method: "POST",
            body: { email: user.email, password: "not the password" },
        });
        const unknownEmail = await api("/api/auth/login", {
            method: "POST",
            body: {
                email: `nobody-${Date.now()}@test.local`,
                password: PASSWORD,
            },
        });

        expect(wrongPassword.status).toBe(401);
        expect(unknownEmail.status).toBe(401);
        expect(await wrongPassword.json()).toEqual(await unknownEmail.json());
    });
});

describe("sessions", () => {
    it("knows who you are, and forgets after logging out", async () => {
        const user = await signUp("Me");

        const me = await api("/api/auth/me", { session: user.session });
        expect(me.status).toBe(200);
        expect(await me.json()).toMatchObject({ id: user.id, name: "Me" });

        await api("/api/auth/logout", {
            method: "POST",
            session: user.session,
        });

        const after = await api("/api/auth/me", { session: user.session });
        expect(after.status).toBe(401);
    });

    it("logs out every device with 'log out on all devices'", async () => {
        const user = await signUp();
        const login = await api("/api/auth/login", {
            method: "POST",
            body: { email: user.email, password: PASSWORD },
        });
        const secondDevice = sessionFrom(login);

        await api("/api/auth/logout-everywhere", {
            method: "POST",
            session: user.session,
        });

        expect(
            (await api("/api/auth/me", { session: user.session })).status,
        ).toBe(401);
        expect(
            (await api("/api/auth/me", { session: secondDevice })).status,
        ).toBe(401);
    });

    it("refuses a made-up session", async () => {
        const res = await api("/api/auth/me", {
            session: "not-a-real-session",
        });
        expect(res.status).toBe(401);
    });
});
