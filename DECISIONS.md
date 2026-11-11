# Decisions

Choices made while designing the cleaning scheduler, and why. Update this when a decision changes.

## Stack

- **Cloudflare Workers with static assets + D1**, in one repository and one deployment. Cloudflare recommends Workers over Pages for new projects.
- **`server/`** holds the Worker (TypeScript, Hono) and the D1 migrations (`server/migrations`). **`web/`** holds the frontend (React + Vite + TypeScript).
- **TypeScript on both sides**, so types for API data are shared (`shared/` folder, imported with `import type`).
- **React Router** for pages. The Worker serves the app in single-page-application mode, and only `/api/*` runs the Worker first (`run_worker_first`). Pages, scripts and styles are served as static files, without the Worker.
- **Pages:**
    - `/login`, `/privacy`, `/terms`: open to everyone
    - `/` (my houses), `/houses/new`, `/join/:code`, `/account`: logged in
    - `/houses/:houseId`: the calendar (this week first), plus `tasks`, `rules` and `settings`

## Accounts and login

- **Two ways to log in: Google, or email and password.** Password login exists for people without a Google account.
- **One login method per email.** Signing up with a password using an email that already has a Google account is refused ("already uses Google login"), and the other way around. This prevents someone from taking over an account by signing up with another person's email.
- **Emails are unique regardless of capitals** (unique index `users_email_nocase`) and stored in lowercase.
- **Google users are identified by their Google ID**, not their email (emails can change). Name and email are updated from Google at each login.
- **`users.google_id` is `NOT NULL`**, so password users get a placeholder, `password:` followed by random characters. It can never match a real Google ID (those are numbers).
- **Passwords live in their own table**, `password_logins`, so hashes never show up in a query on `users` or in an API response by accident.
- **Password hashing:** PBKDF2 with SHA-256, 100,000 iterations (the maximum Workers allows), and a random 16-byte salt per password. The iterations are stored with each password, so the number can be raised later without breaking old ones. Hashes are compared in constant time.
- **Passwords:** at least 10 characters, at most 200, not trimmed. No rules about symbols (length matters more).
- **No email verification**, since the app can't send email yet. Nobody can join a house without an invite link anyway.
- **Login errors are the same for every failure** ("Wrong email or password"), and the hash always runs, even for an unknown email, so neither the message nor the response time reveals which emails have an account.
- **Sessions:** a random token in an `httpOnly`, `SameSite=Lax`, `Secure` cookie. The database only stores the token's **SHA-256 hash**, so a leaked `sessions` table can't be used to log in. Sessions last 30 days, logging out deletes the session, and expired sessions are deleted at each login.
- **Google login** uses a `state` cookie to check that the login started in the same browser, and a `returnTo` path (only paths starting with `/` and not `//`) to go back to an invite link after logging in.
- **Dev login** (`/api/auth/dev-login/:userId`) only exists when `DEV_LOGIN=true` in `.dev.vars`, for local testing. It must never be set in production. After each deploy, check that it answers "Not found".
- **Deleting an account** is refused if the person is the only admin of any house (they must hand over admin or delete the house first). Otherwise they leave all their houses, their unfinished tasks this week go to their housemates, and their past activity stays as "Former member".
- **No password reset yet.** For now an admin of a shared house helps, or the account is recreated. A reset link by email needs our own domain (see Later).

## Houses and members

- A user can belong to **several houses**.
- Each member is an **admin** or a **member**. Admins manage roles, tasks, rules, the invite link and the house itself.
- **A house must always have at least one admin.** Removing, demoting or letting the last admin leave is refused. The check is inside the `UPDATE` itself, so two admins demoting each other at the same moment can't leave a house without one.
- Only admins can remove people. Anyone can leave, except the last admin.
- **The last member can't leave a house.** They have to delete the house instead, so a house's history is never deleted as a side effect.
- **People join by invite link.** Only admins see the code, and they can replace it (the old link stops working). Someone who isn't logged in logs in or signs up first, and comes back to the invite.
- **Deleting a house** is for admins only, and needs the house's name typed exactly, plus a confirmation. Everything in the house is deleted with it.
- Every new house gets a **General** rule section.
- **Every API request for a house checks that the user is a member of that house** (`requireMember`), and every query is filtered by that house's ID. This is the most important security check.

