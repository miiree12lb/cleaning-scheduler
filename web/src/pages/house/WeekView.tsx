import { Check } from "lucide-react";
import type { WeekPlan, Assignment } from "../../../../shared/types";

type Props = {
    plan: WeekPlan;
    myId: number | null;
    onToggle?: (assignment: Assignment) => void; // missing = read-only (past weeks, previews)
    busyTaskId?: number | null;
};

type Person = {
    name: string;
    isMe: boolean;
    tasks: Assignment[];
};

export default function WeekView({ plan, myId, onToggle, busyTaskId = null }: Props) {
    const mine = plan.assignments.filter((a) => a.userId === myId);
    const mineDone = mine.filter((a) => a.doneAt !== null).length;

    // Group by user ID (names aren't unique). Former members share one group.
    const byPerson = new Map<number | "former", Person>();
    for (const a of plan.assignments) {
        const key = a.userId ?? "former";
        const person = byPerson.get(key) ?? {
            name: a.userName ?? "Former member",
            isMe: a.userId !== null && a.userId === myId,
            tasks: [],
        };
        person.tasks.push(a);
        byPerson.set(key, person);
    }

    const isPreview = plan.status === "preview";

    return (
        <div className={isPreview ? "week-view preview" : "week-view"}>
            {isPreview && (
                <p className="week-preview-note">
                    Preview. This plan may change if members or tasks change.
                </p>
            )}

            <section className="week-card">
                <div className="week-card-header">
                    <h2>Your tasks</h2>
                    {mine.length > 0 && !isPreview && (
                        <span className="week-progress">
                            {mineDone} of {mine.length} done
                        </span>
                    )}
                </div>

                {mine.length === 0 ? (
                    <p className="week-empty">
                        {isPreview ? "Nothing planned for you this week." : "Nothing for you this week. Enjoy the rest 🎉"}
                    </p>
                ) : (
                    <ul className="my-tasks">
                        {mine.map((a) => (
                            <li key={a.taskId}>
                                <TaskItem
                                    assignment={a}
                                    variant="mine"
                                    myId={myId}
                                    onToggle={onToggle}
                                    busy={busyTaskId === a.taskId}
                                />
                            </li>
                        ))}
                    </ul>
                )}

                {plan.status === "current" && mine.length > 0 && mineDone === mine.length && (
                    <p className="week-all-done">All done for this week. Thank you! 🎉</p>
                )}
            </section>

            <section>
                <h2 className="week-section-title">Everyone</h2>
                {byPerson.size === 0 ? (
                    <p className="week-empty">No tasks this week.</p>
                ) : (
                    <div className="people-grid">
                        {[...byPerson.entries()].map(([key, person]) => {
                            const done = person.tasks.filter((t) => t.doneAt !== null).length;
                            return (
                                <div key={key} className="person-card">
                                    <div className="person-header">
                                        <span className="picker-avatar" aria-hidden="true">
                                            {person.name.charAt(0).toUpperCase()}
                                        </span>
                                        <span className="person-name">
                                            {person.name}
                                            {person.isMe && <span className="member-you"> (you)</span>}
                                        </span>
                                        {!isPreview && (
                                            <span className="person-count">
                                                {done}/{person.tasks.length}
                                            </span>
                                        )}
                                    </div>
                                    <ul className="person-tasks">
                                        {person.tasks.map((a) => (
                                            <li key={a.taskId}>
                                                <TaskItem
                                                    assignment={a}
                                                    variant="person"
                                                    myId={myId}
                                                    onToggle={onToggle}
                                                    busy={busyTaskId === a.taskId}
                                                />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}

type TaskItemProps = {
    assignment: Assignment;
    variant: "mine" | "person";
    myId: number | null;
    onToggle?: (assignment: Assignment) => void;
    busy: boolean;
};

// One task: a checkbox button when it can be ticked or unticked, plain text otherwise
function TaskItem({ assignment: a, variant, myId, onToggle, busy }: TaskItemProps) {
    const done = a.doneAt !== null;
    const base = variant === "mine" ? "my-task" : "person-task";
    const className = done ? `${base} done` : base;
    const doneBySomeoneElse = a.doneById !== null && a.doneById !== a.userId;

    // Anyone can tick an open task, but only the person who ticked it can untick it
    const canToggle = onToggle !== undefined && (!done || a.doneById === myId);

    const content = (
        <>
            <span className={variant === "mine" ? "check-box" : "check-box small"} aria-hidden="true">
                <Check size={variant === "mine" ? 16 : 12} strokeWidth={3} />
            </span>
            <span className="task-label">{a.taskName}</span>
            {doneBySomeoneElse && (
                <span className="done-by">Done by {a.doneByName ?? "a former member"}</span>
            )}
            {a.late && <span className="late-badge">Late</span>}
        </>
    );

    if (canToggle) {
        return (
            <button
                type="button"
                role="checkbox"
                aria-checked={done}
                className={className}
                onClick={() => onToggle?.(a)}
                disabled={busy}
            >
                {content}
            </button>
        );
    }

    return (
        <div className={`${className} static`}>
            {content}
            {done && <span className="visually-hidden"> (done)</span>}
        </div>
    );
}
