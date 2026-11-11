import { Hono, type Context } from "hono";
import type { AppEnv } from "../types/types";
import type { Rule, RuleSection } from "../../shared/types";
import {
    parseId,
    parseIdList,
    parseRuleText,
    parseSectionName,
} from "../lib/validate";
import { requireAdmin, requireMember } from "../lib/membership";
import { requireAuth } from "../lib/auth";
import { LIMITS, countOf } from "../lib/limits";

const rules = new Hono<AppEnv>();
rules.use(requireAuth, requireMember);

// ---------- Helpers ----------

// Read the JSON body; null if it isn't valid JSON
async function readBody(
    c: Context<AppEnv>,
): Promise<Record<string, unknown> | null> {
    try {
        const body = await c.req.json();
        return body !== null && typeof body === "object" ? body : {};
    } catch {
        return null;
    }
}

// Do two lists contain exactly the same ids, each once?
function sameIds(sent: number[], existing: number[]): boolean {
    const a = [...sent].sort((x, y) => x - y).join(",");
    const b = [...existing].sort((x, y) => x - y).join(",");
    return sent.length === existing.length && a === b;
}

// A section of this house, or null
function findSection(db: D1Database, houseId: number, sectionId: number) {
    return db
        .prepare(
            "SELECT id, name, opt_in AS optIn FROM rule_sections WHERE id = ? AND house_id = ?",
        )
        .bind(sectionId, houseId)
        .first<{ id: number; name: string; optIn: number }>();
}

// Everything the Rules page needs: sections, their rules, and who uses each opt-in section
async function loadSections(
    db: D1Database,
    houseId: number,
): Promise<RuleSection[]> {
    const [sectionsRes, rulesRes, usersRes] = await db.batch([
        db
            .prepare(
                "SELECT id, name, position, opt_in AS optIn FROM rule_sections WHERE house_id = ? ORDER BY position, id",
            )
            .bind(houseId),
        db
            .prepare(
                "SELECT id, section_id AS sectionId, text, position FROM rules WHERE house_id = ? ORDER BY position, id",
            )
            .bind(houseId),
        db
            .prepare(
                `SELECT section_members.section_id AS sectionId, users.id, users.name
                 FROM section_members
                 JOIN rule_sections ON rule_sections.id = section_members.section_id
                 JOIN users ON users.id = section_members.user_id
                 JOIN house_members
                     ON house_members.house_id = rule_sections.house_id
                    AND house_members.user_id = users.id
                 WHERE rule_sections.house_id = ?
                 ORDER BY house_members.rotation_order`,
            )
            .bind(houseId),
    ]);

    const sections = sectionsRes.results as {
        id: number;
        name: string;
        position: number;
        optIn: number;
    }[];
    const allRules = rulesRes.results as Rule[];
    const users = usersRes.results as {
        sectionId: number;
        id: number;
        name: string;
    }[];

    return sections.map((s) => ({
        id: s.id,
        name: s.name,
        position: s.position,
        optIn: s.optIn === 1,
        rules: allRules.filter((r) => r.sectionId === s.id),
        users:
            s.optIn === 1
                ? users
                      .filter((u) => u.sectionId === s.id)
                      .map(({ id, name }) => ({ id, name }))
                : [],
    }));
}

// ---------- Reading ----------

rules.get("/", async (c) => {
    const { houseId } = c.get("membership");
    return c.json(await loadSections(c.env.DB, houseId));
});

// ---------- Sections (admins) ----------

