-- Migration number: 0002 	 2026-11-07T06:27:49.367Z
-- Rule sections: "General", "Dishwasher", or anything an admin creates
CREATE TABLE rule_sections (
    id INTEGER PRIMARY KEY,
    house_id INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    opt_in INTEGER NOT NULL DEFAULT 0 CHECK (opt_in IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (house_id, name)
);

-- Who has said "I use this" for an opt-in section
CREATE TABLE section_members (
    section_id INTEGER NOT NULL REFERENCES rule_sections(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (section_id, user_id)
);

-- Every existing house gets a General section
INSERT INTO rule_sections (house_id, name, position, opt_in)
SELECT id, 'General', 0, 0 FROM houses;

-- Only houses that already used the dishwasher features keep a Dishwasher section
INSERT INTO rule_sections (house_id, name, position, opt_in)
SELECT houses.id, 'Dishwasher', 1, 1
FROM houses
WHERE EXISTS (SELECT 1 FROM rules WHERE rules.house_id = houses.id AND rules.kind = 'dishwasher')
   OR EXISTS (SELECT 1 FROM house_members
              WHERE house_members.house_id = houses.id AND house_members.uses_dishwasher = 1);

-- Rebuild the rules table with section_id instead of kind
CREATE TABLE rules_new (
    id INTEGER PRIMARY KEY,
    house_id INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    section_id INTEGER NOT NULL REFERENCES rule_sections(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    position INTEGER NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (house_id, text)
);

INSERT INTO rules_new (id, house_id, section_id, text, position, updated_at)
SELECT rules.id, rules.house_id, rule_sections.id, rules.text, rules.position, rules.updated_at
FROM rules
JOIN rule_sections
    ON rule_sections.house_id = rules.house_id
   AND rule_sections.name = CASE rules.kind WHEN 'dishwasher' THEN 'Dishwasher' ELSE 'General' END;

DROP TABLE rules;
ALTER TABLE rules_new RENAME TO rules;

-- Move everyone's dishwasher setting into their house's Dishwasher section
INSERT INTO section_members (section_id, user_id)
SELECT rule_sections.id, house_members.user_id
FROM house_members
JOIN rule_sections
    ON rule_sections.house_id = house_members.house_id
   AND rule_sections.name = 'Dishwasher'
WHERE house_members.uses_dishwasher = 1;

ALTER TABLE house_members DROP COLUMN uses_dishwasher;
