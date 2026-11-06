import { afterEach, describe, expect, it, vi } from "vitest";
import { addWeeks, mondayOf, dateIn, weeksBetween, dateOfTimestamp } from "../../../server/lib/weeks";

describe("mondayOf", () => {
    it("keeps a Monday as it is", () => {
        expect(mondayOf("2026-11-02")).toBe("2026-11-02");
    });

    it("goes back from a Friday", () => {
        expect(mondayOf("2026-11-06")).toBe("2026-11-02");
    });

    it("treats Sunday as the end of the week", () => {
        expect(mondayOf("2026-11-08")).toBe("2026-11-02");
    });

    it("crosses a month boundary", () => {
        expect(mondayOf("2026-03-01")).toBe("2026-02-23");
    });

    it("crosses a year boundary", () => {
        expect(mondayOf("2027-01-01")).toBe("2026-12-28");
    });

    it("handles a leap day", () => {
        expect(mondayOf("2028-02-29")).toBe("2028-02-28");
        expect(mondayOf("2028-03-01")).toBe("2028-02-28");
    });
});

describe("addWeeks", () => {
    it("moves forward", () => {
        expect(addWeeks("2026-11-02", 4)).toBe("2026-11-30");
    });

    it("moves back", () => {
        expect(addWeeks("2026-11-02", -1)).toBe("2026-10-26");
    });

    it("stays put when adding 0", () => {
        expect(addWeeks("2026-11-02", 0)).toBe("2026-11-02");
    });

    it("crosses into the next month", () => {
        expect(addWeeks("2026-11-30", 1)).toBe("2026-12-07");
    });
});

describe("weeksBetween", () => {
    it("counts forward", () => {
        expect(weeksBetween("2026-11-02", "2026-11-30")).toBe(4);
    });

    it("counts backward as negative", () => {
        expect(weeksBetween("2026-11-30", "2026-11-02")).toBe(-4);
    });

    it("is 0 for the same week", () => {
        expect(weeksBetween("2026-11-02", "2026-11-02")).toBe(0);
    });

    it("is not affected by the autumn clock change (25 October 2026)", () => {
        expect(weeksBetween("2026-10-19", "2026-11-02")).toBe(2);
    });

    it("is not affected by the spring clock change (29 March 2026)", () => {
        expect(weeksBetween("2026-03-23", "2026-04-06")).toBe(2);
    });

    it("crosses a year boundary", () => {
        expect(weeksBetween("2026-12-28", "2027-01-04")).toBe(1);
    });
});

describe("dateIn", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("returns a date in YYYY-MM-DD format", () => {
        expect(dateIn("Europe/Berlin")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("uses the house's timezone, not UTC", () => {
        // Sunday 23:30 UTC is already Monday 00:30 in Berlin
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-11-08T23:30:00Z"));

        expect(dateIn("UTC")).toBe("2026-11-08");
        expect(dateIn("Europe/Berlin")).toBe("2026-11-09");
    });

    it("puts Monday-just-after-midnight in the new week", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-11-08T23:30:00Z"));

        expect(mondayOf(dateIn("Europe/Berlin"))).toBe("2026-11-09");
    });
});

describe("dateOfTimestamp", () => {
    it("reads the database time as UTC", () => {
        expect(dateOfTimestamp("2026-11-05 21:20:14", "UTC")).toBe("2026-11-05");
    });

    it("converts to the house's timezone", () => {
        // 23:30 UTC on Sunday is 00:30 on Monday in Berlin
        expect(dateOfTimestamp("2026-11-08 23:30:00", "Europe/Berlin")).toBe("2026-11-09");
        expect(dateOfTimestamp("2026-11-08 23:30:00", "UTC")).toBe("2026-11-08");
    });
});
