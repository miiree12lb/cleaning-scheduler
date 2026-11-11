import { useEffect, useState, useCallback } from "react";
import { Navigate, Outlet, useParams } from "react-router";

import Navbar from "./Navbar";
import type { ThemeToggleProps, HouseContext } from "../types/types";
import type { HouseSummary } from "../../../shared/types";
import { useRefreshOnFocus } from "./useRefreshOnFocus";
import { setLastHouseId } from "./lastHouse";

type Status = "loading" | "ready" | "not-found" | "error";

export default function Layout({ theme, toggleTheme }: ThemeToggleProps) {
    const { houseId } = useParams();
    const [house, setHouse] = useState<HouseSummary | null>(null);
    const [status, setStatus] = useState<Status>("loading");

    const loadHouse = useCallback(
        async (showLoading: boolean) => {
            if (showLoading) setStatus("loading");
            try {
                const res = await fetch(`/api/houses/${houseId}`);
                if (res.status === 404 || res.status === 400) {
                    setStatus("not-found");
                    return;
                }
                if (!res.ok) {
                    setStatus("error");
                    return;
                }
                const data: HouseSummary = await res.json();
                setHouse(data);
                // Remember it, so the app opens this house next time
                setLastHouseId(data.id);
                setStatus("ready");
            } catch {
                setStatus("error");
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
    if (status === "not-found") return <Navigate to="/" replace />;
    if (status === "error" || house === null)
        return <p>Couldn't load this house.</p>;

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