rules.post("/sections", requireAdmin, async (c) => {
    const body = await readBody(c);
    if (!body) return c.json({ error: "Body must be JSON" }, 400);

    const nameResult = parseSectionName(body.name);
    if (!nameResult.ok) return c.json({ error: nameResult.error }, 400);
    const name = nameResult.value;

    if (body.optIn !== undefined && typeof body.optIn !== "boolean") {
        return c.json({ error: "optIn must be true or false" }, 400);
    }
    const optIn = body.optIn === true;

    const { houseId } = c.get("membership");

    const duplicate = await c.env.DB.prepare(
        "SELECT 1 FROM rule_sections WHERE house_id = ? AND name = ? COLLATE NOCASE",
    )
        .bind(houseId, name)
        .first();
    if (duplicate)
        return c.json(
            { error: "A section with this name already exists" },
            409,
        );

    const sections = await countOf(
        c.env.DB,
        "SELECT COUNT(*) AS count FROM rule_sections WHERE house_id = ?",
        houseId,
    );
    if (sections >= LIMITS.sectionsPerHouse) {
        return c.json(
            {
                error: `A house can have at most ${LIMITS.sectionsPerHouse} sections.`,
            },
            409,
        );
    }

    const section = await c.env.DB.prepare(
        `INSERT INTO rule_sections (house_id, name, position, opt_in)
         VALUES (?, ?, (SELECT COALESCE(MAX(position), -1) + 1 FROM rule_sections WHERE house_id = ?), ?)
         RETURNING id, name, position`,
    )
        .bind(houseId, name, houseId, optIn ? 1 : 0)
        .first<{ id: number; name: string; position: number }>();

    if (!section) return c.json({ error: "Could not create the section" }, 500);

    const created: RuleSection = { ...section, optIn, rules: [], users: [] };
    return c.json(created, 201);
});

// Reorder the sections: { ids } with all section ids in the new order
rules.put("/sections/order", requireAdmin, async (c) => {
    const body = await readBody(c);
    if (!body) return c.json({ error: "Body must be JSON" }, 400);

    const ids = parseIdList(body.ids);
    if (ids === null)
        return c.json({ error: "ids must be a list of section ids" }, 400);

    const { houseId } = c.get("membership");
    const { results: existing } = await c.env.DB.prepare(
        "SELECT id FROM rule_sections WHERE house_id = ?",
    )
        .bind(houseId)
        .all<{ id: number }>();

    if (
        !sameIds(
            ids,
            existing.map((s) => s.id),
        )
    ) {
        return c.json(
            { error: "The sections changed. Reload and try again." },
            409,
        );
    }

    if (ids.length > 0) {
        await c.env.DB.batch(
            ids.map((id, index) =>
                c.env.DB.prepare(
                    "UPDATE rule_sections SET position = ? WHERE id = ? AND house_id = ?",
                ).bind(index, id, houseId),
            ),
        );
    }

    return c.json(await loadSections(c.env.DB, houseId));
});

// Rename a section and/or switch "who uses this" on or off
rules.patch("/sections/:sectionId", requireAdmin, async (c) => {
    const sectionId = parseId(c.req.param("sectionId"));
    if (sectionId === null) return c.json({ error: "Invalid section id" }, 400);

    const body = await readBody(c);
    if (!body) return c.json({ error: "Body must be JSON" }, 400);

    const hasName = "name" in body;
    const hasOptIn = "optIn" in body;
    if (!hasName && !hasOptIn)
        return c.json({ error: "Nothing to update" }, 400);

    const { houseId } = c.get("membership");
    const current = await findSection(c.env.DB, houseId, sectionId);
    if (!current) return c.json({ error: "Section not found" }, 404);

    let name = current.name;
    if (hasName) {
        const result = parseSectionName(body.name);
        if (!result.ok) return c.json({ error: result.error }, 400);
        name = result.value;

        const duplicate = await c.env.DB.prepare(
            "SELECT 1 FROM rule_sections WHERE house_id = ? AND name = ? COLLATE NOCASE AND id != ?",
        )
            .bind(houseId, name, sectionId)
            .first();
        if (duplicate)
            return c.json(
                { error: "A section with this name already exists" },
                409,
            );
    }

    let optIn = current.optIn === 1;
    if (hasOptIn) {
        if (typeof body.optIn !== "boolean")
            return c.json({ error: "optIn must be true or false" }, 400);
        optIn = body.optIn;
    }

    const statements = [
        c.env.DB.prepare(
            "UPDATE rule_sections SET name = ?, opt_in = ? WHERE id = ? AND house_id = ?",
        ).bind(name, optIn ? 1 : 0, sectionId, houseId),
    ];
    // Switching "who uses this" off forgets who used it
    if (!optIn) {
        statements.push(
            c.env.DB.prepare(
                "DELETE FROM section_members WHERE section_id = ?",
            ).bind(sectionId),
        );
    }
    await c.env.DB.batch(statements);

    const sections = await loadSections(c.env.DB, houseId);
    return c.json(sections.find((s) => s.id === sectionId));
});

