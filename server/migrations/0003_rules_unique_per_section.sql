-- Migration number: 0003 	 2026-11-07T08:08:56.207Z

-- Rules only need to be unique within their section, not the whole house
CREATE TABLE rules_new (
    id INTEGER PRIMARY KEY,
    house_id INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    section_id INTEGER NOT NULL REFERENCES rule_sections(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    position INTEGER NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (section_id, text)
);

INSERT INTO rules_new (id, house_id, section_id, text, position, updated_at)
SELECT id, house_id, section_id, text, position, updated_at FROM rules;

DROP TABLE rules;

ALTER TABLE rules_new RENAME TO rules;
