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
    description?: string;
    active: number;
}
