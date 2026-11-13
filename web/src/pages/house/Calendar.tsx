import { useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { useHouse } from "../../utils/useHouse";
import { useWeek } from "../../utils/useWeek";
import { useDelayedFlag } from "../../utils/useDelayedFlag";
import { addWeeks, formatWeekRange } from "../../utils/dates";
import ErrorState from "../../utils/ErrorState";
import { SkeletonBlock, SkeletonPage } from "../../utils/Skeleton";
import WeekView from "./WeekView";
import "../../css/week.css";

const MAX_WEEKS_AHEAD = 4;

const STATUS_LABEL = {
    past: "Past week",
    current: "This week",
    preview: "Preview",
} as const;

export default function Calendar() {
    const { house } = useHouse();
    const { auth } = useAuth();
    const myId = auth.status === "authenticated" ? auth.user.id : null;

    const [searchParams, setSearchParams] = useSearchParams();
    const week = searchParams.get("week") ?? "current";

    const me = auth.status === "authenticated" ? { id: auth.user.id, name: auth.user.name } : null;
    const { plan, loading, error, actionError, busyTaskId, toggleDone, reload } = useWeek(house.id, week, me);

    // Only the very first load shows the skeleton. Switching weeks keeps the old week, dimmed.
    const showSkeleton = useDelayedFlag(plan === null && !error);

    if (error) {
        return (
            <div className="week-page">
                <ErrorState title="Couldn't load this week" onRetry={reload} />
                {week !== "current" && (
                    <button
                        className="secondary-button"
                        onClick={() => setSearchParams({})}
                    >
                        Go to this week
                    </button>
                )}
            </div>
        );
    }

    if (plan === null) return showSkeleton ? <CalendarSkeleton /> : null;

    const lastWeekStart = addWeeks(plan.currentWeekStart, MAX_WEEKS_AHEAD);
    const canGoBack = plan.weekStart > plan.firstWeekStart;
    const canGoForward = plan.weekStart < lastWeekStart;

    function goTo(weekStart: string) {
        setSearchParams(
            weekStart === plan!.currentWeekStart ? {} : { week: weekStart },
        );
    }

    return (
        <div className="week-page">
            <header className="calendar-header">
                <button
                    className="calendar-arrow"
                    onClick={() => goTo(addWeeks(plan.weekStart, -1))}
                    disabled={!canGoBack}
                    aria-label="Previous week"
                >
                    <ChevronLeft size={20} aria-hidden="true" />
                </button>

                <div className="calendar-title">
                    <span className={`week-status ${plan.status}`}>
                        {STATUS_LABEL[plan.status]}
                    </span>
                    <h1>{formatWeekRange(plan.weekStart)}</h1>
                </div>

                <button
                    className="calendar-arrow"
                    onClick={() => goTo(addWeeks(plan.weekStart, 1))}
                    disabled={!canGoForward}
                    aria-label="Next week"
                >
                    <ChevronRight size={20} aria-hidden="true" />
                </button>
            </header>

            {plan.status !== "current" && (
                <button
                    className="calendar-today"
                    onClick={() => goTo(plan.currentWeekStart)}
                >
                    Back to this week
                </button>
            )}

            {actionError && (
                <p className="section-error" role="alert">
                    {actionError}
                </p>
            )}

            <div
                className={loading ? "calendar-body loading" : "calendar-body"}
            >
                <WeekView
                    plan={plan}
                    myId={myId}
                    onToggle={plan.canMark ? toggleDone : undefined}
                    busyTaskId={busyTaskId}
                />
            </div>
        </div>
    );
}

// The shape of the calendar while it loads: title, "Your tasks" card, and a few person cards.
// It uses the real classes, so nothing jumps when the content replaces it.
function CalendarSkeleton() {
    return (
        <SkeletonPage className="week-page">
            <div
                className="skeleton-stack"
                style={{ alignItems: "center", marginBottom: 24 }}
            >
                <SkeletonBlock width={80} height={20} radius={999} />
                <SkeletonBlock width={220} height={28} />
            </div>
            <section className="week-card skeleton-stack">
                <SkeletonBlock width={120} height={20} />
                <SkeletonBlock height={44} radius={10} />
                <SkeletonBlock height={44} radius={10} />
            </section>
            <SkeletonBlock width={100} height={20} />
            <div className="people-grid" style={{ marginTop: 12 }}>
                {[0, 1, 2].map((i) => (
                    <div key={i} className="person-card skeleton-stack">
                        <div className="skeleton-row">
                            <SkeletonBlock width={36} height={36} radius={10} />
                            <SkeletonBlock width={100} />
                        </div>
                        <SkeletonBlock height={14} />
                        <SkeletonBlock width="70%" height={14} />
                    </div>
                ))}
            </div>
        </SkeletonPage>
    );
}
