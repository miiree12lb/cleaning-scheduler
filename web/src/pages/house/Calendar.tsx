import { useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { useHouse } from "../../utils/useHouse";
import { useWeek } from "../../utils/useWeek";
import { addWeeks, formatWeekRange } from "../../utils/dates";
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

    const { plan, loading, error, actionError, busyTaskId, toggleDone } = useWeek(house.id, week);

    if (error) {
        return (
            <div className="week-page">
                <p className="section-error">Couldn't load this week.</p>
                <button className="secondary-button" onClick={() => setSearchParams({})}>
                    Go to this week
                </button>
            </div>
        );
    }

    if (plan === null) return null;

    const lastWeekStart = addWeeks(plan.currentWeekStart, MAX_WEEKS_AHEAD);
    const canGoBack = plan.weekStart > plan.firstWeekStart;
    const canGoForward = plan.weekStart < lastWeekStart;

    function goTo(weekStart: string) {
        setSearchParams(weekStart === plan!.currentWeekStart ? {} : { week: weekStart });
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
                    <span className={`week-status ${plan.status}`}>{STATUS_LABEL[plan.status]}</span>
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
                <button className="calendar-today" onClick={() => goTo(plan.currentWeekStart)}>
                    Back to this week
                </button>
            )}

            {actionError && (
                <p className="section-error" role="alert">
                    {actionError}
                </p>
            )}

            <div className={loading ? "calendar-body loading" : "calendar-body"}>
                <WeekView
                    plan={plan}
                    myId={myId}
                    onToggle={plan.status === "current" ? toggleDone : undefined}
                    busyTaskId={busyTaskId}
                />
            </div>
        </div>
    );
}
