import type { SessionUser } from "../../shared/types";

export type AppEnv = {
    Bindings: Env;
    Variables: {
        user: SessionUser;
    };
};