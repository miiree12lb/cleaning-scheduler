import { Hono } from "hono";
import type { AppEnv } from "../types/types";
import { requireAuth } from "../lib/auth";
import type { SessionUser, HouseSummary } from "../../shared/types";
import { parseName } from "../lib/validate";
import { randomHex } from "../lib/random";
import { parseId } from "../lib/validate";

const houses = new Hono<AppEnv>();
houses.use(requireAuth);

houses.get("/", async (c) => {
    const user: SessionUser = c.get("user");
    const { results } = await c.env.DB.prepare(
        `SELECT houses.id, houses.name, house_members.role
        FROM house_members
        JOIN houses ON houses.id = house_members.house_id
        WHERE house_members.user_id = ?
        ORDER BY houses.name`
    ).bind(user.id).all<HouseSummary>();

    return c.json(results);
});

houses.get("/:id", async (c) => {
    const user: SessionUser = c.get("user");
    const houseId = parseId(c.req.param("id"));

    if (houseId === null) {
        return c.json({ error: "Invalid house id" }, 400);
    }

    const row = await c.env.DB.prepare(
        `SELECT houses.id, houses.name, house_members.role
        FROM house_members
        JOIN houses ON houses.id = house_members.house_id
        WHERE house_members.user_id = ?
          AND houses.id = ?`
    ).bind(user.id, houseId).first<HouseSummary>();

    if (!row) {
        return c.json({ error: "House not found" }, 404);
    }
    return c.json(row);
});

houses.post("/", async (c) => {
    const user = c.get("user");
    
    let body;
    try {
        body = await c.req.json();
    } catch {
        return c.json({ error: "Body must be JSON" }, 400);
    }

    const nameResult = parseName(body?.name);
    if (!nameResult.ok) {
        return c.json({ error: nameResult.error }, 400);
    }
    const name = nameResult.value;

    const results = await c.env.DB.batch([
        c.env.DB.prepare("INSERT INTO houses (name, invite_code) VALUES (?, ?)")
            .bind(name, randomHex(5)),
        c.env.DB.prepare(
            "INSERT INTO house_members (house_id, user_id, role, rotation_order) VALUES (last_insert_rowid(), ?, 'admin', 0)",
        ).bind(user.id),
    ]);

    const houseId = results[0].meta.last_row_id;
    return c.json({ id: houseId, name, role: "admin" }, 201);
});

export default houses;
