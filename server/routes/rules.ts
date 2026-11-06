import { Hono } from "hono";
import type { AppEnv } from "../types/types";
import { parseRuleKind, parseRuleText, parseId } from "../lib/validate";
import type { Rule } from "../../shared/types";
import { requireMember, requireAdmin } from "../lib/membership";
import { requireAuth } from "../lib/auth";

const rules = new Hono<AppEnv>();
rules.use(requireAuth, requireMember);

rules.get("/", async (c) => {
    const kind = parseRuleKind(c.req.query("kind"));
    if (kind === null) {
        return c.json({ error: "kind must be 'house' or 'dishwasher'" }, 400);
    }

    const { houseId } = c.get("membership");

    const { results: rules } = await c.env.DB.prepare(`
        SELECT id, kind, text, position
        FROM rules
        WHERE house_id = ? AND kind = ?
        ORDER BY position, id    
    `).bind(houseId, kind).all<Rule>();

    return c.json(rules);
});

rules.post("/", requireAdmin, async (c) => {
    let body;
    try {
        body = await c.req.json();
    } catch {
        return c.json({ error: "Body must be JSON" }, 400);
    }

    const kind = parseRuleKind(body?.kind);
    if (kind === null) {
        return c.json({ error: "kind must be 'house' or 'dishwasher'" }, 400);
    }

    const textResult = parseRuleText(body?.text);
    if (!textResult.ok) {
        return c.json({ error: textResult.error }, 400);
    }
    const text = textResult.value;

    const { houseId } = c.get("membership");

    const existing = await c.env.DB.prepare(
        "SELECT 1 FROM rules WHERE house_id = ? AND text = ? COLLATE NOCASE",
    )
        .bind(houseId, text)
        .first();
    if (existing) {
        return c.json({ error: "This rule already exists" }, 409);
    }

    const rule = await c.env.DB.prepare(
        `INSERT INTO rules (house_id, kind, text, position)
         VALUES (?, ?, ?, (SELECT COALESCE(MAX(position), -1) + 1 FROM rules WHERE house_id = ? AND kind = ?))
         RETURNING id, kind, text, position`,
    )
        .bind(houseId, kind, text, houseId, kind)
        .first<Rule>();

    return c.json(rule, 201);
});

rules.put("/order", requireAdmin, async (c) => {
    let body;
    try {
        body = await c.req.json();
    } catch {
        return c.json({ error: "Body must be JSON" }, 400);
    }

    const kind = parseRuleKind(body?.kind);
    if (kind === null) {
        return c.json({ error: "kind must be 'house' or 'dishwasher'" }, 400);
    }

    if (!Array.isArray(body?.ids)) {
        return c.json({ error: "ids must be a list of rule ids" }, 400);
    }
    const ids = body.ids.map((value: unknown) => parseId(String(value)));
    if (ids.some((id: number | null) => id === null)) {
        return c.json({ error: "ids must be a list of rule ids" }, 400);
    }

    const { houseId } = c.get("membership");

    const { results: existing } = await c.env.DB.prepare(
        "SELECT id FROM rules WHERE house_id = ? AND kind = ?",
    )
        .bind(houseId, kind)
        .all<{ id: number }>();

    const sortedSent = [...ids].sort((a, b) => a - b).join(",");
    const sortedExisting = existing
        .map((r) => r.id)
        .sort((a, b) => a - b)
        .join(",");

    if (ids.length !== existing.length || sortedSent !== sortedExisting) {
        return c.json({ error: "The rules changed. Reload and try again." }, 409);
    }

    if (ids.length > 0) {
        await c.env.DB.batch(
            ids.map((id: number, index: number) =>
                c.env.DB.prepare("UPDATE rules SET position = ? WHERE id = ? AND house_id = ?").bind(
                    index,
                    id,
                    houseId,
                ),
            ),
        );
    }

    const { results } = await c.env.DB.prepare(
        "SELECT id, kind, text, position FROM rules WHERE house_id = ? AND kind = ? ORDER BY position, id",
    )
        .bind(houseId, kind)
        .all<Rule>();

    return c.json(results);
});

rules.patch("/:ruleId", requireAdmin, async (c) => {
    const ruleId = parseId(c.req.param("ruleId"));
    if (ruleId === null) {
        return c.json({ error: "Invalid rule id" }, 400);
    }

    let body;
    try {
        body = await c.req.json();
    } catch {
        return c.json({ error: "Body must be JSON" }, 400);
    }

    const textResult = parseRuleText(body?.text);
    if (!textResult.ok) {
        return c.json({ error: textResult.error }, 400);
    }
    const text = textResult.value;

    const { houseId } = c.get("membership");

    const duplicate = await c.env.DB.prepare(
        "SELECT 1 FROM rules WHERE house_id = ? AND text = ? COLLATE NOCASE AND id != ?",
    )
        .bind(houseId, text, ruleId)
        .first();
    if (duplicate) {
        return c.json({ error: "This rule already exists" }, 409);
    }

    const rule = await c.env.DB.prepare(
        `UPDATE rules SET text = ?, updated_at = datetime('now')
         WHERE id = ? AND house_id = ?
         RETURNING id, kind, text, position`,
    )
        .bind(text, ruleId, houseId)
        .first<Rule>();

    if (!rule) {
        return c.json({ error: "Rule not found" }, 404);
    }
    return c.json(rule);
});

rules.delete("/:ruleId", requireAdmin, async (c) => {
    const ruleId = parseId(c.req.param("ruleId"));
    if (ruleId === null) {
        return c.json({ error: "Invalid rule id" }, 400);
    }

    const { houseId } = c.get("membership");
    const result = await c.env.DB.prepare("DELETE FROM rules WHERE id = ? AND house_id = ?")
        .bind(ruleId, houseId)
        .run();

    if (result.meta.changes === 0) {
        return c.json({ error: "Rule not found" }, 404);
    }
    return c.json({ ok: true });
});

export default rules;
