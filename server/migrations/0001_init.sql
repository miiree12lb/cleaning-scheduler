-- Migration number: 0001 	 2026-11-05T13:48:59.342Z

CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    google_id TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE houses (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    invite_code TEXT NOT NULL UNIQUE,
    timezone TEXT NOT NULL DEFAULT ('Europe/Berlin'),
    created_at TEXT NOT NULL DEFAULT (datetime('now')) 
);

CREATE TABLE house_members (
    house_id INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT ('member'),
    uses_dishwasher INTEGER NOT NULL DEFAULT 1 CHECK (uses_dishwasher IN (0, 1)),
    rotation_order INTEGER NOT NULL,
    joined_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY(house_id, user_id)
);

CREATE TABLE invites (
    id INTEGER PRIMARY KEY,
    house_id INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (house_id, email)
);

CREATE TABLE tasks (
    id INTEGER PRIMARY KEY,
    house_id INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE assignments (
    id INTEGER PRIMARY KEY,
    house_id INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    week_start TEXT NOT NULL CHECK (strftime('%w', week_start) = '1'),
    task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    done_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    done_at TEXT,
    UNIQUE (house_id, week_start, task_id)
);
CREATE INDEX idx_assignments_house_week ON assignments (house_id, week_start);

CREATE TABLE rules (
    id INTEGER PRIMARY KEY,
    house_id INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT ('house') CHECK (kind IN ('house', 'dishwasher')),
    text TEXT NOT NULL,
    position INTEGER NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
