# Useful commands

All commands run from the project root, in PowerShell.

## Everyday

```powershell
npm run dev                  # React + Worker API + local D1, on http://localhost:5173
npm run build                # build web/ into web/dist
npm run typecheck            # type-check the server code
npm --prefix web run lint    # lint the web app (ESLint)
npm run test -- --run        # run all tests once
npm run format               # format everything with Prettier
```

`npm run dev` needs a restart after changing `wrangler.jsonc`, `vite.config.ts` or `.dev.vars`.

To try the **built** app (bundled and minified, like online), for example to check loading speed:

```powershell
npm --prefix web run build
npm --prefix web run preview
```

## Tests

```powershell
npm run test -- --run            # everything once
npm run test                     # keeps running, and reruns when a file changes
npx vitest run --project unit    # only the plain-function tests (fast)
npx vitest run --project api     # only the API tests (real Worker, real local D1)
npx vitest run --coverage        # which lines the tests reach (report in test/coverage/index.html)
```

- **`unit`** (`test/server`, `test/shared`, `test/web`) runs in Node: validators, weeks, rotation, passwords, links.
- **`api`** (`test/api`) runs the real Worker in Cloudflare's runtime, with a fresh local D1 built from the migrations. It never touches the dev database. Helpers in `test/api/helpers.ts` create users, houses and tasks through the real API.
- The API tests read `wrangler.jsonc`, which points at `web/dist`, so **build the web app first** if `web/dist` doesn't exist.
- When fixing a bug, add a test that would have caught it.

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

Undo a migration that only ran **locally**: either reset as above (with the file moved out of `server/migrations`), or drop what it created and remove it from the log:

```powershell
npx wrangler d1 execute cleaning-db --local --command "DELETE FROM d1_migrations WHERE name = '000X_name.sql'"
```

Always run these from the **project root**. Running `wrangler` from inside `server/` or `web/` creates a second `.wrangler` folder there, with a separate database the app doesn't use.

## Testing login without Google

Create an account with email and password on the login page. For a second test user, use a private window.

Log everyone out (deletes all local sessions):

```powershell
npx wrangler d1 execute cleaning-db --local --command "DELETE FROM sessions"
```

Check who you are: open `/api/auth/me`.

## Git: working on a branch

`main` deploys automatically, so new work happens on a branch:

```powershell
git switch -c name-of-the-change      # a new branch
git add .
git commit -m "Message"
git push -u origin name-of-the-change # the first push of a branch (later: just git push)
```

Then on GitHub, open a **pull request** into `main`. The checks run on it. When they're green, **Merge**, and the deploy starts.

Back to `main` afterwards, with the merged changes:

```powershell
git switch main
git pull
git branch -d name-of-the-change      # delete the local branch
```

Other useful commands:

```powershell
git status                     # what changed
git diff                       # see the changes line by line
git restore path\to\file       # undo uncommitted changes to a file
git rm -r --cached folder      # stop tracking something that should be ignored
git commit --allow-empty -m "Trigger deploy"   # start the workflow without changes
```

## Before opening a pull request

The same checks CI runs. Stop at the first one that fails:

```powershell
npm run format
npx prettier --check .
npm --prefix web run lint
npm run typecheck
npm --prefix web run build
npm run test -- --run
git status                                              # everything committed, no .dev.vars
Get-ChildItem web\src -Recurse -File | Select-String -Pattern "Test crash|console.log\("
```

The last one finds leftovers from testing. `console.error` and `console.warn` are fine.

## Deploy

**Merging into `main` deploys.** GitHub Actions (`.github/workflows/ci.yml`) runs two jobs:

1. **check**: formatting, lint, typecheck, build and tests. It runs on every push and every pull request.
2. **deploy**: only for `main`, only after `check` passes. It applies new migrations to the real database, then builds and deploys.

Watch it in the repo's **Actions** tab. To retry a failed deploy: open the run → **Re-run jobs → Re-run failed jobs**.

**Any migration in `server/migrations` runs online as soon as it's merged.** Keep unfinished migrations out of the folder.

Never edit a migration that has been applied with `--remote`. Create a new one instead.

### Manual deploy (fallback)

If GitHub Actions is down, or for an urgent fix:

```powershell
npx wrangler d1 migrations list cleaning-db --remote    # what's pending online
npx wrangler d1 migrations apply cleaning-db --remote   # only when there are new migrations, right before deploying
npm run deploy                                          # build and deploy
```

## When something goes wrong online

```powershell
npx wrangler tail --config web/dist/cleaning_scheduler/wrangler.json       # live logs of the deployed app
npx wrangler rollback --config web/dist/cleaning_scheduler/wrangler.json   # put the previous version back
npx wrangler d1 time-travel info cleaning-db                               # database restore points (backups)
```

Rollback only undoes the **code**. It doesn't undo migrations: the database stays as it is. The next merge into `main` deploys again over a rollback.

## Secrets

**On Cloudflare** (the app's own secrets). Set once, or when they change. Paste the value at the prompt, never on the command line:

```powershell
npx wrangler login
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret list --config web/dist/cleaning_scheduler/wrangler.json   # check what's set
```

**On GitHub** (for the automatic deploy), in the repo: Settings → Secrets and variables → Actions:

- `CLOUDFLARE_API_TOKEN`: an **Account API token** (Cloudflare → Manage Account → Account API Tokens), with the "Edit Cloudflare Workers" policy plus **D1: Edit**, limited to this account. It expires after a year: renew it (Roll) and update the GitHub secret.
- `CLOUDFLARE_ACCOUNT_ID`: the account's ID (`npx wrangler whoami`).

Check an account token (in PowerShell, never paste it anywhere else):

```powershell
$token = Read-Host "Paste the token"
$account = Read-Host "Paste the Account ID"
curl.exe "https://api.cloudflare.com/client/v4/accounts/$account/tokens/verify" -H "Authorization: Bearer $token"
```

It should answer `"status":"active"`. Close the window afterwards.

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
- `\"` doesn't escape a quote in PowerShell. Put a pattern that contains double quotes in single quotes: `-Pattern 'a|"b"'`.
- Use `curl.exe`, not `curl`: in Windows PowerShell, `curl` is a different command with other options.
