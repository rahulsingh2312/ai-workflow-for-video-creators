# AI workflow for video creators

One workspace that carries a topic to a fact-checked, versioned, locked script,
hands it to a human video team, prepares a manual publishing package, runs a
grounded assistant in Enterprise WeChat, surfaces sales leads, and feeds
performance data back into the next topic.

Built from a 10-page MVP product specification (`SPEC.md`). Every capability,
rule, state name and refusal in the code comes from that document.

## The thing that makes it different

It refuses to publish. There is no publish button, no scheduler, no simulated
click, no browser RPA, no private platform API. What it does instead is keep
the receipts: every claim maps to an approved source, every script version has
a parent, a locked version is immutable, and a publish package is bound to the
exact script and video it was built from.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

Sign in at `/en/login`. Seeded accounts, all with the password `throughline`:

| Email | Role | Can do |
| --- | --- | --- |
| `admin@example.com` | all six | walk the whole flow alone |
| `wu@example.com` | contributor | topics and drafts |
| `zhang@example.com` | reviewer | resolve flags, lock scripts |
| `lin@example.com` | producer | deliver the final video |
| `he@example.com` | publisher | packages, record the live URL |
| `sun@example.com` | support | conversations and leads |

## How it is built

**No external services.** The database is `node:sqlite`, built into Node 22.

- `lib/server/schema.sql` — 13 tables. A SQL trigger makes a locked
  `script_version` physically un-updatable; changing one creates a child.
- `lib/server/interlocking.ts` — the workflow engine. Each state transition's
  conditions are *SQL queries*, not booleans someone sets, so a blocked
  transition can say exactly which query failed and what it returned.
- `lib/server/agents.ts` — eight agent modules behind one output contract.
- `lib/server/gateway.ts` — the model gateway. Calls Claude when
  `ANTHROPIC_API_KEY` is set; otherwise a deterministic rules provider does the
  real work, so the whole flow is exercisable with no key.
- `app/api/[...path]/route.ts` — the REST API, with role checks and an audit
  event on every mutation.

Frontend is Next.js: a static bilingual marketing site under `app/[lang]/(site)`
and the workspace app under `app/[lang]/(app)`, driven entirely by the API.

## Checks

```bash
npm run build
npx tsc --noEmit
npx eslint .
bash scripts/api-test.sh      # full lifecycle over HTTP
node scripts/ui-flow.mjs      # the same flow driven through a real browser
```

## Deploying

Works as-is on any host with a writable disk (Fly, Railway, Render, a VPS).

On Vercel the filesystem is read-only apart from `/tmp`, so the database falls
back there: the app boots and demos correctly, but each cold start reseeds and
instances do not share state. For durable storage on serverless, point
`lib/server/db.ts` at Turso/libSQL or Postgres.

| Variable | Purpose |
| --- | --- |
| `TL_DB` | Database file path. Defaults to `./data`, or `/tmp` on serverless. |
| `TL_SECRET` | Session cookie signing key. Set this in production. |
| `ANTHROPIC_API_KEY` | Optional. Switches the model gateway to Claude. |
