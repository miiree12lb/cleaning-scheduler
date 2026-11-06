export type PlannedAssignment = {
    taskId: number;
    userId: number;
};

// Always returns a number from 0 to n - 1, even for negative x
function mod(x: number, n: number): number {
    return ((x % n) + n) % n;
}

export function planWeek(
    memberIds: number[], // in rotation order
    taskIds: number[], // in a fixed order (by task ID)
    week: number, // weeks since the house's first Monday
): PlannedAssignment[] {
    // Nobody to give tasks to, or nothing to give
    if (memberIds.length === 0 || taskIds.length === 0) {
        return [];
    }

    // Task at position i goes to the member at position (i + week) mod n
    return taskIds.map((taskId, i) => ({
        taskId,
        userId: memberIds[mod(i + week, memberIds.length)],
    }));
}