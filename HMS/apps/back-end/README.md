# NexaCare — Backend API

Express 5 + TypeScript REST API for the NexaCare hospital management system. It
owns authentication (Better Auth), role-based access control, business logic,
validation and persistence (PostgreSQL via Drizzle ORM).

## Stack

- **Runtime** — Bun
- **Framework** — Express 5
- **Auth** — Better Auth (email/password, httpOnly session cookies, Drizzle adapter)
- **Database** — PostgreSQL + Drizzle ORM + drizzle-kit migrations
- **Validation** — Zod (bodies, queries, params, environment)

## Getting started

```bash
bun install
cp .env.example .env   # or create .env (see schema in src/config/env.ts)
bun run db:push        # push schema directly (dev) — or db:migrate
bun run db:seed        # roles + admin account (+ demo doctor/receptionist with --sample)
bun run dev            # start API on http://localhost:3001
```

## Environment variables

See `src/config/env.ts` for the full validated schema. Minimum set:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/nexacare
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3001
CORS_ORIGINS=http://localhost:5173,https://nexa-care-sooty.vercel.app
PORT=3001
```

## Scripts

| Script             | What it does                                        |
| ------------------ | --------------------------------------------------- |
| `bun run dev`      | Start the API with watch mode                       |
| `bun run start`    | Start the API                                       |
| `bun run build`    | Bundle `index.ts` into `dist/` (Bun target)         |
| `bun run serve`    | Run the production bundle                           |
| `bun run db:generate` | Generate a new migration from schema changes     |
| `bun run db:migrate`  | Apply pending migrations                          |
| `bun run db:push`  | Push the schema directly to the database (dev only) |
| `bun run db:studio`   | Open the Drizzle Studio GUI                        |
| `bun run db:drop`  | Drop migrations/database objects                    |
| `bun run db:seed`  | Seed roles + accounts (+ sample data with `--sample`) |
| `bun run format`   | Format all files with Biome                          |
| `bun run lint`     | Lint all files with Biome                            |
| `bun run check`    | Format + lint, applying fixes                        |

### Database workflow

After adding or modifying a table in `src/database/schema/`:

```bash
bun run db:generate    # 1. diff schema → new SQL migration in ./drizzle
bun run db:migrate     # 2. apply it to the database
# or, for quick local iteration:
bun run db:push
# inspect data / verify relationships:
bun run db:studio
```

## Formatting & linting (Biome)

This app is managed with **Bun** and uses [Biome](https://biomejs.dev) for formatting, linting and import organization.

```bash
bun run format   # format all files
bun run lint     # lint all files
bun run check    # format + lint, applying fixes
```

See the root [README](../../README.md) for the recommended `biome.json` configuration.

## ER diagram

Interactive entity-relationship diagram for the NexaCare database:

**[https://dbdiagram.io/d/TibebHub-db-6977a0d3bd82f5fce2a78cd2](https://dbdiagram.io/d/TibebHub-db-6977a0d3bd82f5fce2a78cd2)**

Tables: `users`, `roles`, `sessions`, `accounts`, `verifications`, `patients`,
`doctors`, `appointments`, `medical_records`, `bills`, `audit_logs`.

## API documentation

The API ships an interactive **Swagger UI** reference, generated with `swagger-jsdoc`
from an OpenAPI 3.1 spec. Shared schemas, enums, parameters and envelopes live in
`src/config/swagger.ts`; each operation is documented next to the code that serves
it as an `@openapi` JSDoc block in `src/routes/**` (and `src/docs/**` for handlers
mounted by a third party, e.g. Better Auth).

- **Local (dev)** — http://localhost:3001/docs
- **Deployed** — https://nexacare-xppe.onrender.com/docs
- **Raw JSON spec** — http://localhost:3001/docs.json (and
  `https://nexacare-xppe.onrender.com/docs.json`) — useful for client/SDK
  generation and CI validation.

Every route is covered: authentication, users, doctors, patients, appointments
(including the `check-in`/`start`/`complete`/`cancel`/`no-show` transitions),
medical records (including report uploads), billing (`pay`, `void`), audit logs,
the dashboard and static report files. Sign-in sets an `HttpOnly` session cookie —
use the "Authorize" padlock (or `fetch(..., { credentials: 'include' })`) to call
the protected endpoints from the UI.

## API surface

- `POST /api/auth/sign-in/email` · `POST /api/auth/sign-out` · `GET /api/auth/get-session`
- `/api/users` · `/api/doctors` · `/api/patients`
- `/api/appointments` — CRUD + transitions (`check-in`, `start`, `complete`, `no-show`, `cancel`)
- `/api/medical-records` — CRUD + report uploads (`/api/medical-records/:id/report`)
- `/api/bills` — list + `POST /api/bills/:id/pay`
- `/api/audit-logs` · `/api/dashboard`

Lists return `{ data, meta }` (pagination, `limit` max 100); errors return
`{ error: { code, message, details } }`. Every mutation is written to the audit log.
