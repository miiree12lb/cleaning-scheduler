import type { ParseResult } from "../types/types";
import { type Role, ROLES } from "../../shared/types";
import { mondayOf } from "./weeks";

export function parseId(value: string | undefined): number | null {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

// A list of ids from a JSON body, e.g. for reordering: [5, 2, 8]
export function parseIdList(input: unknown): number[] | null {
    if (!Array.isArray(input)) return null;
    const ids = input.map((value) => parseId(String(value)));
    return ids.every((id) => id !== null) ? (ids as number[]) : null;
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
        return {
            ok: false,
            error: "Description cannot have more than 200 characters",
        };
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

// A rule section's name, like "General" or "Dishwasher"
export function parseSectionName(input: unknown): ParseResult<string> {
    if (typeof input !== "string") {
        return { ok: false, error: "Section name must be text" };
    }

    const name = input.trim();
    if (name.length === 0) {
        return { ok: false, error: "Section name cannot be empty" };
    }
    if (name.length > 40) {
        return {
            ok: false,
            error: "Section name cannot have more than 40 characters",
        };
    }

    return { ok: true, value: name };
}

export function parseRuleText(input: unknown): ParseResult<string> {
    if (typeof input !== "string") {
        return { ok: false, error: "Rule must be text" };
    }

    const rule = input.trim();
    if (rule.length === 0) {
        return { ok: false, error: "Rule cannot be empty" };
    }
    if (rule.length > 300) {
        return {
            ok: false,
            error: "Rule cannot have more than 300 characters",
        };
    }

    return { ok: true, value: rule };
}

// Passwords are not trimmed: spaces are allowed and count
export function parsePassword(input: unknown): ParseResult<string> {
    if (typeof input !== "string") {
        return { ok: false, error: "Password must be text" };
    }
    if (input.length < 10) {
        return {
            ok: false,
            error: "Password must have at least 10 characters",
        };
    }
    if (input.length > 200) {
        return {
            ok: false,
            error: "Password cannot have more than 200 characters",
        };
    }

    return { ok: true, value: input };
}

// Emails are compared without capitals, so they're stored in lowercase
export function parseEmail(input: unknown): ParseResult<string> {
    if (typeof input !== "string") {
        return { ok: false, error: "Email must be text" };
    }

    const email = input.trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { ok: false, error: "That doesn't look like an email address" };
    }

    return { ok: true, value: email };
}
