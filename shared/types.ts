export type SessionUser = {
    id: number;
    email: string;
    name: string;
};

export const ROLES = ["admin", "member"] as const;
export type Role = (typeof ROLES)[number];

export type HouseSummary = {
    id: number;
    name: string;
    role: Role;
};

export type Task = {
    id: number;
    name: string;
    description: string | null;
    active: number;
};

export type Member = {
    id: number;
    name: string;
    role: Role;
};

export type WeekPlan = {
    weekStart: string;
    status: "past" | "current" | "preview";
    canMark: boolean;
    currentWeekStart: string;
    firstWeekStart: string;
    assignments: {
        taskId: number;
        taskName: string;
        userId: number | null;
        userName: string | null;
        doneAt: string | null;
        doneById: number | null;
        doneByName: string | null;
        late: boolean;
    }[];
};

export type Assignment = WeekPlan["assignments"][number];

export type Rule = {
    id: number;
    sectionId: number;
    text: string;
    position: number;
};

export type RuleSection = {
    id: number;
    name: string;
    position: number;
    optIn: boolean;
    rules: Rule[];
    users: { id: number; name: string }[]; // who uses it (opt-in sections only)
};