import { describe, expect, it } from "vitest";
import { api, createHouse, joinHouse, signUp } from "./helpers";

describe("access to a house", () => {
    it("lets members read the house", async () => {
        const admin = await signUp("Admin");
        const house = await createHouse(admin.session);

        for (const path of [
            "",
            "/tasks",
            "/rules",
            "/members",
            "/weeks/current",
        ]) {
            const res = await api(`/api/houses/${house.id}${path}`, {
                session: admin.session,
            });
            expect(res.status, `GET /api/houses/:id${path}`).toBe(200);
        }
    });

    it("hides the house from people who aren't members", async () => {
        const admin = await signUp("Admin");
        const outsider = await signUp("Outsider");
        const house = await createHouse(admin.session);

        for (const path of [
            "",
            "/tasks",
            "/rules",
            "/members",
            "/weeks/current",
            "/invite",
        ]) {
            const res = await api(`/api/houses/${house.id}${path}`, {
                session: outsider.session,
            });
            expect([403, 404], `GET /api/houses/:id${path}`).toContain(
                res.status,
            );
        }
    });

    it("refuses requests without a session", async () => {
        const admin = await signUp("Admin");
        const house = await createHouse(admin.session);

        const res = await api(`/api/houses/${house.id}/tasks`);
        expect(res.status).toBe(401);
    });

    it("lets only admins add tasks", async () => {
        const admin = await signUp("Admin");
        const member = await signUp("Member");
        const house = await createHouse(admin.session);
        await joinHouse(admin.session, house.id, member.session);

        const asMember = await api(`/api/houses/${house.id}/tasks`, {
            method: "POST",
            body: { name: "Kitchen" },
            session: member.session,
        });
        expect(asMember.status).toBe(403);

        const asAdmin = await api(`/api/houses/${house.id}/tasks`, {
            method: "POST",
            body: { name: "Kitchen" },
            session: admin.session,
        });
        expect(asAdmin.status).toBe(201);
    });

    it("hides the invite code from members", async () => {
        const admin = await signUp("Admin");
        const member = await signUp("Member");
        const house = await createHouse(admin.session);
        await joinHouse(admin.session, house.id, member.session);

        const res = await api(`/api/houses/${house.id}/invite`, {
            session: member.session,
        });
        expect(res.status).toBe(403);
    });
});
