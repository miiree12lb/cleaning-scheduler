import { useCallback, useEffect, useState } from "react";
import { Check } from "lucide-react";
import type { WeekPlan } from "../../../../shared/types";
import { useAuth } from "../../auth/AuthContext";
import { useHouse } from "../../utils/useHouse";
import { useRefreshOnFocus } from "../../utils/useRefreshOnFocus";
import { readError } from "../../utils/readError";
import { formatWeekRange } from "../../utils/dates";
import "../../css/week.css";

type Assignment = WeekPlan["assignments"][number];

export default function Current() {
    const { house } = useHouse();
    const { auth } = useAuth();
    const myId = auth.status === "authenticated" ? auth.user.id : null;

    const [planning, setPlanning] = useState<WeekPlan | null>(null);
    const [error, setError] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [busyTaskId, setBusyTaskId] = useState<number | null>(null);

    const loadWeek = useCallback(
        async (showLoading: boolean) => {
            if (showLoading) setPlanning(null);
            setError(false);
            try {
                const res = await fetch(`/api/houses/${house.id}/weeks/current`);
                if (!res.ok) {
                    setError(true);
                    return;
                }
                const plan: WeekPlan = await res.json();
                setPlanning(plan);
            } catch {
                setError(true);
            }
        },
        [house.id],
    );

    useEffect(() => {
        loadWeek(true);
    }, [loadWeek]);

    const refreshWeek = useCallback(() => loadWeek(false), [loadWeek]);
    useRefreshOnFocus(refreshWeek);

    async function toggleDone(assignment: Assignment) {
        if (planning === null) return;

        setBusyTaskId(assignment.taskId);
        setActionError(null);
        try {
            const res = await fetch(
                `/api/houses/${house.id}/weeks/${planning.weekStart}/tasks/${assignment.taskId}/done`,
                { method: assignment.doneAt ? "DELETE" : "PUT" },
            );
            if (!res.ok) {
                setActionError(await readError(res, "Could not update the task."));
                return;
            }
            const updated: Assignment = await res.json();
            setPlanning((prev) =>
                prev === null
                    ? prev
                    : {
                          ...prev,
                          assignments: prev.assignments.map((a) => (a.taskId === updated.taskId ? updated : a)),
                      },
            );
        } catch {
            setActionError("Could not reach the server.");
        } finally {
            setBusyTaskId(null);
        }
    }

    if (error) {
        return (
            <div className="week-page">
                <p className="section-error">Couldn't load this week.</p>
            </div>
        );
    }

    if (planning === null) return null;

    const mine = planning.assignments.filter((a) => a.userId === myId);
    const mineDone = mine.filter((a) => a.doneAt !== null).length;

    const byPerson = new Map<string, Assignment[]>();
    for (const a of planning.assignments) {
        const name = a.userName ?? "Former member";
        byPerson.set(name, [...(byPerson.get(name) ?? []), a]);
    }

    return (
        <div className="week-page">
            <header className="week-header">
                <h1>This week</h1>
                <p className="week-dates">{formatWeekRange(planning.weekStart)}</p>
            </header>

            {actionError && (
                <p className="section-error" role="alert">
                    {actionError}
                </p>
            )}

            <section className="week-card">
                <div className="week-card-header">
                    <h2>Your tasks</h2>
                    {mine.length > 0 && (
                        <span className="week-progress">
                            {mineDone} of {mine.length} done
                        </span>
                    )}
                </div>

                {mine.length === 0 ? (
                    <p className="week-empty">Nothing for you this week. Enjoy the rest 🎉</p>
                ) : (
                    <ul className="my-tasks">
                        {mine.map((a) => (
                            <li key={a.taskId}>
                                <button
                                    type="button"
                                    role="checkbox"
                                    aria-checked={a.doneAt !== null}
                                    className={a.doneAt ? "my-task done" : "my-task"}
                                    onClick={() => toggleDone(a)}
                                    disabled={busyTaskId === a.taskId}
                                >
                                    <span className="check-box" aria-hidden="true">
                                        <Check size={16} strokeWidth={3} />
                                    </span>
                                    <span className="my-task-name">{a.taskName}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                {mine.length > 0 && mineDone === mine.length && (
                    <p className="week-all-done">All done for this week. Thank you! ✨</p>
                )}
            </section>

            <section>
                <h2 className="week-section-title">Everyone</h2>
                <div className="people-grid">
                    {[...byPerson.entries()].map(([name, tasks]) => {
                        const done = tasks.filter((t) => t.doneAt !== null).length;
                        return (
                            <div key={name} className="person-card">
                                <div className="person-header">
                                    <span className="picker-avatar" aria-hidden="true">
                                        {name.charAt(0).toUpperCase()}
                                    </span>
                                    <span className="person-name">{name}</span>
                                    <span className="person-count">
                                        {done}/{tasks.length}
                                    </span>
                                </div>
                                <ul className="person-tasks">
                                    {tasks.map((a) => (
                                        <li key={a.taskId}>
                                            <button
                                                type="button"
                                                role="checkbox"
                                                aria-checked={a.doneAt !== null}
                                                className={a.doneAt ? "person-task done" : "person-task"}
                                                onClick={() => toggleDone(a)}
                                                disabled={busyTaskId === a.taskId}
                                            >
                                                <span className="check-box small" aria-hidden="true">
                                                    <Check size={12} strokeWidth={3} />
                                                </span>
                                                {a.taskName}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
