import { useEffect, useState } from "react";
import { Navigate, Outlet, useParams } from "react-router";

import Navbar from "./Navbar";
import { type ThemeToggleProps } from "../types/types";
import type { HouseSummary } from "../../../shared/types";

type Status = "loading" | "ready" | "not-found" | "error";

export default function Layout({ theme, toggleTheme }: ThemeToggleProps) {
    const { houseId } = useParams();
    const [house, setHouse] = useState<HouseSummary | null>(null);
    const [status, setStatus] = useState<Status>("loading");

    useEffect(() => {
        async function loadHouse() {
            setStatus("loading");
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
                setStatus("ready");
            } catch {
                setStatus("error");
            }
        }
        loadHouse();
    }, [houseId]);

    if (status === "loading") return null;
    if (status === "not-found") return <Navigate to="/" replace />;
    if (status === "error" || house === null) return <p>Couldn't load this house.</p>;

    return (
        <>
            <Navbar theme={theme} toggleTheme={toggleTheme} />
            <main>
                <Outlet context={house} />
            </main>
        </>
    );
}
