// The most of each thing one account or house can create.
// They stop a single account from filling the database (and using up the free plan's daily writes).
export const LIMITS = {
    housesPerUser: 10,
    membersPerHouse: 20,
    activeTasksPerHouse: 50,
    sectionsPerHouse: 20,
    rulesPerSection: 50,
    shoppingItems: 200,
} as const;

// Runs a "SELECT COUNT(*) AS count ..." query and returns the number
export async function countOf(
    db: D1Database,
    sql: string,
    ...params: unknown[]
): Promise<number> {
    const row = await db
        .prepare(sql)
        .bind(...params)
        .first<{ count: number }>();
    return row?.count ?? 0;
}
