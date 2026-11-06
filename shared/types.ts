export interface SessionUser {
    id: number;
    email: string;
    name: string;
}

export type HouseSummary = {
    id: number;
    name: string;
    role: "admin" | "member";
};

export type Task = {
    id: number;
    house_id: number;
    name: string;
    description: string | null;
    active: number;
}

export const ROLES = ["admin", "member"] as const;
export type Role = (typeof ROLES)[number];

export type Member = {
    id: number;
    name: string;
    role: Role;
    uses_dishwasher: number;
};
