import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import type { Task } from "../../../../../shared/types";
import { apiFetch } from "../../../utils/apiFetch";

type Props = {
    houseId: number;
    task: Task;
    onSaved: (task: Task) => void;
    onCancel: () => void;
};

export default function EditTaskRow({
    houseId,
    task,
    onSaved,
    onCancel,
}: Props) {
    const [name, setName] = useState(task.name);
    const [description, setDescription] = useState(task.description ?? "");
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const nameId = useId();
    const descriptionId = useId();
    const errorId = useId();

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setSaving(true);

        try {
            const res = await apiFetch(
                `/api/houses/${houseId}/tasks/${task.id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ name, description }),
                },
            );

            if (!res.ok) {
                const errorData = await res.json();
                setError(errorData.error ?? "Could not edit the task");
            }

            const resTask = await res.json();
            onSaved(resTask);
        } catch {
            setError("Could not reach the server.");
        } finally {
            setSaving(false);
        }
    }

    function handleKeyDown(e: KeyboardEvent<HTMLFormElement>) {
        if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
        }
    }

    return (
        <li className="task-row editing">
            <form
                className="edit-task"
                onSubmit={handleSubmit}
                onKeyDown={handleKeyDown}
                noValidate
            >
                <div className="add-task-fields">
                    <div className="add-task-field">
                        <label htmlFor={nameId}>Name</label>
                        <input
                            id={nameId}
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={50}
                            autoFocus
                            aria-invalid={error !== null}
                            aria-describedby={error ? errorId : undefined}
                        />
                    </div>

                    <div className="add-task-field">
                        <label htmlFor={descriptionId}>
                            Description{" "}
                            <span className="optional">(optional)</span>
                        </label>
                        <input
                            id={descriptionId}
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={200}
                        />
                    </div>
                </div>

                <div className="edit-task-actions">
                    <button
                        type="button"
                        className="secondary-button"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="primary-button"
                        disabled={saving}
                    >
                        {saving ? "Saving…" : "Save"}
                    </button>
                </div>

                {error && (
                    <p id={errorId} className="form-error" role="alert">
                        {error}
                    </p>
                )}
            </form>
        </li>
    );
}
