# Useful commands

All commands run from the project root, in PowerShell.

## Everyday

```powershell
npm run dev          # React + Worker API + local D1, on http://localhost:5173
npm run build        # build web/ into web/dist
npm run typecheck    # type-check the server code
npm run format       # format everything with Prettier
```

`npm run dev` needs a restart after changing `wrangler.jsonc`, `vite.config.ts` or `.dev.vars`.

## After changing `wrangler.jsonc` or `.dev.vars`

```powershell
npx wrangler types   # regenerate worker-configuration.d.ts (the Env type)
```

Then restart the TypeScript server in VS Code: Ctrl+Shift+P → "TypeScript: Restart TS Server".

## Local database

Create a new migration (creates `server/migrations/000X_name.sql`):

```powershell
npx wrangler d1 migrations create cleaning-db name_of_change
```

Apply migrations, and list what has been applied:

```powershell
npm run db:migrate:local
npx wrangler d1 migrations list cleaning-db --local
```

Run any SQL:

```powershell
npx wrangler d1 execute cleaning-db --local --command "SELECT * FROM users"
```

List all tables:

```powershell
npx wrangler d1 execute cleaning-db --local --command "SELECT name FROM sqlite_master WHERE type = 'table'"
```

Reset the local database (deletes all local data), then re-apply the migrations:

```powershell
Remove-Item -Recurse -Force .wrangler\state
npm run db:migrate:local
```

## Testing login without Google

Create a test user and a session:

```powershell
npx wrangler d1 execute cleaning-db --local --command "INSERT INTO users (email, name, google_id) VALUES ('test@example.com', 'Test', 'abc123')"
npx wrangler d1 execute cleaning-db --local --command "INSERT INTO sessions (id, user_id, expires_at) VALUES ('test-session', 1, datetime('now', '+1 day'))"
```

Set the cookie in the browser (DevTools → Console, on the dev server's page):

```js
document.cookie = "session=test-session; path=/";
```

Expire the session, or make it valid again:

```powershell
npx wrangler d1 execute cleaning-db --local --command "UPDATE sessions SET expires_at = datetime('now', '-1 hour') WHERE id = 'test-session'"
npx wrangler d1 execute cleaning-db --local --command "UPDATE sessions SET expires_at = datetime('now', '+1 day') WHERE id = 'test-session'"
```

Check who you are: open `/api/auth/me`.

## Git

```powershell
git status                     # what changed
git diff                       # see the changes line by line
git add .
git commit -m "Message"
git restore path\to\file       # undo uncommitted changes to a file
git rm -r --cached folder      # stop tracking something that should be ignored
```

## Production (later)

```powershell
npx wrangler login
npx wrangler d1 migrations apply cleaning-db --remote   # apply migrations to the real database
npx wrangler secret put GOOGLE_CLIENT_SECRET            # store a secret on Cloudflare
npm run deploy                                          # build and deploy
```

Never edit a migration that has been applied with `--remote`. Create a new one instead.

## PowerShell notes

- Windows PowerShell 5.1 doesn't support `&&`. Run commands on separate lines (inside npm scripts, `&&` works fine).
- `echo "..." > file` writes UTF-16 in PowerShell 5.1. Create text files like `.gitignore` in your editor instead, and save them as UTF-8.

## Deploy

npx wrangler d1 migrations apply cleaning-db --remote # only when there are new migrations
npm run deploy
npx wrangler tail # live logs of the deployed app

# Secrets (set once, or when they change; paste the value at the prompt):

npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET

# Never set DEV_LOGIN in production. This must answer {"error":"Not found"}:

# https://cleaning-scheduler.miiree12lb.workers.dev/api/auth/dev-login/1
