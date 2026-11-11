export function dateIn(timeZone: string, moment: Date = new Date()): string {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(moment);

    const get = (type: string) => parts.find((p) => p.type === type)!.value;
    return `${get("year")}-${get("month")}-${get("day")}`;
}

function addDays(date: string, days: number): string {
    const d = new Date(date + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

export function mondayOf(date: string): string {
    const day = new Date(date + "T00:00:00Z").getUTCDay();
    return addDays(date, -((day + 6) % 7));
}

export function addWeeks(monday: string, weeks: number): string {
    return addDays(monday, 7 * weeks);
}

export function weeksBetween(fromMonday: string, toMonday: string): number {
    const from = new Date(fromMonday + "T00:00:00Z");
    const to = new Date(toMonday + "T00:00:00Z");
    const days = (to.getTime() - from.getTime()) / 86_400_000;
    return Math.round(days / 7);
}

export function dateOfTimestamp(timestamp: string, timeZone: string): string {
    const moment = new Date(timestamp.replace(" ", "T") + "Z");
    return dateIn(timeZone, moment);
}
