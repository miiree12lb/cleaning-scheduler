import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import type { HouseSummary } from "../../../shared/types";
import { apiFetch } from "../utils/apiFetch";

type JoinState =
    | { status: "joining" }
    | { status: "joined"; house: HouseSummary }
    | { status: "invalid"; message: string }
    | { status: "error" };

export default function JoinHouse() {
    const { code } = useParams();
    const [state, setState] = useState<JoinState>({ status: "joining" });

    useEffect(() => {
        let cancelled = false;

        async function joinHouse() {
            try {
                const res = await apiFetch(`/api/join/${code}`, {
                    method: "POST",
                });

                if (res.ok) {
                    const house: HouseSummary = await res.json();
                    if (!cancelled) setState({ status: "joined", house });
                    return;
                }

                if (res.status === 400 || res.status === 404) {
                    const body: { error?: string } = await res
                        .json()
                        .catch(() => ({}));
                    if (!cancelled) {
                        setState({
                            status: "invalid",
                            message:
                                body.error ?? "This invite link doesn't work.",
                        });
                    }
                    return;
                }

                if (!cancelled) setState({ status: "error" });
            } catch {
                if (!cancelled) setState({ status: "error" });
            }
        }

        joinHouse();

        return () => {
            cancelled = true;
        };
    }, [code]);

    if (state.status === "joined") {
        return <Navigate to={`/houses/${state.house.id}`} replace />;
    }

    if (state.status === "joining") {
        return (
            <div className="centered-page">
                <div className="card">
                    <p className="card-subtitle">Joining the house…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="centered-page">
            <div className="card">
                <h1>
                    {state.status === "invalid"
                        ? "Invite link not valid"
                        : "Something went wrong"}
                </h1>
                <p className="card-subtitle">
                    {state.status === "invalid"
                        ? `${state.message} Ask an admin of the house for a new link.`
                        : "We couldn't reach the server. Check your connection and try again."}
                </p>
                <Link to="/" className="primary-button">
                    Go to my houses
                </Link>
            </div>
        </div>
    );
}
