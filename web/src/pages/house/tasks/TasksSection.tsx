import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Archive, ArchiveRestore, Pencil } from "lucide-react";
import type { Task } from "../../../../../shared/types";
import ConfirmDialog from "../../../utils/ConfirmDialog";
import AddTaskForm from "./AddTaskForm";
import EditTaskRow from "./EditTaskRow";
import { readError } from "../../../utils/readError";
import { apiFetch } from "../../../utils/apiFetch";
import ErrorState from "../../../utils/ErrorState";
import "../../../css/settings.css";

type Props = {
    houseId: number;
    isAdmin: boolean;
};

export default function TasksSection({ houseId, isAdmin }: Props) {
    const [tasks, setTasks] = useState<Task[] | null>(null);
    const [error, setError] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [pendingRemoval, setPendingRemoval] = useState<Task | null>(null);
    const [pendingRestore, setPendingRestore] = useState<Task | null>(null);

    const loadTasks = useCallback(async () => {
        setTasks(null);
        setError(false);
        try {
            const res = await apiFetch(`/api/houses/${houseId}/tasks`);
            if (!res.ok) {
                setError(true);
                return;
            }
            const data: Task[] = await res.json();
            setTasks(data);
        } catch {
            setError(true);
        }
    }, [houseId]);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    async function removeTask(task: Task) {
        setBusyId(task.id);
        setActionError(null);
        try {
            const res = await apiFetch(
                `/api/houses/${houseId}/tasks/${task.id}`,
                {
                    method: "DELETE",
                },
            );
            if (!res.ok) {
                setActionError(
                    await readError(res, "Could not remove the task."),
                );
                return;
            }
            const { result }: { result: "deleted" | "archived" } =
                await res.json();
            setTasks((prev) =>
                prev === null
                    ? prev
                    : result === "deleted"
                      ? prev.filter((t) => t.id !== task.id)
                      : prev.map((t) =>
                            t.id === task.id ? { ...t, active: 0 } : t,
                        ),
            );
        } catch {
            setActionError("Could not reach the server.");
        } finally {
            setBusyId(null);
        }
    }

    async function restoreTask(task: Task) {
        setBusyId(task.id);
        setActionError(null);
        try {
            const res = await apiFetch(
                `/api/houses/${houseId}/tasks/${task.id}/restore`,
                {
                    method: "POST",
                },
            );
            if (!res.ok) {
                setActionError(
                    await readError(res, "Could not restore the task."),
                );
                return;
            }
            const restored: Task = await res.json();
            setTasks((prev) =>
                prev === null
                    ? prev
                    : prev.map((t) => (t.id === task.id ? restored : t)),
            );
        } catch {
            setActionError("Could not reach the server.");
        } finally {
            setBusyId(null);
        }
    }

    if (error) {
        return (
            <section className="settings-section">
                <ErrorState
                    title="Couldn't load the tasks"
                    onRetry={loadTasks}
                />
            </section>
        );
    }

    if (tasks === null) return null;

    const active = tasks.filter((t) => t.active === 1);
    const archived = tasks.filter((t) => t.active === 0);

    return (
        <section className="settings-section">
            <header className="section-header">
                <h2>Tasks</h2>
                <span className="section-count">{active.length}</span>
            </header>

            {isAdmin && (
                <AddTaskForm
                    houseId={houseId}
                    onCreated={(task) =>
                        setTasks((prev) =>
                            prev === null
                                ? prev
                                : [...prev, task].sort((a, b) =>
                                      a.name.localeCompare(b.name),
                                  ),
                        )
                    }
                    onArchivedExists={(taskId) => {
                        const task = tasks.find((t) => t.id === taskId);
                        if (task) setPendingRestore(task);
                    }}
                />
            )}

            {actionError && (
                <p className="section-error" role="alert">
                    {actionError}
                </p>
            )}

            {active.length === 0 ? (
                <p className="empty">No tasks yet.</p>
            ) : (
                <ul className="task-list">
                    {active.map((task) =>
                        task.id === editingId ? (
                            <EditTaskRow
                                key={task.id}
                                houseId={houseId}
                                task={task}
                                onSaved={(saved) => {
                                    setTasks((prev) =>
                                        prev === null
                                            ? prev
                                            : prev
                                                  .map((t) =>
                                                      t.id === saved.id
                                                          ? saved
                                                          : t,
                                                  )
                                                  .sort((a, b) =>
                                                      a.name.localeCompare(
                                                          b.name,
                                                      ),
                                                  ),
                                    );
                                    setEditingId(null);
                                }}
                                onCancel={() => setEditingId(null)}
                            />
                        ) : (
                            <TaskRow key={task.id} task={task}>
                                {isAdmin && (
                                    <>
                                        <button
                                            className="icon-button"
                                            onClick={() =>
                                                setEditingId(task.id)
                                            }
                                            aria-label={`Edit ${task.name}`}
                                            title="Edit"
                                        >
                                            <Pencil
                                                size={16}
                                                aria-hidden="true"
                                            />
                                        </button>
                                        <button
                                            className="icon-button danger"
                                            onClick={() =>
                                                setPendingRemoval(task)
                                            }
                                            disabled={busyId === task.id}
                                            aria-label={`Remove ${task.name}`}
                                            title="Remove"
                                        >
                                            <Archive
                                                size={16}
                                                aria-hidden="true"
                                            />
                                        </button>
                                    </>
                                )}
                            </TaskRow>
                        ),
                    )}
                </ul>
            )}

            {archived.length > 0 && (
                <details className="archived">
                    <summary>Archived ({archived.length})</summary>
                    <ul className="task-list">
                        {archived.map((task) => (
                            <TaskRow key={task.id} task={task} muted>
                                <button
                                    className="icon-button"
                                    onClick={() => restoreTask(task)}
                                    disabled={busyId === task.id}
                                >
                                    <ArchiveRestore
                                        size={16}
                                        aria-hidden="true"
                                    />
                                    <span>Restore</span>
                                </button>
                            </TaskRow>
                        ))}
                    </ul>
                </details>
            )}
            <ConfirmDialog
                open={pendingRemoval !== null}
                title={`Remove "${pendingRemoval?.name}"?`}
                message="If this task has been assigned before, it will be archived instead, so its history is kept."
                confirmLabel="Remove"
                danger
                onCancel={() => setPendingRemoval(null)}
                onConfirm={() => {
                    if (pendingRemoval) removeTask(pendingRemoval);
                    setPendingRemoval(null);
                }}
            />

            <ConfirmDialog
                open={pendingRestore !== null}
                title={`"${pendingRestore?.name}" is archived`}
                message="There's an archived task with this name. Do you want to restore it instead of creating a new one?"
                confirmLabel="Restore"
                onCancel={() => setPendingRestore(null)}
                onConfirm={() => {
                    if (pendingRestore) restoreTask(pendingRestore);
                    setPendingRestore(null);
                }}
            />
        </section>
    );
}

type TaskRowProps = {
    task: Task;
    muted?: boolean;
    children?: ReactNode;
};

function TaskRow({ task, muted = false, children }: TaskRowProps) {
    return (
        <li className={muted ? "task-row muted" : "task-row"}>
            <div className="task-text">
                <span className="task-name">{task.name}</span>
                {task.description && (
                    <span className="task-description">{task.description}</span>
                )}
            </div>
            {children && <div className="task-actions">{children}</div>}
        </li>
    );
}
