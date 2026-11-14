# Useful commands

All commands run from the project root, in PowerShell.

## Everyday

```powershell
npm run dev          # React + Worker API + local D1, on http://localhost:5173
npm run build        # build web/ into web/dist
npm run typecheck    # type-check the server code
npx vitest run       # run the tests
npm run format       # format everything with Prettier
```

`npm run dev` needs a restart after changing `wrangler.jsonc`, `vite.config.ts` or `.dev.vars`.

To try the **built** app (bundled and minified, like online), for example to check loading speed:

```powershell
npm --prefix web run build
npm --prefix web run preview
```

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

List all tables, or see how one table was created:

```powershell
npx wrangler d1 execute cleaning-db --local --command "SELECT name FROM sqlite_master WHERE type = 'table'"
npx wrangler d1 execute cleaning-db --local --command "SELECT sql FROM sqlite_master WHERE tbl_name = 'users'"
```

Reset the local database (deletes all local data), then re-apply the migrations:

```powershell
Remove-Item -Recurse -Force .wrangler\state
npm run db:migrate:local
```

Always run these from the **project root**. Running `wrangler` from inside `server/` or `web/` creates a second `.wrangler` folder there, with a separate database the app doesn't use.

## Testing login without Google

Create an account with email and password on the login page. For a second test user, use a private window.

Log everyone out (deletes all local sessions):

```powershell
npx wrangler d1 execute cleaning-db --local --command "DELETE FROM sessions"
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

## Before deploying

Stop at the first one that fails:

```powershell
npm run format
npm run typecheck
npx vitest run
npm --prefix web run build
git status                                              # everything committed, no .dev.vars
npx wrangler d1 migrations list cleaning-db --remote    # what's pending online
Get-ChildItem web\src -Recurse -File | Select-String -Pattern "Test crash|console.log\("
```

The last one finds leftovers from testing. `console.error` and `console.warn` are fine.

## Deploy

```powershell
npx wrangler d1 migrations apply cleaning-db --remote   # only when there are new migrations, right before deploying
npm run deploy                                          # build and deploy
```

Never edit a migration that has been applied with `--remote`. Create a new one instead.

## When something goes wrong online

```powershell
npx wrangler tail --config web/dist/cleaning_scheduler/wrangler.json       # live logs of the deployed app
npx wrangler rollback --config web/dist/cleaning_scheduler/wrangler.json   # put the previous version back
npx wrangler d1 time-travel info cleaning-db                               # database restore points (backups)
```

Rollback only undoes the **code**. It doesn't undo migrations: the database stays as it is.

## Secrets

Set once, or when they change. Paste the value at the prompt, never on the command line:

```powershell
npx wrangler login
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret list --config web/dist/cleaning_scheduler/wrangler.json   # check what's set
```

## Licenses

Check the licenses of every package (run in the root and in `web`):

```powershell
npx license-checker --summary
```

GPL or AGPL in a package that ships to users (the browser bundle or the Worker) needs a closer look. Build and dev tools don't matter.

## PowerShell notes

- Windows PowerShell 5.1 doesn't support `&&`. Run commands on separate lines (inside npm scripts, `&&` works fine).
- `echo "..." > file` writes UTF-16 in PowerShell 5.1. Create text files like `.gitignore` in your editor instead, and save them as UTF-8.
- `Select-String -Path folder\**\*` doesn't search subfolders. Use `Get-ChildItem folder -Recurse -File | Select-String -Pattern "…"` instead.
