import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import type { SessionUser } from "../../../shared/types";
import type { AuthState, AuthContextValue } from "../types/types";

const AuthContext = createContext<AuthContextValue | null>(null);

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
