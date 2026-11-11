import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, LogOut, Trash2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import ConfirmDialog from "../utils/ConfirmDialog";
import "../css/settings.css";

type BlockingHouse = { id: number; name: string };

export default function Account() {
    const { auth, logout } = useAuth();
    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [blocking, setBlocking] = useState<BlockingHouse[]>([]);

    if (auth.status !== "authenticated") return null;
    const user = auth.user;

    async function deleteAccount() {
        setDeleting(true);
        setError(null);
        setBlocking([]);
        try {
            const res = await fetch("/api/auth/me", { method: "DELETE" });
            if (res.status === 409) {
                const body: { houses?: BlockingHouse[] } = await res
                    .json()
                    .catch(() => ({}));
                setBlocking(body.houses ?? []);
                setError(
                    "You're the only admin of these houses. Make someone else admin, or delete the house, first:",
                );
                return;
            }
            if (!res.ok) {
                setError("Could not delete your account.");
                return;
            }
            // The account is gone: clear the local login state, which sends you to the login page
            await logout();
        } catch {
            setError("Could not reach the server.");
        } finally {
            setDeleting(false);
        }
    }

    return (
        <div className="account-page">
            <Link
                to="/"
                state={{ choose: true }}
                className="back-link account-back"
            >
                <ArrowLeft size={16} aria-hidden="true" /> Back to my houses
            </Link>

            <h1>Your account</h1>

            <section className="settings-section">
                <dl className="account-details">
                    <dt>Name</dt>
                    <dd>{user.name}</dd>
                    <dt>Email</dt>
                    <dd>{user.email}</dd>
                </dl>
            </section>

            <section className="settings-section">
                <header className="section-header">
                    <h2>Log out</h2>
                </header>
                <p className="section-hint">
                    Log out on this device. Your account and houses stay as they
                    are.
                </p>

                <button
                    type="button"
                    className="secondary-button"
                    onClick={logout}
                >
                    <LogOut size={16} aria-hidden="true" />
                    Log out
                </button>
            </section>

            <section className="settings-section danger-zone">
                <header className="section-header">
                    <h2>Delete account</h2>
                </header>
                <p className="section-hint">
                    You'll leave all your houses, and your unfinished tasks this
                    week go to your housemates. Tasks you did in the past stay
                    in each house's history as "Former member". This can't be
                    undone.
                </p>

                {error && (
                    <div className="section-error" role="alert">
                        <p>{error}</p>
                        {blocking.length > 0 && (
                            <ul>
                                {blocking.map((h) => (
                                    <li key={h.id}>
                                        <Link to={`/houses/${h.id}/settings`}>
                                            {h.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                <button
                    type="button"
                    className="danger-button"
                    onClick={() => setConfirming(true)}
                    disabled={deleting}
                >
                    <Trash2 size={16} aria-hidden="true" />
                    {deleting ? "Deleting…" : "Delete my account"}
                </button>
            </section>

            <p className="section-hint">
                <Link to="/privacy">Privacy</Link> ·{" "}
                <Link to="/terms">Terms</Link>
            </p>

            <ConfirmDialog
                open={confirming}
                title="Delete your account?"
                message="You'll leave all your houses and be logged out. This can't be undone."
                confirmLabel="Delete account"
                danger
                onCancel={() => setConfirming(false)}
                onConfirm={() => {
                    setConfirming(false);
                    deleteAccount();
                }}
            />
        </div>
    );
}
