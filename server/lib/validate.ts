import type { ParseResult } from "../types/types";
import { type Role, ROLES } from "../../shared/types";
import { mondayOf } from "./weeks";

export function parseId(value: string | undefined): number | null {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

export function parseName(input: unknown): ParseResult<string> {
    if (typeof input !== "string") {
        return { ok: false, error: "Name must be text" };
    }

    const name = input.trim();
    if (name.length === 0) {
        return { ok: false, error: "Name cannot be empty" };
    }
    if (name.length > 50) {
        return { ok: false, error: "Name cannot have more than 50 characters" };
    }

    return { ok: true, value: name };
}

export function parseDescription(input: unknown): ParseResult<string | null> {
    if (input === undefined || input === null) {
        return { ok: true, value: null };
    }
    
    if (typeof input !== "string") {
        return { ok: false, error: "Description must be text" };
    }

    const trimmed = input.trim();
    if (trimmed.length > 200) {
        return { ok: false,  error: "Description cannot have more than 200 characters" };
    }

    return { ok: true, value: trimmed === "" ? null : trimmed };
}

export function parseInviteCode(input: string | undefined): string | null {
    if (input === undefined) return null;
    const code = input.trim().toLowerCase();
    return /^[0-9a-f]{10}$/.test(code) ? code : null;
}

export function parseRole(input: unknown): Role | null {
    return ROLES.includes(input as Role) ? (input as Role) : null;
}

export function parseWeekStart(input: string): string | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input) || mondayOf(input) !== input) {
        return null;
    }
    return input;
}
