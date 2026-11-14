# Cleaning Scheduler

[![CI](https://github.com/miiree12lb/cleaning-scheduler/actions/workflows/ci.yml/badge.svg)](https://github.com/miiree12lb/cleaning-scheduler/actions/workflows/ci.yml)

Weekly chores, shared fairly. A web app for shared houses: tasks rotate between housemates every Monday, everyone ticks off what they did, and the house keeps its rules in one place.

**Live:** [cleaning-scheduler.miiree12lb.workers.dev](https://cleaning-scheduler.miiree12lb.workers.dev)

## Features

- **Houses and members.** Create a house, invite people with a link, and manage roles. A house always keeps at least one admin, and a person can be in several houses.
- **A fair weekly rotation.** Every Monday the tasks move to the next person. It works with more tasks than people (some get two) and more people than tasks (someone rests).
- **A calendar.** This week, past weeks with who did what, and a preview of the coming weeks. Tasks can still be marked done the week after, and show as late.
- **Changes during the week.** A new task goes to whoever has the fewest. Someone leaving hands their unfinished tasks on. Nobody's existing tasks change unexpectedly.
- **House rules in sections.** Admins organise rules into sections (General, Dishwasher, Washing machine…). Sections can ask everyone "Do you use this?".
- **Login with Google or with email and password.**
- **Works on phones**, in light and dark mode, with loading skeletons, error states with "Try again", and keyboard and screen reader support.

## Tech stack

| Part         | Choice                                                                |
| ------------ | --------------------------------------------------------------------- |
| Hosting      | Cloudflare Workers with static assets, one deployment for app and API |
| Database     | Cloudflare D1 (SQLite), with versioned migrations                     |
| API          | [Hono](https://hono.dev) on the Worker, in TypeScript                 |
| Frontend     | React, React Router and Vite, in TypeScript                           |
| Shared types | One `shared/` folder used by both the API and the frontend            |
| Tests        | Vitest                                                                |

## How it works

### The rotation

Members are ordered by `rotation_order`. In week `w`, task `i` goes to the member at position `(i + w) mod n`. Weeks are counted in the house's own time zone and stored as the date of their Monday (`YYYY-MM-DD`).

The current week and past weeks are **stored**, one row per task per week, so history stays correct when people or tasks change later. Future weeks are **calculated** on the fly, and shown clearly as previews.

### Security

- **Sessions** live in D1. The cookie holds a random token, and the database only stores its SHA-256 hash, so a leaked table can't be used to log in. Users can log out on all their devices at once.
- **Passwords** are hashed with PBKDF2 (SHA-256, 100,000 iterations, a random salt per password) and compared in constant time. Login answers the same way, and takes the same time, whether or not an email has an account.
- **Every request for a house checks membership** on the server, and every query is filtered by that house. D1 has no row-level security, so the Worker plays that role.
- **Rate limiting** on login, sign-up and joining (per IP), plus a general limit on the whole API, and **quotas** so one account can't fill the database.
- **SQL** always uses bound parameters. **Security headers** on every response, no CORS, `SameSite` cookies, and redirects after login only to paths inside the app.

### Database lessons

- D1 can't turn foreign keys off, and dropping a table fires every `ON DELETE CASCADE`. So a table that others point to (like `users`) is **never rebuilt**: changes are made around it instead.
- Rules that must hold even when two requests arrive at once ("at least one admin", "no duplicates") are enforced **inside the SQL**, with conditional updates and partial unique indexes, not with a check-then-write in code.

More of the reasoning behind these choices is in [DECISIONS.md](DECISIONS.md).

## Project structure

```
server/            the Worker: Hono routes, helpers, and D1 migrations
  routes/          one file per area: auth, houses, members, tasks, weeks, rules
  lib/             sessions, passwords, rate limiting, validation, the rotation
  types/           types used only by the server (like the Hono app setup)
  migrations/      numbered SQL migrations
  index.ts         the entry point: middleware and routes
web/               the React app (Vite)
  public/          static files served as they are (favicon, _headers)
  src/pages/       one folder per page
  src/utils/       shared components and hooks
shared/            types used by both sides
test/              Vitest tests
```

## Running it locally

You need Node.js 20 or newer (developed with Node 24).

```bash
npm install
npm --prefix web install
```

Create a file **`.dev.vars`** in the project root (it's git-ignored):

```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

The Google values come from an OAuth client in Google Cloud, with `http://localhost:5173/api/auth/callback` as a redirect URI. Without them, you can still create an account with email and password. `DEV_LOGIN=true` turns on `/api/auth/dev-login/:userId` for quick testing; never set it in production.

Then set up the local database and start the app:

```bash
npm run db:migrate:local
npm run dev
```

The app runs on [http://localhost:5173](http://localhost:5173).

### Other commands

```bash
npm run typecheck        # type-check the server
npx vitest run           # run the tests
npm run format           # format with Prettier
npm --prefix web run build
```

More are in [COMMANDS.md](COMMANDS.md).

## Deploying

```bash
npx wrangler d1 migrations apply cleaning-db --remote   # only when there are new migrations
npx wrangler secret put GOOGLE_CLIENT_SECRET            # once
npm run deploy
```

## Privacy

The app stores only what it needs to run, and uses no analytics or tracking. See the in-app [privacy policy](https://cleaning-scheduler.miiree12lb.workers.dev/privacy).
