import { Hono } from "hono";
import type { AppEnv } from "../types/types";
import { parseRuleKind, parseRuleText } from "../lib/validate";
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

    // 4. Insert at the end of its list
    const rule = await c.env.DB.prepare(
        `INSERT INTO rules (house_id, kind, text, position)
         VALUES (?, ?, ?, (SELECT COALESCE(MAX(position), -1) + 1 FROM rules WHERE house_id = ? AND kind = ?))
         RETURNING id, kind, text, position`,
    )
        .bind(houseId, kind, text, houseId, kind)
        .first<Rule>();

    return c.json(rule, 201);
});

export default rules;
