import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "./AuthContext";

export default function RequireAuth() {
    const { auth } = useAuth();
    const location = useLocation();

    if (auth.status === "loading") {
        return null;
    }

    if (auth.status === "unauthenticated") {
        const from = location.pathname + location.search;
        return <Navigate to={`/login?returnTo=${encodeURIComponent(from)}`} replace />;
    }

    return <Outlet />;
}
