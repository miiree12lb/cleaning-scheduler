import { Navigate, Outlet } from "react-router";
import { useAuth } from "./AuthContext";

export default function RequireAuth() {
    const { auth } = useAuth();

    if (auth.status === "loading") {
        return null;
    }

    if (auth.status === "unauthenticated") {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}
