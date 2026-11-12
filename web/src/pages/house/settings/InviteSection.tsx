import { useCallback, useEffect, useId, useState } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import ConfirmDialog from "../../../utils/ConfirmDialog";
import { apiFetch } from "../../../utils/apiFetch";
import { readError } from "../../../utils/readError";
import { useRefreshOnFocus } from "../../../utils/useRefreshOnFocus";
import ErrorState from "../../../utils/ErrorState";

type Props = {
    houseId: number;
};

export default function InviteSection({ houseId }: Props) {
    const [code, setCode] = useState<string | null>(null);
    const [error, setError] = useState(false);
    const [copied, setCopied] = useState(false);
    const [copyFailed, setCopyFailed] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [regenerateError, setRegenerateError] = useState<string | null>(null);
    const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);
    const inputId = useId();

    // quiet: a background refresh. If it fails, the link already shown stays.
    const loadInvite = useCallback(
        async (quiet = false) => {
            if (!quiet) setError(false);
            try {
                const res = await apiFetch(`/api/houses/${houseId}/invite`);
                if (!res.ok) {
                    if (!quiet) setError(true);
                    return;
                }
                const data: { code: string } = await res.json();
                setCode(data.code);
            } catch {
                if (!quiet) setError(true);
            }
        },
        [houseId],
    );

    useEffect(() => {
        loadInvite();
    }, [loadInvite]);

    // Another admin may have created a new link while this page was open
    const refreshQuietly = useCallback(() => loadInvite(true), [loadInvite]);
    useRefreshOnFocus(refreshQuietly);

    if (error) {
        return (
            <section className="settings-section">
                <ErrorState
                    title="Couldn't load the invite link"
                    onRetry={() => loadInvite()}
                />
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
        setRegenerateError(null);
        try {
            const res = await apiFetch(
                `/api/houses/${houseId}/invite/regenerate`,
                { method: "POST" },
            );
            if (!res.ok) {
                setRegenerateError(
                    await readError(res, "Could not create a new link."),
                );
                return;
            }
            const data: { code: string } = await res.json();
            setCode(data.code);
        } catch {
            setRegenerateError("Could not reach the server.");
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

            {regenerateError && (
                <p className="form-error" role="alert">
                    {regenerateError}
                </p>
            )}

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
