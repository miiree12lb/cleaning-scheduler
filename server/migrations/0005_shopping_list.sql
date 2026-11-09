-- Migration number: 0005 	 2026-11-08T15:03:14.669Z

-- One row per time something needs buying. When it's bought, the row stays as history,
-- and "Add again" creates a new row.
CREATE TABLE shopping_items (
    id INTEGER PRIMARY KEY,
    house_id INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    note TEXT,
    added_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    added_at TEXT NOT NULL DEFAULT (datetime('now')),
    bought_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    bought_at TEXT
);

-- No duplicates on the list: "milk" can't be added while "Milk" still needs buying.
-- Only items that still need buying count, so the same item can be bought many times.
CREATE UNIQUE INDEX shopping_items_needed_name
    ON shopping_items (house_id, name COLLATE NOCASE)
    WHERE bought_at IS NULL;

-- The page always asks for one house's list, split by bought or not
CREATE INDEX shopping_items_house ON shopping_items (house_id, bought_at);
