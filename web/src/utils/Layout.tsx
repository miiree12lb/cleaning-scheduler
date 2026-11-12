import { useEffect, useState, useCallback } from "react";
import { Outlet, useParams } from "react-router";

import Navbar from "./Navbar";
import type { ThemeToggleProps, HouseContext } from "../types/types";
import type { HouseSummary } from "../../../shared/types";
import { useRefreshOnFocus } from "./useRefreshOnFocus";
import { setLastHouseId } from "./lastHouse";
import { apiFetch } from "./apiFetch";
import NotFound from "../pages/NotFound";
import ErrorState from "./ErrorState";

type Status = "loading" | "ready" | "not-found" | "error";

export default function Layout({ theme, toggleTheme }: ThemeToggleProps) {
    const { houseId } = useParams();
    const [house, setHouse] = useState<HouseSummary | null>(null);
    const [status, setStatus] = useState<Status>("loading");

    const loadHouse = useCallback(
        async (showLoading: boolean) => {
            if (showLoading) setStatus("loading");
            try {
                const res = await apiFetch(`/api/houses/${houseId}`);
                if (res.status === 404 || res.status === 400) {
                    // Deleted, or no longer a member: show that, even during a quiet refresh
                    setStatus("not-found");
                    return;
                }
                if (!res.ok) {
                    // A failed quiet refresh keeps the house that's already shown
                    if (showLoading) setStatus("error");
                    return;
                }
                const data: HouseSummary = await res.json();
                setHouse(data);
                setLastHouseId(data.id);
                setStatus("ready");
            } catch {
                // Offline: same, keep what's shown if it's only a refresh
                if (showLoading) setStatus("error");
            }
        },
        [houseId],
    );

    useEffect(() => {
        loadHouse(true);
    }, [loadHouse]);

    const reloadQuietly = useCallback(() => loadHouse(false), [loadHouse]);
    useRefreshOnFocus(reloadQuietly);

    if (status === "loading") return null;

    if (status === "not-found") {
        return (
            <NotFound
                title="House not found"
                message="This house doesn't exist anymore, or you're no longer a member."
            />
        );
    }

    if (status === "error" || house === null) {
        return (
            <div className="error-page">
                <ErrorState
                    title="Couldn't load this house"
                    onRetry={() => loadHouse(true)}
                />
            </div>
        );
    }

    const context: HouseContext = {
        house,
        reloadHouse: reloadQuietly,
    };

    return (
        <>
            <Navbar
                theme={theme}
                toggleTheme={toggleTheme}
                houseName={house.name}
            />
            <main>
                <Outlet context={context} />
            </main>
        </>
    );
}
