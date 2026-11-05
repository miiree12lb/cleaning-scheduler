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
