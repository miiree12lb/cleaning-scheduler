import { describe, expect, it } from "vitest";
import { api, createHouse, createTask, joinHouse, signUp } from "./helpers";

type Plan = {
    weekStart: string;
    assignments: { taskId: number; doneAt: string | null }[];
};

describe("ticking tasks", () => {
    it("lets anyone tick a task, but only the person who ticked it can undo it", async () => {
        const admin = await signUp("Admin");
        const member = await signUp("Member");
        const house = await createHouse(admin.session);
        await joinHouse(admin.session, house.id, member.session);
        const taskId = await createTask(admin.session, house.id, "Kitchen");

        const week = await api(`/api/houses/${house.id}/weeks/current`, {
            session: admin.session,
        });
        const plan = (await week.json()) as Plan;
        expect(plan.assignments.some((a) => a.taskId === taskId)).toBe(true);

        const path = `/api/houses/${house.id}/weeks/${plan.weekStart}/tasks/${taskId}/done`;

        const tick = await api(path, {
            method: "PUT",
            session: member.session,
        });
        expect(tick.status).toBe(200);
        expect(
            ((await tick.json()) as { doneAt: string | null }).doneAt,
        ).not.toBeNull();

        const undoByAdmin = await api(path, {
            method: "DELETE",
            session: admin.session,
        });
        expect(undoByAdmin.status).toBe(403);

        const undoByMember = await api(path, {
            method: "DELETE",
            session: member.session,
        });
        expect(undoByMember.status).toBe(200);
    });

    it("won't let outsiders tick tasks", async () => {
        const admin = await signUp("Admin");
        const outsider = await signUp("Outsider");
        const house = await createHouse(admin.session);
        const taskId = await createTask(admin.session, house.id, "Bathroom");

        const week = await api(`/api/houses/${house.id}/weeks/current`, {
            session: admin.session,
        });
        const { weekStart } = (await week.json()) as Plan;

        const res = await api(
            `/api/houses/${house.id}/weeks/${weekStart}/tasks/${taskId}/done`,
            {
                method: "PUT",
                session: outsider.session,
            },
        );
        expect([403, 404]).toContain(res.status);
    });

    it("refuses a week that doesn't start on a Monday", async () => {
        const admin = await signUp("Admin");
        const house = await createHouse(admin.session);

        const res = await api(`/api/houses/${house.id}/weeks/2026-11-18`, {
            session: admin.session,
        });
        expect(res.status).toBe(400);
    });
});
