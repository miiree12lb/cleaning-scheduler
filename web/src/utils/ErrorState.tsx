import { RotateCw } from "lucide-react";
import "../css/errorState.css";

type Props = {
    title: string; // what failed, e.g. "Couldn't load the members"
    hint?: string; // what to do
    onRetry?: () => void;
};

export default function ErrorState({ title, hint, onRetry }: Props) {
    // Tell offline apart from a server problem, so the hint is useful
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    const text =
        hint ??
        (offline
            ? "You seem to be offline. Check your connection and try again."
            : "Something went wrong on our side. Try again in a moment.");

    return (
        <div className="error-state" role="alert">
            <p className="error-state-title">{title}</p>
            <p className="error-state-hint">{text}</p>
            {onRetry && (
                <button
                    type="button"
                    className="secondary-button"
                    onClick={onRetry}
                >
                    <RotateCw size={16} aria-hidden="true" />
                    Try again
                </button>
            )}
        </div>
    );
}