## Tasks and the weekly rotation

- Tasks belong to a house and are shared by everyone in it. They have their **own page**, where admins add, edit, archive and restore them, and members see the active ones.
- There can be **more tasks than people** (some get two) or **more people than tasks** (someone rests).
- **Weeks start on Monday**, in the house's timezone (default `Europe/Berlin`). A week is stored as the date of its Monday (`YYYY-MM-DD`), with no time.
- **Monday rotation:** members are sorted by `rotation_order`. In week `w`, task `i` goes to the member at position `(i + w) mod n`. Extra tasks and rest weeks move around fairly.
- All tasks count as **equal effort** for now.
- **Assignments are stored**, one row per task per week, so the calendar history stays correct when people or tasks change. `done_at` empty means not done.
- **Past weeks and the current week are stored.** Future weeks are **previews**, calculated from the current members and tasks, and never stored.
- Previews must be **unmistakable** in the UI: labeled "Preview", visually different, with no "done" checkboxes, and a note that they change when members or tasks change.
- **The calendar opens on this week.** There's no separate "This week" page.

### Marking tasks as done

- Tasks can be marked done **this week and last week**. Older weeks are read-only.
- A task done after its week ended shows a **"Late"** badge.
- The calendar shows **who** marked a task as done.
- **Only the person who marked a task can unmark it.**

### Changes during the week (option B)

Changes apply immediately, but only touch what they have to. Nobody's existing task changes unexpectedly. The full rotation runs again each Monday.

