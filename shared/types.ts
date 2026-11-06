export type SessionUser = {
    id: number;
    email: string;
    name: string;
}

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
}


export type Member = {
    id: number;
    name: string;
    role: Role;
    uses_dishwasher: number;
};

export type WeekPlan = {
    weekStart: string;
    status: "past" | "current" | "preview";
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
    }[];
};

export type Assignment = WeekPlan["assignments"][number];

export type RuleKind = "house" | "dishwasher";

export type Rule = {
    id: number;
    kind: RuleKind;
    text: string;
    position: number;
};
