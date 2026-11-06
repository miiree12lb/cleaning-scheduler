import { useEffect, useRef } from "react";
import "../css/dialog.css";

type Props = {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

export default function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel = "Confirm",
    danger = false,
    onConfirm,
    onCancel,
}: Props) {
    const ref = useRef<HTMLDialogElement>(null);

    // Open or close the real <dialog> when the prop changes
    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    return (
        <dialog
            ref={ref}
            className="dialog"
            onCancel={(e) => {
                // Escape key: let React decide, instead of the browser closing it alone
                e.preventDefault();
                onCancel();
            }}
            onClick={(e) => {
                // A click on the dimmed backdrop lands on the <dialog> itself
                if (e.target === e.currentTarget) onCancel();
            }}
            aria-labelledby="dialog-title"
        >
            <div className="dialog-body">
                <h2 id="dialog-title">{title}</h2>
                <p>{message}</p>
                <div className="dialog-actions">
                    <button className="dialog-button" onClick={onCancel} autoFocus>
                        Cancel
                    </button>
                    <button
                        className={danger ? "dialog-button danger" : "dialog-button primary"}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </dialog>
    );
}