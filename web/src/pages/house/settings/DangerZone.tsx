import { useId, useState } from "react";
import { useNavigate } from "react-router";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "../../../utils/ConfirmDialog";
import { readError } from "../../../utils/readError";
import { apiFetch } from "../../../utils/apiFetch";

type Props = {
    houseId: number;
    houseName: string;
};

export default function DangerZone({ houseId, houseName }: Props) {
    const [confirmName, setConfirmName] = useState("");
    const [confirming, setConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const navigate = useNavigate();
    const inputId = useId();

    const matches = confirmName.trim() === houseName;

    async function deleteHouse() {
        setDeleting(true);
        setError(null);
        try {
            const res = await apiFetch(`/api/houses/${houseId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirmName }),
            });
            if (!res.ok) {
                setError(await readError(res, "Could not delete the house."));
                return;
            }
            navigate("/", { replace: true });
        } catch {
            setError("Could not reach the server.");
        } finally {
            setDeleting(false);
        }
    }

    return (
        <section className="settings-section danger-zone">
            <header className="section-header">
                <h2>Danger zone</h2>
            </header>

            <p className="section-hint">
                Deleting the house removes it for everyone: members, tasks, the
                whole schedule history, and the rules. This can't be undone.
            </p>

            <div className="danger-field">
                <label htmlFor={inputId}>
                    Type <strong>{houseName}</strong> to confirm
                </label>
                <div className="danger-row">
                    <input
                        id={inputId}
                        type="text"
                        value={confirmName}
                        onChange={(e) => setConfirmName(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                    />
                    <button
                        type="button"
                        className="danger-button"
                        onClick={() => setConfirming(true)}
                        disabled={!matches || deleting}
                    >
                        <Trash2 size={16} aria-hidden="true" />
                        {deleting ? "Deleting…" : "Delete house"}
                    </button>
                </div>
            </div>

            {error && (
                <p className="section-error" role="alert">
                    {error}
                </p>
            )}

            <ConfirmDialog
                open={confirming}
                title={`Delete "${houseName}"?`}
                message="Everyone in the house loses access, and all its tasks, schedule history and rules are deleted for good."
                confirmLabel="Delete house"
                danger
                onCancel={() => setConfirming(false)}
                onConfirm={() => {
                    setConfirming(false);
                    deleteHouse();
                }}
            />
        </section>
    );
}
