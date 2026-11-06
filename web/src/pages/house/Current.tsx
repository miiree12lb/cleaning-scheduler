import { useAuth } from "../../auth/AuthContext";
import { useHouse } from "../../utils/useHouse";
import { formatWeekRange } from "../../utils/dates";
import WeekView from "../house/WeekView";
import { useWeek } from "../../utils/useWeek";
import "../../css/week.css";

export default function Current() {
    const { house } = useHouse();
    const { auth } = useAuth();
    const myId = auth.status === "authenticated" ? auth.user.id : null;
    const { plan, error, actionError, busyTaskId, toggleDone } = useWeek(house.id, "current");

    if (error) return <div className="week-page"><p className="section-error">Couldn't load this week.</p></div>;
    if (plan === null) return null;

    return (
        <div className="week-page">
            <header className="week-header">
                <h1>This week</h1>
                <p className="week-dates">{formatWeekRange(plan.weekStart)}</p>
            </header>
            {actionError && <p className="section-error" role="alert">{actionError}</p>}
            <WeekView plan={plan} myId={myId} onToggle={toggleDone} busyTaskId={busyTaskId} />
        </div>
    );
}
