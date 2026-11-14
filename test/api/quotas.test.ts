import { describe, expect, it } from "vitest";
import { api, createHouse, createTask, signUp } from "./helpers";

describe("quotas", () => {
    it("allows 50 active tasks per house, and refuses the 51st", async () => {
        const admin = await signUp("Admin");
        const house = await createHouse(admin.session);

        for (let i = 1; i <= 50; i++) {
            await createTask(admin.session, house.id, `Task ${i}`);
        }

        const res = await api(`/api/houses/${house.id}/tasks`, {
            method: "POST",
            body: { name: "Task 51" },
            session: admin.session,
        });
        expect(res.status).toBe(409);
    });

    it("allows 10 houses per user, and refuses the 11th", async () => {
        const user = await signUp();

        for (let i = 1; i <= 10; i++) {
            await createHouse(user.session, `House ${i}`);
        }

        const res = await api("/api/houses", {
            method: "POST",
            body: { name: "House 11" },
            session: user.session,
        });
        expect(res.status).toBe(409);
    });
});
