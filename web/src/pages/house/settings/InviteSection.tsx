import { useState, useEffect, useId } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import ConfirmDialog from "../../../utils/ConfirmDialog";

type Props = {
    houseId: number;
};

export default function InviteSection({ houseId }: Props) {
    const [code, setCode] = useState<string | null>(null);
    const [error, setError] = useState(false);
    const [copied, setCopied] = useState(false);
    const [copyFailed, setCopyFailed] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);
    const inputId = useId();

    useEffect(() => {
        async function fetchCode() {
            try {
                const res = await fetch(`/api/houses/${houseId}/invite`);
                if (!res.ok) {
                    setError(true);
                    return;
                }
                const data: { code: string } = await res.json();
                setCode(data.code);
            } catch {
                setError(true);
            }
        }

        fetchCode();
    }, [houseId]);

    if (error) {
        return (
            <section className="settings-section">
                <p className="section-error">Could not load the invite link.</p>
            </section>
        );
    }

    if (!code) return null;

    const link = `${window.location.origin}/join/${code}`;

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(link);
            setCopyFailed(false);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopyFailed(true);
        }
    }

    async function regenerate() {
        setRegenerating(true);
        try {
            const res = await fetch(
                `/api/houses/${houseId}/invite/regenerate`,
                { method: "POST" },
            );
            if (res.ok) {
                const data: { code: string } = await res.json();
                setCode(data.code);
            }
        } finally {
            setRegenerating(false);
        }
    }

    return (
        <section className="settings-section">
            <header className="section-header">
                <h2>Invite people</h2>
            </header>

            <p className="section-hint">
                Anyone with this link can join the house as a member.
            </p>

            <div className="invite-field">
                <label htmlFor={inputId}>Invite link</label>
                <div className="invite-row">
                    <input
                        id={inputId}
                        type="text"
                        value={link}
                        readOnly
                        onFocus={(e) => e.target.select()}
                    />
                    <button
                        type="button"
                        className="primary-button"
                        onClick={copyLink}
                    >
                        {copied ? (
                            <Check size={16} aria-hidden="true" />
                        ) : (
                            <Copy size={16} aria-hidden="true" />
                        )}
                        {copied ? "Copied!" : "Copy"}
                    </button>
                </div>
                {copyFailed && (
                    <p className="form-error" role="alert">
                        Couldn't copy automatically. Select the link and copy it
                        by hand.
                    </p>
                )}
            </div>

            <button
                type="button"
                className="icon-button"
                onClick={() => setConfirmingRegenerate(true)}
                disabled={regenerating}
            >
                <RefreshCw size={16} aria-hidden="true" />
                <span>{regenerating ? "Creating…" : "Create a new link"}</span>
            </button>

            <ConfirmDialog
                open={confirmingRegenerate}
                title="Create a new invite link?"
                message="The current link will stop working. Anyone who hasn't joined yet will need the new one."
                confirmLabel="Create new link"
                onCancel={() => setConfirmingRegenerate(false)}
                onConfirm={() => {
                    setConfirmingRegenerate(false);
                    regenerate();
                }}
            />
        </section>
    );
}
