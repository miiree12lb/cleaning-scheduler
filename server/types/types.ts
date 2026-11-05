import type { SessionUser } from "../../shared/types";

export type Role = "admin" | "member";

export type Membership = {
    houseId: number;
    role: Role
};

export type AppEnv = {
    Bindings: Env;
    Variables: {
        user: SessionUser;
        membership: Membership;
    };
};
