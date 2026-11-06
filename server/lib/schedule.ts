export type RotationInput = {
    members: { id: number; name: string }[];   // in rotation order
    tasks: { id: number; name: string }[];     // active only, by id
};

export async function loadRotationInput(db: D1Database, houseId: number): Promise<RotationInput> {
    const { results: members } = await db
        .prepare(
            `SELECT users.id, users.name
             FROM house_members
             JOIN users ON users.id = house_members.user_id
             WHERE house_members.house_id = ?
             ORDER BY house_members.rotation_order`,
        )
        .bind(houseId)
        .all<{ id: number; name: string }>();

    const { results: tasks } = await db
        .prepare("SELECT id, name FROM tasks WHERE house_id = ? AND active = 1 ORDER BY id")
        .bind(houseId)
        .all<{ id: number; name: string }>();

    return { members, tasks };
}
