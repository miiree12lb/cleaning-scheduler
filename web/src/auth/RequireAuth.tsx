import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "./AuthContext";
import { useDelayedFlag } from "../utils/useDelayedFlag";
import { AppSkeleton } from "../utils/Skeleton";

export default function RequireAuth() {
    const { auth } = useAuth();
    const location = useLocation();

    const showSkeleton = useDelayedFlag(auth.status === "loading");
    if (auth.status === "loading") return showSkeleton ? <AppSkeleton /> : null;

    if (auth.status === "unauthenticated") {
        const from = location.pathname + location.search;
        return (
            <Navigate
                to={`/login?returnTo=${encodeURIComponent(from)}`}
                replace
            />
        );
    }

    return <Outlet />;
}
