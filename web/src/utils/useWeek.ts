import { useCallback, useEffect, useState } from "react";
import type { WeekPlan } from "../../../shared/types";
import { useRefreshOnFocus } from "./useRefreshOnFocus";
import { readError } from "./readError";
import { apiFetch } from "./apiFetch";

type Assignment = WeekPlan["assignments"][number];

// week: a Monday like "2026-11-16", or "current"
export function useWeek(houseId: number, week: string) {
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
        if (plan === null) return;

        setBusyTaskId(assignment.taskId);
        setActionError(null);
        try {
            const res = await apiFetch(
                `/api/houses/${houseId}/weeks/${plan.weekStart}/tasks/${assignment.taskId}/done`,
                { method: assignment.doneAt ? "DELETE" : "PUT" },
            );
            if (!res.ok) {
                setActionError(
                    await readError(res, "Could not update the task."),
                );
                return;
            }
            const updated: Assignment = await res.json();
            setPlan((prev) =>
                prev === null
                    ? prev
                    : {
                          ...prev,
                          assignments: prev.assignments.map((a) =>
                              a.taskId === updated.taskId ? updated : a,
                          ),
                      },
            );
        } catch {
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
