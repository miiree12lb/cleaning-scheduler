import { useState, type FormEvent, useId } from "react";
import { Plus } from "lucide-react";
import type { Task } from "../../../../../shared/types";

type Props = {
    houseId: number;
    onCreated: (task: Task) => void;
    onArchivedExists: (taskId: number) => void;
};

export default function AddTaskForm({ houseId, onCreated, onArchivedExists }: Props) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const nameId = useId();
    const descriptionId = useId();
    const errorId = useId();

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        try {
            const res = await fetch(`/api/houses/${houseId}/tasks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, description }),
            });

            if (res.status === 201) {
                const task: Task = await res.json();
                onCreated(task);
                setName("");
                setDescription("");
                return;
            }

            const body: { error?: string; taskId?: number } = await res.json().catch(() => ({}));

            if (body.error === "archived_exists" && body.taskId !== undefined) {
                onArchivedExists(body.taskId);
                return;
            }

            setError(body.error ?? "Could not add the task.");
        } catch {
            setError("Could not reach the server.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form className="add-task" onSubmit={handleSubmit} noValidate>
            <h3 className="add-task-title">New task</h3>

            <div className="add-task-fields">
                <div className="add-task-field">
                    <label htmlFor={nameId}>Name</label>
                    <input
                        id={nameId}
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Kitchen"
                        maxLength={50}
                        aria-invalid={error !== null}
                        aria-describedby={error ? errorId : undefined}
                    />
                </div>

                <div className="add-task-field">
                    <label htmlFor={descriptionId}>
                        Description <span className="optional">(optional)</span>
                    </label>
                    <input
                        id={descriptionId}
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g. Wipe the stove too"
                        maxLength={200}
                    />
                </div>

                <button type="submit" disabled={submitting}>
                    <Plus size={16} aria-hidden="true" />
                    {submitting ? "Adding…" : "Add task"}
                </button>
            </div>

            {error && (
                <p id={errorId} className="form-error" role="alert">
                    {error}
                </p>
            )}
        </form>
    );
}
