import { describe, expect, it } from "vitest";
import { planWeek } from "../../../server/lib/rotation";

const A = 10;
const B = 20;
const C = 30;
const D = 40;

describe("planWeek", () => {
    it("gives each task to one person, and someone rests (3 tasks, 4 people)", () => {
        expect(planWeek([A, B, C, D], [1, 2, 3], 0)).toEqual([
            { taskId: 1, userId: A },
            { taskId: 2, userId: B },
            { taskId: 3, userId: C },
        ]);
    });

    it("shifts everyone by one the next week", () => {
        expect(planWeek([A, B, C, D], [1, 2, 3], 1)).toEqual([
            { taskId: 1, userId: B },
            { taskId: 2, userId: C },
            { taskId: 3, userId: D },
        ]);
    });

    it("gives some people two tasks when there are more tasks than people", () => {
        expect(planWeek([A, B, C], [1, 2, 3, 4, 5], 0)).toEqual([
            { taskId: 1, userId: A },
            { taskId: 2, userId: B },
            { taskId: 3, userId: C },
            { taskId: 4, userId: A },
            { taskId: 5, userId: B },
        ]);
    });

    it("lets everyone do every task once over n weeks", () => {
        const members = [A, B, C];
        const tasks = [1, 2, 3];
        const seen = new Set<string>();

        for (let week = 0; week < 3; week++) {
            for (const { taskId, userId } of planWeek(members, tasks, week)) {
                seen.add(`${userId}-${taskId}`);
            }
        }

        // 3 people × 3 tasks = 9 different combinations
        expect(seen.size).toBe(9);
    });

    it("returns nothing when there are no members", () => {
        expect(planWeek([], [1, 2, 3], 0)).toEqual([]);
    });

    it("returns nothing when there are no tasks", () => {
        expect(planWeek([A, B], [], 0)).toEqual([]);
    });

    it("still gives valid people for a negative week", () => {
        expect(planWeek([A, B, C], [1], -1)).toEqual([{ taskId: 1, userId: C }]);
    });
});