| Change                 | What happens this week                                                               |
| ---------------------- | ------------------------------------------------------------------------------------ |
| Task added or restored | Assigned now, to the member with the fewest tasks this week                          |
| Task archived          | This week's assignment is removed, unless it's already done                          |
| Member joins           | Joins the rotation from next Monday (and shows up in next week's preview right away) |
| Member leaves          | Their unfinished tasks go to whoever has the fewest                                  |
| Every Monday           | Full rotation with the formula                                                       |

Ties for "fewest tasks" go to the member with the lowest `rotation_order`.

### Removing tasks

- Tasks are **archived** (`active = 0`), not deleted, so past weeks keep their history.
- A task that was **never assigned** can be deleted for real.
- Task names are unique per house. Creating a task with the name of an archived one offers to **restore** it instead.

## Rules

- Rules are grouped in **sections** (General, Dishwasher, Washing machine…), which admins create, rename, reorder and delete. Rules inside a section are ordered by `position`.
- **Section names are unique per house. Rules are unique per section** (not per house), so the same rule can appear in, for example, Washing machine and Dryer. Both checks ignore capitals.
- **Opt-in sections** ask everyone "Do you use this?" (for things like the dishwasher). Admins turn this on per section, and every member answers for themselves. Turning it off forgets the answers. Only current members are listed.
- **Only admins edit sections and rules.** Every member can answer "I use this".
- There's **no separate Dishwasher page** anymore. A Dishwasher section isn't created by default; admins add it if the house needs it.

## Security

- **SQL:** every query uses `prepare(...).bind(...)`. Values are never put into the SQL text.
- **The database isn't reachable from the internet.** Only the Worker (through the `DB` binding) and our Cloudflare account can run queries. D1 has no row-level security, so the Worker plays that role (`requireAuth`, `requireMember`, `requireAdmin`, and `house_id = ?` in every query). Protect the Cloudflare, GitHub and Google accounts with two-factor authentication.
- **Rate limiting** (Cloudflare's Workers rate limiter, per IP, per minute):

    | Limiter        | Limit | Where                                                       |
    | -------------- | ----- | ----------------------------------------------------------- |
    | `AUTH_LIMITER` | 10    | Google login and callback, password login, sign-up          |
    | `JOIN_LIMITER` | 10    | Joining a house (stops guessing invite codes)               |
    | `API_LIMITER`  | 300   | All of `/api/*` (generous, because housemates share one IP) |

- **Quotas** (`server/lib/limits.ts`), so one account can't fill the database:

    | What                                          | Max |
    | --------------------------------------------- | --- |
    | Houses per user (created or joined)           | 10  |
    | Members per house                             | 20  |
    | Active tasks per house (adding and restoring) | 50  |
    | Rule sections per house                       | 20  |
    | Rules per section                             | 50  |

    Quotas count first and insert after, so two requests at the same moment could go one over. That's fine for quotas. Rules that must be exact (at least one admin, no duplicates) are enforced inside the SQL itself.

- **Security headers:** Hono's `secureHeaders()` for the API, and `web/public/_headers` for the pages (no framing, `nosniff`, a referrer policy, a minimal CSP).
- **No CORS**, so other sites can't read the API. Together with `SameSite=Lax` cookies, that also stops other sites from making requests with someone's session. **`GET` routes never change anything.**
- **Secrets** (`GOOGLE_CLIENT_SECRET`) are in `.dev.vars` locally (never committed) and set with `wrangler secret put` in production. They're never logged.
- `/api/health` only says whether the app and database answer. It doesn't reveal anything like the number of users.

## Privacy and legal

- The app is run from the Netherlands and is open to anyone, so the **GDPR** applies. The Dutch authority is the Autoriteit Persoonsgegevens.
- **Privacy policy** at `/privacy`, **terms of use** at `/terms`, both linked under the login form and set in the Google OAuth consent screen.
- **Collect only what's needed.** No analytics, no tracking, no ads.
- **Only strictly necessary cookies** (session, Google login state), so no cookie banner.
- **Whenever the app stores something new, update the privacy policy** (and its date).
- No Impressum needed in the Netherlands for a free, non-commercial app.

## Database conventions

- IDs are `INTEGER PRIMARY KEY` (auto-assigned). Session IDs are the SHA-256 hash of the cookie token.
- Timestamps (`created_at`, `done_at`, ...) are stored in **UTC** and converted to local time for display.
- True/false columns are `INTEGER` 0 or 1, with a `CHECK`.
- Rules that span several tables (last admin, membership checks) are enforced **in the Worker**, with clear error messages. When two requests at the same moment could break a rule, the condition goes **inside the `UPDATE` or `INSERT`** (or a unique index), so the database decides who's first.
- **Partial unique indexes** (`... WHERE ...`) make something unique only among some rows, for example "not twice on the shopping list" while the same item can be bought many times.
- Once a migration has been applied anywhere except your local database, **never edit it**. Add a new migration instead.
- **Never rebuild a table that other tables reference** (like `users` or `houses`). Dropping it deletes all its rows first, which fires every `ON DELETE CASCADE` and wipes the related data. D1 can't turn foreign keys off, and `PRAGMA defer_foreign_keys` doesn't stop cascades. Rebuilding is only safe for tables nothing points at (like `rules`).
- When a user is deleted, things they did in a house keep their history: references to them become empty, shown as "Former member".

## Later

- **Shopping list** (designed, migration `0005_shopping_list.sql` written, server not built yet): one shared list per house, open to every member. One row per time something needs buying, so every purchase stays as history. "Add again" creates a new row. Bought items stay visible for 14 days. Only the person who ticked an item can undo it. A partial unique index stops duplicates on the list. Quota: 200 items on the list.
- **Shared expenses**, linked to bought shopping items through a separate table (one expense can cover several items).
- **Password reset:** an admin can set a temporary password; by email once we have a domain.
- **Own domain:** nicer URL, email sending (password reset, email invites), Cloudflare's WAF rules. Remember to add the new callback URL in Google Cloud.
- **Email invites**, shown to the person when they next log in.
- House switcher in the navbar; renaming a house; showing who's resting this week.
- Tasks page: descriptions, upcoming rotation and history.
- A React error boundary, loading states, reminders (Cron).
- A demo account for the portfolio, reset every night.
- If abuse appears: Turnstile on sign-up, and a per-email login limiter.
- Optional: task weights, letting admins reorder the rotation.
