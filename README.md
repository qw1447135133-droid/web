# Signal Nine Sports MVP

Sports data platform MVP built with `Next.js 16`, `React 19`, `Tailwind 4`, Prisma, and SQLite.

## Delivery plan

Follow the execution baseline in [docs/development-schedule.md](./docs/development-schedule.md).

## Current scope

- Homepage and core product shell
- Football live scores
- Basketball live scores
- Cricket live entry page
- Database page for football and basketball
- Match detail page
- AI predictions page
- Plans and paid content flow
- Member center
- Admin console

## Scope baseline

- Football and basketball remain the phase-one core for data depth, database views, and operator workflows.
- Cricket is now part of the product baseline, but the first shipped slice is the live board and localized fallback dataset.
- Follow-up cricket work will expand into schedule/results depth, statistics, content, and admin operations in later phases.

## Local development

```bash
pnpm install
pnpm db:generate
pnpm db:init
pnpm dev
```

Open `http://localhost:3000`.

## Scripts

```bash
pnpm dev
pnpm build
pnpm lint
pnpm db:generate
pnpm db:init
pnpm db:push
```

`db:init` and `db:push` both bootstrap the local SQLite schema through `scripts/init-db.mjs`. This avoids the Prisma schema-engine instability we hit on Windows while still using the Prisma client at runtime.

## Environment

Add this value to `.env`:

```bash
DATABASE_URL="file:./dev.db"
```

## Sports data modes

### 1. Nowscore scrape + database mode

Football and basketball use the current `nowscore` scrape/provider flow with local persistence and fallback handling. These routes are wired into the scrape or synced database path:

- `/`
- `/live/football`
- `/live/basketball`
- `/database`
- `/matches/[id]`
- `/api/admin/sync`

### 2. Localized fallback mode

Cricket currently ships through a localized mock/fallback dataset so the product can expose a stable third-sport entry without depending on a new provider yet:

- `/live/cricket`

## Demo flow

1. Visit `/login`
2. Log in as member or admin
3. Purchase a membership on `/member`
4. Unlock a paid plan on `/plans`
5. Check the admin console on `/admin`

## Notes

- Auth, sessions, membership orders, and content orders are persisted in local SQLite.
- Football and basketball data are scrape-backed and can also be read from the synced local database.
- Cricket is currently a staged rollout and remains fallback-backed in this phase.
- Paid plans, author rankings, and AI recommendation cards are still partly mock-backed while the backend content system continues to deepen.
