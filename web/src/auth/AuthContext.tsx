import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { SessionUser } from "../../../shared/types";
import type { AuthState } from "../types/types";

const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
    const auth = useContext(AuthContext);
    if (!auth) throw new Error("useAuth must be used inside <AuthProvider>");
    return auth;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [auth, setAuth] = useState<AuthState>({ status: "loading" });

    useEffect(() => {
        async function loadUser() {
            try {
                const res = await fetch("/api/auth/me");
                if (res.ok) {
                    const user: SessionUser = await res.json();
                    setAuth({ status: "authenticated", user });
                } else {
                    setAuth({ status: "unauthenticated" });
                }
            } catch {
                setAuth({ status: "unauthenticated" });
            }
        }
        loadUser();
    }, []);

    return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