// Delete a section, with all its rules and its "who uses this" list
rules.delete("/sections/:sectionId", requireAdmin, async (c) => {
    const sectionId = parseId(c.req.param("sectionId"));
    if (sectionId === null) return c.json({ error: "Invalid section id" }, 400);

    const { houseId } = c.get("membership");
    const result = await c.env.DB.prepare(
        "DELETE FROM rule_sections WHERE id = ? AND house_id = ?",
    )
        .bind(sectionId, houseId)
        .run();

    if (result.meta.changes === 0)
        return c.json({ error: "Section not found" }, 404);
    return c.json({ ok: true });
});

// ---------- Rules inside a section (admins) ----------

rules.post("/sections/:sectionId/rules", requireAdmin, async (c) => {
    const sectionId = parseId(c.req.param("sectionId"));
    if (sectionId === null) return c.json({ error: "Invalid section id" }, 400);

    const body = await readBody(c);
    if (!body) return c.json({ error: "Body must be JSON" }, 400);

    const textResult = parseRuleText(body.text);
    if (!textResult.ok) return c.json({ error: textResult.error }, 400);
    const text = textResult.value;

    const { houseId } = c.get("membership");
    if (!(await findSection(c.env.DB, houseId, sectionId))) {
        return c.json({ error: "Section not found" }, 404);
    }

    // The same rule may appear in different sections, but only once per section
    const duplicate = await c.env.DB.prepare(
        "SELECT 1 FROM rules WHERE section_id = ? AND text = ? COLLATE NOCASE",
    )
        .bind(sectionId, text)
        .first();
    if (duplicate)
        return c.json(
            { error: "This rule already exists in this section" },
            409,
        );

    const rulesInSection = await countOf(
        c.env.DB,
        "SELECT COUNT(*) AS count FROM rules WHERE section_id = ?",
        sectionId,
    );
    if (rulesInSection >= LIMITS.rulesPerSection) {
        return c.json(
            {
                error: `A section can have at most ${LIMITS.rulesPerSection} rules.`,
            },
            409,
        );
    }

    const rule = await c.env.DB.prepare(
        `INSERT INTO rules (house_id, section_id, text, position)
         VALUES (?, ?, ?, (SELECT COALESCE(MAX(position), -1) + 1 FROM rules WHERE section_id = ?))
         RETURNING id, section_id AS sectionId, text, position`,
    )
        .bind(houseId, sectionId, text, sectionId)
        .first<Rule>();

    return c.json(rule, 201);
});

// Reorder the rules in one section: { ids } with all its rule ids in the new order
rules.put("/sections/:sectionId/rules/order", requireAdmin, async (c) => {
    const sectionId = parseId(c.req.param("sectionId"));
    if (sectionId === null) return c.json({ error: "Invalid section id" }, 400);

    const body = await readBody(c);
    if (!body) return c.json({ error: "Body must be JSON" }, 400);

    const ids = parseIdList(body.ids);
    if (ids === null)
        return c.json({ error: "ids must be a list of rule ids" }, 400);

    const { houseId } = c.get("membership");
    if (!(await findSection(c.env.DB, houseId, sectionId))) {
        return c.json({ error: "Section not found" }, 404);
    }

    const { results: existing } = await c.env.DB.prepare(
        "SELECT id FROM rules WHERE section_id = ? AND house_id = ?",
    )
        .bind(sectionId, houseId)
        .all<{ id: number }>();

    if (
        !sameIds(
            ids,
            existing.map((r) => r.id),
        )
    ) {
        return c.json(
            { error: "The rules changed. Reload and try again." },
            409,
        );
    }

    if (ids.length > 0) {
        await c.env.DB.batch(
            ids.map((id, index) =>
                c.env.DB.prepare(
                    "UPDATE rules SET position = ? WHERE id = ? AND section_id = ?",
                ).bind(index, id, sectionId),
            ),
        );
    }

    const { results } = await c.env.DB.prepare(
        "SELECT id, section_id AS sectionId, text, position FROM rules WHERE section_id = ? ORDER BY position, id",
    )
        .bind(sectionId)
        .all<Rule>();

    return c.json(results);
});

