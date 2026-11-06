export function formatWeekRange(weekStart: string): string {
    const start = new Date(weekStart + "T00:00:00Z");
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);

    const fmt = (d: Date, withMonth: boolean) =>
        d.toLocaleDateString(undefined, {
            day: "numeric",
            ...(withMonth ? { month: "long" } : {}),
            timeZone: "UTC",
        });

    const sameMonth = start.getUTCMonth() === end.getUTCMonth();
    return `${fmt(start, !sameMonth)} – ${fmt(end, true)}`;
}
