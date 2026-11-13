import { useCallback, useEffect, useState } from "react";
import type { WeekPlan } from "../../../shared/types";
import { useRefreshOnFocus } from "./useRefreshOnFocus";
import { readError } from "./readError";
import { apiFetch } from "./apiFetch";

type Assignment = WeekPlan["assignments"][number];

// week: a Monday like "2026-11-16", or "current"
export function useWeek(houseId: number, week: string, me: { id: number; name: string } | null) {
    const [plan, setPlan] = useState<WeekPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [busyTaskId, setBusyTaskId] = useState<number | null>(null);

    const loadWeek = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const res = await apiFetch(`/api/houses/${houseId}/weeks/${week}`);
            if (!res.ok) {
                setError(true);
                return;
            }
            const data: WeekPlan = await res.json();
            setPlan(data);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [houseId, week]);

    useEffect(() => {
        loadWeek();
    }, [loadWeek]);

    useRefreshOnFocus(loadWeek);

    async function toggleDone(assignment: Assignment) {
        if (plan === null || me === null) return;

        const marking = assignment.doneAt === null;

        // Show the change right away, like a checkbox should
        const optimistic: Assignment = marking
            ? { ...assignment, doneAt: new Date().toISOString(), doneById: me.id, doneByName: me.name }
            : { ...assignment, doneAt: null, doneById: null, doneByName: null, late: false };
        const replace = (next: Assignment) =>
            setPlan((prev) =>
                prev === null
                    ? prev
                    : { ...prev, assignments: prev.assignments.map((a) => (a.taskId === next.taskId ? next : a)) },
            );

        replace(optimistic);
        setBusyTaskId(assignment.taskId);
        setActionError(null);
        try {
            const res = await apiFetch(
                `/api/houses/${houseId}/weeks/${plan.weekStart}/tasks/${assignment.taskId}/done`,
                { method: marking ? "PUT" : "DELETE" },
            );
            if (!res.ok) {
                replace(assignment); // put it back as it was
                setActionError(await readError(res, "Could not update the task."));
                return;
            }
            // The server's version has the real time and the "late" flag
            const updated: Assignment = await res.json();
            replace(updated);
        } catch {
            replace(assignment);
            setActionError("Could not reach the server.");
        } finally {
            setBusyTaskId(null);
        }
    }

    return {
        plan,
        loading,
        error,
        actionError,
        busyTaskId,
        toggleDone,
        reload: loadWeek,
    };
}
