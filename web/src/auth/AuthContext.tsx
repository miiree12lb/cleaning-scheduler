import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import type { SessionUser } from "../../../shared/types";
import type { AuthState, AuthContextValue } from "../types/types";
import { onSessionExpired } from "../utils/apiFetch";

const AuthContext = createContext<AuthContextValue | null>(null);

// The provider and its hook live together on purpose. This file just reloads fully when edited.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
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

    // Any API call that gets a 401 ends up here: the session is over, so show the login page
    useEffect(() => {
        return onSessionExpired(() => {
            setAuth((current) =>
                current.status === "authenticated"
                    ? { status: "unauthenticated", expired: true }
                    : current,
            );
        });
    }, []);

    async function logout() {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
        } catch {
            // ignore: we log out locally either way
        } finally {
            setAuth({ status: "unauthenticated" });
        }
    }

    return (
        <AuthContext.Provider value={{ auth, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
