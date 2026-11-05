import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import { ChevronRight, Plus } from "lucide-react";
import type { HouseSummary } from "../../../shared/types";

import "../css/home.css";

export default function Home() {
    const [houses, setHouses] = useState<HouseSummary[] | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        async function loadHouses() {
            try {
                const res = await fetch("/api/houses");

                if (!res.ok) {
                    setError(true);
                    return;
                }

                const resHouses = await res.json();
                setHouses(resHouses);
            }
            catch {
                setError(true);
            }
        }
        loadHouses();
    }, []);

    if (error) {
        return <p>Couldn't load your houses.</p>;
    }

    if (houses === null) {
        return null; // still loading
    }

    if (houses.length === 0) {
        return <Navigate to="/houses/new" replace />;
    }

    if (houses.length === 1) {
        return <Navigate to={`/houses/${houses[0].id}`} replace />;
    }

    if (houses.length >= 2) {
        return (
            <div id="houses-list-holder">
                <div className="picker-card">
                    <h1>Choose a house</h1>
                    <p className="picker-subtitle">You're a member of {houses.length} houses.</p>

                    <div className="picker-list">
                        {houses.map((house) => (
                            <Link key={house.id} to={`/houses/${house.id}`} className="picker-row">
                                <span className="picker-avatar" aria-hidden="true">
                                    {house.name.charAt(0).toUpperCase()}
                                </span>
                                <span className="picker-name">{house.name}</span>
                                {house.role === "admin" && <span className="picker-badge">Admin</span>}
                                <ChevronRight className="picker-chevron" size={18} aria-hidden="true" />
                            </Link>
                        ))}
                    </div>

                    <Link to="/houses/new" className="picker-row picker-new">
                        <span className="picker-avatar" aria-hidden="true">
                            <Plus size={16} />
                        </span>
                        <span className="picker-name">Create a new house</span>
                    </Link>
                </div>
            </div>
        );
    }
}
