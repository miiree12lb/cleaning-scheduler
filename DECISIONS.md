# Decisions

Choices made while designing the cleaning scheduler, and why. Update this when a decision changes.

## Stack

- **Cloudflare Workers with static assets + D1**, in one repository and one deployment. Cloudflare recommends Workers over Pages for new projects.
- **`server/`** holds the Worker (TypeScript) and the D1 migrations (`server/migrations`). **`web/`** holds the frontend (React + Vite + TypeScript).
- **TypeScript on both sides**, so types for API data can be shared (`shared/` folder, imported with `import type`).
- **React Router** for pages, so the Worker serves the app in single-page-application mode. `/api/*` always goes to the Worker first (`run_worker_first`).
- Pages: `/` (this week), `/calendar`, `/dishwasher`, `/rules`.

## Accounts and houses

- **Sign in with Google.** No passwords stored. Users are identified by their Google ID, not their email (emails can change).
- **Sessions are stored in D1** (random session ID in a cookie, expiry date in the database). Logging out deletes the session row.
- A user can belong to **several houses**.
- Each member is an **admin** or a **member**. Admins can change other members' roles, edit the rules and manage tasks.
- **A house must always have at least one admin.** The Worker refuses to remove, demote or let leave the last admin.
- Only admins can remove people.
- People join a house **by invite link/code** or **by an admin inviting their email**. Email invites are shown to the person when they next log in (the app doesn't send emails). Invite links come first; email invites right after.
- **Every API request for a house checks that the user is a member of that house.** This is the most important security check.
- **The last member can't leave a house.** They have to delete the house instead, so a house's history is never deleted as a side effect.

## Tasks and the weekly rotation

- Tasks belong to a house and are shared by everyone in it.
- There can be **more tasks than people** (some get two) or **more people than tasks** (someone rests).
- **Weeks start on Monday**, in the house's timezone (default `Europe/Berlin`). A week is stored as the date of its Monday (`YYYY-MM-DD`), with no time.
- **Monday rotation:** members are sorted by `rotation_order`. In week `w`, task `i` goes to the member at position `(i + w) mod n`. Extra tasks and rest weeks move around fairly.
- All tasks count as **equal effort** for now. Task weights could be added later.
- **Assignments are stored**, one row per task per week, so the calendar history stays correct when people or tasks change. `done_at` empty means not done.
- **Past weeks and the current week are stored.** Future weeks are **previews**, calculated from the current members and tasks, and never stored.
- Previews must be **unmistakable** in the UI: labeled "Preview", visually different, with no "done" checkboxes, and a note that they change when members or tasks change.

### Changes during the week (option B)

Changes apply immediately, but only touch what they have to. Nobody's existing task changes unexpectedly. The full rotation runs again each Monday.

| Change | What happens this week |
|---|---|
| Task archived | This week's assignment is removed, unless it's already done |
| Member joins | Joins the rotation from next Monday (and shows up in next week's preview right away) |
| Member leaves | Their unfinished tasks go to whoever has the fewest |
|| Task added | Assigned now, to the member with the fewest tasks this week (including someone who joined this week) |
| Every Monday | Full rotation with the formula |

Ties for "fewest tasks" go to the member with the lowest `rotation_order`.

### Removing tasks

- Tasks are **archived** (`active = 0`), not deleted, so past weeks keep their history.
- A task that was **never assigned** can be deleted for real.
- Task names are unique per house. Creating a task with the name of an archived one offers to **restore** it instead.

## Dishwasher

- Each member sets whether they **use the dishwasher** (per house).
- Everyone who uses it is responsible for emptying it. No turns, for now. A turn log can be added later if needed.
- The dishwasher has its own rules, stored with the house rules (`kind = 'dishwasher'`).

## Rules

- House rules and dishwasher rules live in one table, told apart by `kind`, and ordered by `position`.
- Only admins can edit them.

## Database conventions

- IDs are `INTEGER PRIMARY KEY` (auto-assigned). Session IDs are random `TEXT`.
- Timestamps (`created_at`, `done_at`, ...) are stored in **UTC** and converted to local time for display.
- True/false columns are `INTEGER` 0 or 1, with a `CHECK`.
- Rules that span several tables (last admin, membership checks) are enforced **in the Worker**, with clear error messages.
- Once a migration has been applied anywhere except your local database, **never edit it**. Add a new migration instead.

## Later

- Shopping list
- Shared expenses
- Optional: task weights, dishwasher turns, letting admins reorder the rotation
- Someone who **joins mid-week** gets no tasks until next Monday. They appear in next week's preview right away.