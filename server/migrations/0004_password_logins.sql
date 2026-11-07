-- Migration number: 0004 	 2026-11-07T18:42:23.586Z

-- Password logins, for people without a Google account.
-- Their users row gets a placeholder google_id ('password:…'), because google_id is NOT NULL,
-- and rebuilding users would cascade-delete everything that references it.
CREATE TABLE password_logins (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    iterations INTEGER NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One account per email, whatever the capitals
CREATE UNIQUE INDEX users_email_nocase ON users (email COLLATE NOCASE);
