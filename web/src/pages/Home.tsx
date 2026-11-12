import { useEffect, useId, useState, useCallback, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { ChevronRight, CircleUser, Plus } from "lucide-react";
import type { HouseSummary } from "../../../shared/types";
import { getLastHouseId } from "../utils/lastHouse";
import { apiFetch } from "../utils/apiFetch";
import ErrorState from "../utils/ErrorState";
import { useDelayedFlag } from "../utils/useDelayedFlag";
import { SkeletonBlock, SkeletonPage } from "../utils/Skeleton";

import "../css/home.css";

// Accepts a whole invite link (".../join/2646e9d0c3") or just the code
function extractCode(input: string): string | null {
    const match = input
        .trim()
        .toLowerCase()
        .match(/([0-9a-f]{10})\/?$/);
    return match ? match[1] : null;
}

export default function Home() {
    const [houses, setHouses] = useState<HouseSummary[] | null>(null);
    const [error, setError] = useState(false);
    const [invite, setInvite] = useState("");
    const [inviteError, setInviteError] = useState<string | null>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const inviteId = useId();

    // Links that mean "show me my houses" (like the house name in the navbar) pass { choose: true }.
    // Arriving any other way (after logging in, or opening the app) goes straight to a house.
    const choosing =
        (location.state as { choose?: boolean } | null)?.choose === true;

    const loadHouses = useCallback(async () => {
        setError(false);
        try {
            const res = await apiFetch("/api/houses");
            if (!res.ok) {
                setError(true);
                return;
            }
            const resHouses: HouseSummary[] = await res.json();
            setHouses(resHouses);
        } catch {
            setError(true);
        }
    }, []);

    useEffect(() => {
        loadHouses();
    }, [loadHouses]);

    function handleJoin(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const code = extractCode(invite);
        if (!code) {
            setInviteError("Paste the invite link, or its 10-character code.");
            return;
        }
        // The join page does the rest, the same as opening the link
        navigate(`/join/${code}`);
    }

    const showSkeleton = useDelayedFlag(houses === null && !error);
    if (error) {
        return (
            <div className="error-page">
                <ErrorState
                    title="Couldn't load your houses"
                    onRetry={loadHouses}
                />
            </div>
        );
    }

    if (houses === null) {
        return showSkeleton ? (
            <SkeletonPage className="error-page">
                <div className="picker-card skeleton-stack">
                    <SkeletonBlock width={160} height={26} />
                    <SkeletonBlock width={200} height={14} />
                    <SkeletonBlock height={60} radius={12} />
                    <SkeletonBlock height={60} radius={12} />
                </div>
            </SkeletonPage>
        ) : null;
    }

    if (!choosing) {
        if (houses.length === 0) {
            return <Navigate to="/houses/new" replace />;
        }

        // The last house opened on this device, if you're still in it; otherwise your only house
        const lastId = getLastHouseId();
        const last = houses.find((h) => h.id === lastId);
        const target = last ?? (houses.length === 1 ? houses[0] : null);

        if (target) {
            return <Navigate to={`/houses/${target.id}`} replace />;
        }
    }

    return (
        <div id="houses-list-holder">
            <Link to="/account" className="home-account" title="Your account">
                <CircleUser size={18} aria-hidden="true" />
                <span>Account</span>
            </Link>

            <div className="picker-card">
                <h1>{houses.length === 0 ? "Welcome" : "Your houses"}</h1>
                <p className="picker-subtitle">
                    {houses.length === 0
                        ? "You're not in a house yet. Create one, or join with an invite."
                        : houses.length === 1
                          ? "You're a member of 1 house."
                          : `You're a member of ${houses.length} houses.`}
                </p>

                {houses.length > 0 && (
                    <div className="picker-list">
                        {houses.map((house) => (
                            <Link
                                key={house.id}
                                to={`/houses/${house.id}`}
                                className="picker-row"
                            >
                                <span
                                    className="picker-avatar"
                                    aria-hidden="true"
                                >
                                    {house.name.charAt(0).toUpperCase()}
                                </span>
                                <span className="picker-name">
                                    {house.name}
                                </span>
                                {house.role === "admin" && (
                                    <span className="picker-badge">Admin</span>
                                )}
                                <ChevronRight
                                    className="picker-chevron"
                                    size={18}
                                    aria-hidden="true"
                                />
                            </Link>
                        ))}
                    </div>
                )}

                <Link to="/houses/new" className="picker-row picker-new">
                    <span className="picker-avatar" aria-hidden="true">
                        <Plus size={16} />
                    </span>
                    <span className="picker-name">Create a new house</span>
                </Link>

                <form className="picker-join" onSubmit={handleJoin} noValidate>
                    <label htmlFor={inviteId}>
                        Got an invite? Paste the link or code
                    </label>
                    <div className="picker-join-row">
                        <input
                            id={inviteId}
                            value={invite}
                            onChange={(e) => {
                                setInvite(e.target.value);
                                setInviteError(null);
                            }}
                            placeholder="Invite link or code"
                            autoComplete="off"
                            aria-invalid={inviteError !== null}
                            aria-describedby={
                                inviteError ? `${inviteId}-error` : undefined
                            }
                        />
                        <button type="submit" className="primary-button">
                            Join
                        </button>
                    </div>
                    {inviteError && (
                        <p
                            id={`${inviteId}-error`}
                            className="picker-join-error"
                            role="alert"
                        >
                            {inviteError}
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
}
