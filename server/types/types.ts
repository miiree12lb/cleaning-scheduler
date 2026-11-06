import type { SessionUser } from "../../shared/types";
import type { Role } from "../../shared/types";


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

export type ParseResult<T> =
    | { ok: true; value: T }
    | { ok: false; error: string };
