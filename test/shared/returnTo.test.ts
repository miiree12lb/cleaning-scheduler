import { describe, expect, it } from "vitest";
import { safeReturnTo } from "../../shared/returnTo";

describe("safeReturnTo", () => {
    it("accepts paths inside the app", () => {
        expect(safeReturnTo("/")).toBe("/");
        expect(safeReturnTo("/join/2646e9d0c3")).toBe("/join/2646e9d0c3");
        expect(safeReturnTo("/houses/2/calendar?week=2026-11-16")).toBe(
            "/houses/2/calendar?week=2026-11-16",
        );
    });

    it("rejects nothing at all", () => {
        expect(safeReturnTo(null)).toBeNull();
        expect(safeReturnTo(undefined)).toBeNull();
        expect(safeReturnTo("")).toBeNull();
    });

    it("rejects other websites", () => {
        expect(safeReturnTo("https://evil.com")).toBeNull();
        expect(safeReturnTo("evil.com")).toBeNull();
        expect(safeReturnTo("//evil.com")).toBeNull();
    });

    it("rejects tricks that browsers turn into another website", () => {
        expect(safeReturnTo("/\\evil.com")).toBeNull(); // "/\evil.com" becomes "//evil.com"
        expect(safeReturnTo("/\\/evil.com")).toBeNull();
        expect(safeReturnTo("/\t/evil.com")).toBeNull(); // browsers drop tabs
        expect(safeReturnTo("/\n/evil.com")).toBeNull(); // and line breaks
    });

    it("rejects scripts", () => {
        expect(safeReturnTo("javascript:alert(1)")).toBeNull();
    });
});