// Change a rule's text
rules.patch("/rules/:ruleId", requireAdmin, async (c) => {
    const ruleId = parseId(c.req.param("ruleId"));
    if (ruleId === null) return c.json({ error: "Invalid rule id" }, 400);

    const body = await readBody(c);
    if (!body) return c.json({ error: "Body must be JSON" }, 400);

    const textResult = parseRuleText(body.text);
    if (!textResult.ok) return c.json({ error: textResult.error }, 400);
    const text = textResult.value;

    const { houseId } = c.get("membership");

    // Another rule with this text in the same section? The subquery finds this rule's section
    // (only if it belongs to this house).
    const duplicate = await c.env.DB.prepare(
        `SELECT 1 FROM rules
         WHERE section_id = (SELECT section_id FROM rules WHERE id = ? AND house_id = ?)
           AND text = ? COLLATE NOCASE
           AND id != ?`,
    )
        .bind(ruleId, houseId, text, ruleId)
        .first();
    if (duplicate)
        return c.json(
            { error: "This rule already exists in this section" },
            409,
        );

    const rule = await c.env.DB.prepare(
        `UPDATE rules SET text = ?, updated_at = datetime('now')
         WHERE id = ? AND house_id = ?
         RETURNING id, section_id AS sectionId, text, position`,
    )
        .bind(text, ruleId, houseId)
        .first<Rule>();

    if (!rule) return c.json({ error: "Rule not found" }, 404);
    return c.json(rule);
});

// Delete a rule
rules.delete("/rules/:ruleId", requireAdmin, async (c) => {
    const ruleId = parseId(c.req.param("ruleId"));
    if (ruleId === null) return c.json({ error: "Invalid rule id" }, 400);

    const { houseId } = c.get("membership");
    const result = await c.env.DB.prepare(
        "DELETE FROM rules WHERE id = ? AND house_id = ?",
    )
        .bind(ruleId, houseId)
        .run();

    if (result.meta.changes === 0)
        return c.json({ error: "Rule not found" }, 404);
    return c.json({ ok: true });
});

// ---------- "I use this" (any member) ----------

rules.put("/sections/:sectionId/me", async (c) => {
    const sectionId = parseId(c.req.param("sectionId"));
    if (sectionId === null) return c.json({ error: "Invalid section id" }, 400);

    const { houseId } = c.get("membership");
    const section = await findSection(c.env.DB, houseId, sectionId);
    if (!section) return c.json({ error: "Section not found" }, 404);
    if (section.optIn !== 1)
        return c.json({ error: "This section doesn't ask who uses it" }, 409);

    await c.env.DB.prepare(
        "INSERT INTO section_members (section_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
    )
        .bind(sectionId, c.get("user").id)
        .run();

    return c.json({ ok: true });
});

rules.delete("/sections/:sectionId/me", async (c) => {
    const sectionId = parseId(c.req.param("sectionId"));
    if (sectionId === null) return c.json({ error: "Invalid section id" }, 400);

    const { houseId } = c.get("membership");
    if (!(await findSection(c.env.DB, houseId, sectionId))) {
        return c.json({ error: "Section not found" }, 404);
    }

    await c.env.DB.prepare(
        "DELETE FROM section_members WHERE section_id = ? AND user_id = ?",
    )
        .bind(sectionId, c.get("user").id)
        .run();

    return c.json({ ok: true });
});

export default rules;
