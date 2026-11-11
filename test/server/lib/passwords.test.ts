import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../../server/lib/passwords";

describe("passwords", () => {
    it("accepts the right password", async () => {
        const stored = await hashPassword("correct horse battery");
        expect(await verifyPassword("correct horse battery", stored)).toBe(
            true,
        );
    });

    it("rejects a wrong password", async () => {
        const stored = await hashPassword("correct horse battery");
        expect(await verifyPassword("correct horse batterY", stored)).toBe(
            false,
        );
    });

    it("gives the same password a different salt and hash each time", async () => {
        const a = await hashPassword("same password");
        const b = await hashPassword("same password");
        expect(a.salt).not.toBe(b.salt);
        expect(a.hash).not.toBe(b.hash);
    });
});
