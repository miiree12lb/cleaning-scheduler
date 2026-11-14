import { describe, expect, it } from "vitest";
import { api, createHouse, joinHouse, signUp } from "./helpers";

describe("admins", () => {
    it("won't let the only admin leave", async () => {
        const admin = await signUp("Admin");
        const member = await signUp("Member");
        const house = await createHouse(admin.session);
        await joinHouse(admin.session, house.id, member.session);

        const res = await api(`/api/houses/${house.id}/members/me`, {
            method: "DELETE",
            session: admin.session,
        });
        expect(res.status).toBe(409);
    });

    it("won't let the only admin step down", async () => {
        const admin = await signUp("Admin");
        const house = await createHouse(admin.session);

        const res = await api(
            `/api/houses/${house.id}/members/${admin.id}/role`,
            {
                method: "PATCH",
                body: { role: "member" },
                session: admin.session,
            },
        );
        expect(res.status).toBe(409);
    });

    it("lets an admin step down once there's another admin", async () => {
        const admin = await signUp("Admin");
        const second = await signUp("Second");
        const house = await createHouse(admin.session);
        await joinHouse(admin.session, house.id, second.session);

        const promote = await api(
            `/api/houses/${house.id}/members/${second.id}/role`,
            {
                method: "PATCH",
                body: { role: "admin" },
                session: admin.session,
            },
        );
        expect(promote.status).toBe(200);

        const stepDown = await api(
            `/api/houses/${house.id}/members/${admin.id}/role`,
            {
                method: "PATCH",
                body: { role: "member" },
                session: admin.session,
            },
        );
        expect(stepDown.status).toBe(200);
    });

    it("lets members leave", async () => {
        const admin = await signUp("Admin");
        const member = await signUp("Member");
        const house = await createHouse(admin.session);
        await joinHouse(admin.session, house.id, member.session);

        const res = await api(`/api/houses/${house.id}/members/me`, {
            method: "DELETE",
            session: member.session,
        });
        expect(res.ok).toBe(true);

        // And afterwards the house is closed to them
        const after = await api(`/api/houses/${house.id}`, {
            session: member.session,
        });
        expect([403, 404]).toContain(after.status);
    });

    it("won't let a member change roles", async () => {
        const admin = await signUp("Admin");
        const member = await signUp("Member");
        const house = await createHouse(admin.session);
        await joinHouse(admin.session, house.id, member.session);

        const res = await api(
            `/api/houses/${house.id}/members/${member.id}/role`,
            {
                method: "PATCH",
                body: { role: "admin" },
                session: member.session,
            },
        );
        expect(res.status).toBe(403);
    });
});
