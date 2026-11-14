import { describe, expect, it } from "vitest";
import { extractCode } from "../../web/src/utils/inviteLink";

describe("extractCode", () => {
    it("takes the code from a whole invite link", () => {
        expect(extractCode("https://cleaning-scheduler.miiree12lb.workers.dev/join/2646e9d0c3")).toBe("2646e9d0c3");
        expect(extractCode("http://localhost:5173/join/2646e9d0c3/")).toBe("2646e9d0c3");
    });

    it("accepts just the code, in any case and with spaces around", () => {
        expect(extractCode("2646e9d0c3")).toBe("2646e9d0c3");
        expect(extractCode("  2646E9D0C3  ")).toBe("2646e9d0c3");
    });

    it("rejects anything without a valid code at the end", () => {
        expect(extractCode("")).toBeNull();
        expect(extractCode("hello")).toBeNull();
        expect(extractCode("2646e9d0c")).toBeNull(); // 9 characters
        expect(extractCode("2646e9d0cz")).toBeNull(); // not hex
        expect(extractCode("https://example.com/join/")).toBeNull();
    });
});
