import { describe, expect, it } from "vitest";
import {
    parseDescription,
    parseEmail,
    parseId,
    parseIdList,
    parseInviteCode,
    parseName,
    parsePassword,
    parseRole,
    parseRuleText,
    parseSectionName,
    parseWeekStart,
} from "../../../server/lib/validate";

describe("parseId", () => {
    it("accepts positive whole numbers", () => {
        expect(parseId("1")).toBe(1);
        expect(parseId("42")).toBe(42);
    });

    it("rejects zero, negatives, decimals and text", () => {
        expect(parseId("0")).toBeNull();
        expect(parseId("-3")).toBeNull();
        expect(parseId("2.5")).toBeNull();
        expect(parseId("abc")).toBeNull();
        expect(parseId("")).toBeNull();
        expect(parseId(undefined)).toBeNull();
    });
});

describe("parseIdList", () => {
    it("accepts a list of ids, also sent as text", () => {
        expect(parseIdList([3, 1, 2])).toEqual([3, 1, 2]);
        expect(parseIdList(["4", "5"])).toEqual([4, 5]);
        expect(parseIdList([])).toEqual([]);
    });

    it("rejects anything that isn't a list of valid ids", () => {
        expect(parseIdList("1,2,3")).toBeNull();
        expect(parseIdList([1, "x"])).toBeNull();
        expect(parseIdList([1, 0])).toBeNull();
        expect(parseIdList(null)).toBeNull();
    });
});

describe("parseName", () => {
    it("trims the name", () => {
        expect(parseName("  Kitchen  ")).toEqual({
            ok: true,
            value: "Kitchen",
        });
    });

    it("rejects empty, too long, and non-text names", () => {
        expect(parseName("   ").ok).toBe(false);
        expect(parseName("a".repeat(51)).ok).toBe(false);
        expect(parseName(42).ok).toBe(false);
        expect(parseName(undefined).ok).toBe(false);
    });

    it("accepts exactly 50 characters", () => {
        expect(parseName("a".repeat(50)).ok).toBe(true);
    });
});

describe("parseDescription", () => {
    it("treats missing or empty as no description", () => {
        expect(parseDescription(undefined)).toEqual({ ok: true, value: null });
        expect(parseDescription(null)).toEqual({ ok: true, value: null });
        expect(parseDescription("   ")).toEqual({ ok: true, value: null });
    });

    it("trims, and limits the length to 200", () => {
        expect(parseDescription("  Wipe the stove too ")).toEqual({
            ok: true,
            value: "Wipe the stove too",
        });
        expect(parseDescription("a".repeat(201)).ok).toBe(false);
    });
});

describe("parseInviteCode", () => {
    it("accepts 10 hex characters, in any case and with spaces around", () => {
        expect(parseInviteCode("2646e9d0c3")).toBe("2646e9d0c3");
        expect(parseInviteCode(" 2646E9D0C3 ")).toBe("2646e9d0c3");
    });

    it("rejects the wrong length or other characters", () => {
        expect(parseInviteCode("2646e9d0c")).toBeNull();
        expect(parseInviteCode("2646e9d0c3a")).toBeNull();
        expect(parseInviteCode("2646e9d0cz")).toBeNull();
        expect(parseInviteCode(undefined)).toBeNull();
    });
});

describe("parseRole", () => {
    it("accepts the two roles only", () => {
        expect(parseRole("admin")).toBe("admin");
        expect(parseRole("member")).toBe("member");
        expect(parseRole("owner")).toBeNull();
        expect(parseRole("ADMIN")).toBeNull();
        expect(parseRole(undefined)).toBeNull();
    });
});

describe("parseWeekStart", () => {
    it("accepts a Monday", () => {
        expect(parseWeekStart("2026-11-16")).toBe("2026-11-16");
    });

    it("rejects other days and other formats", () => {
        expect(parseWeekStart("2026-11-18")).toBeNull(); // a Wednesday
        expect(parseWeekStart("16-11-2026")).toBeNull();
        expect(parseWeekStart("2026-11-16T00:00")).toBeNull();
        expect(parseWeekStart("current")).toBeNull();
    });
});

describe("parseSectionName", () => {
    it("trims, and limits the length to 40", () => {
        expect(parseSectionName(" Dishwasher ")).toEqual({
            ok: true,
            value: "Dishwasher",
        });
        expect(parseSectionName("a".repeat(41)).ok).toBe(false);
        expect(parseSectionName("").ok).toBe(false);
    });
});

describe("parseRuleText", () => {
    it("trims, and limits the length to 300", () => {
        expect(parseRuleText("  No shoes inside ")).toEqual({
            ok: true,
            value: "No shoes inside",
        });
        expect(parseRuleText("a".repeat(301)).ok).toBe(false);
        expect(parseRuleText("   ").ok).toBe(false);
    });
});

describe("parsePassword", () => {
    it("accepts 10 to 200 characters, without trimming", () => {
        expect(parsePassword("1234567890")).toEqual({
            ok: true,
            value: "1234567890",
        });
        expect(parsePassword("  spaces count  ")).toEqual({
            ok: true,
            value: "  spaces count  ",
        });
        expect(parsePassword("a".repeat(200)).ok).toBe(true);
    });

    it("rejects too short, too long, and non-text passwords", () => {
        expect(parsePassword("123456789").ok).toBe(false);
        expect(parsePassword("a".repeat(201)).ok).toBe(false);
        expect(parsePassword(1234567890).ok).toBe(false);
    });
});

describe("parseEmail", () => {
    it("trims and lowercases the email", () => {
        expect(parseEmail("  Roommate@Example.COM ")).toEqual({
            ok: true,
            value: "roommate@example.com",
        });
    });

    it("rejects things that aren't an email", () => {
        expect(parseEmail("roommate").ok).toBe(false);
        expect(parseEmail("roommate@example").ok).toBe(false);
        expect(parseEmail("room mate@example.com").ok).toBe(false);
        expect(parseEmail("@example.com").ok).toBe(false);
        expect(parseEmail(undefined).ok).toBe(false);
    });

    it("rejects emails longer than 254 characters", () => {
        expect(parseEmail(`${"a".repeat(250)}@example.com`).ok).toBe(false);
    });
});
