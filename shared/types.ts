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
    weekStart: string;                          // "YYYY-MM-DD"
    status: "past" | "current" | "preview";
    assignments: {
        taskId: number;
        taskName: string;
        userId: number;
        userName: string;
        doneAt: string | null;                  // always null in previews
    }[];
};
