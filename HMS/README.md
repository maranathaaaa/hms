# NexaCare — Hospital Management System

A full-stack hospital management console for managing **users & roles, patients, doctors, appointments, medical records, billing and audit logs** — with role-based access control and a responsive web UI.

Built as a **Bun monorepo** with two apps: an Express + Postgres REST API and a React SPA.

---

## Tech stack

| Layer     | Tools                                                                   |
| --------- | ----------------------------------------------------------------------- |
| Runtime   | [Bun](https://bun.com)                                                  |
| Backend   | Express 5 · TypeScript · Zod · [Better Auth](https://better-auth.com)   |
| Database  | PostgreSQL · [Drizzle ORM](https://orm.drizzle.team) · `drizzle-kit`    |
| Frontend  | React 19 · Vite · TypeScript · Tailwind CSS 4                           |
| FE State  | TanStack Router · TanStack Query · React Hook Form · Sonner (toasts)    |
| Security  | Helmet · CORS · rate limiting · HPP · cookie sessions · RBAC            |

---

## Repository structure

```
HMS/
├── apps/
│   ├── back-end/              Express REST API + Better Auth + Drizzle
│   │   ├── index.ts           Server bootstrap (middleware, routes, static)
│   │   ├── drizzle/           Generated SQL migrations (drizzle-kit)
│   │   ├── uploads/           Uploaded medical report files
│   │   └── src/
│   │       ├── auth/          Better Auth setup (Drizzle adapter, roles)
│   │       ├── config/        Env validation, DB pool/client, OpenAPI spec (swagger.ts)
│   │       ├── constants/     Roles, permissions, statuses, pagination
│   │       ├── database/
│   │       │   ├── schema/    Drizzle table + relation definitions
│   │       │   └── seed/      Seeder (roles, demo accounts, data)
│   │       ├── docs/          OpenAPI JSDoc for non-Express handlers (auth, uploads)
│   │       ├── lib/           Errors, logger, audit-log writer
│   │       ├── middleware/    Auth (RBAC), validation, errors, upload
│   │       ├── routes/        Express routers (1 per resource) + per-route @openapi docs
│   │       ├── services/      Business logic (appointments, billing, …)
│   │       ├── utils/         Shared helpers (actor, param ids)
│   │       └── validators/    Zod schemas for every request body/query
│   └── front-end/             React SPA
│       ├── vite.config.ts     Dev proxy: /api + /uploads → :3001
│       └── src/
│           ├── router.tsx     Typed routes (TanStack Router)
│           ├── pages/         One file per route (dashboard, reports, …)
│           ├── components/
│           │   ├── ui/        Design-system primitives (table, modal, …)
│           │   ├── layout/    AppShell (role-based nav), global search
│           │   └── appointments/  Shared form + reschedule modals
│           └── lib/           api client, auth-client, date/status helpers
├── index.ts                   Original requirements/spec (reference)
└── package.json               Workspace root
```

> `apps/front-end/src/features`, `services`, `store`, `hooks` are leftover scaffolding and are **not imported** by the app — the live UI lives in `src/pages`, `src/components` and `src/lib`.

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for diagrams, the auth flow, request lifecycle and how the two apps interact.

---

## Getting started

Requirements: **Bun ≥ 1.3**, a **PostgreSQL** database.

### 1. Configure the backend

```bash
cd apps/back-end
cp .env.example .env      # if present; otherwise create .env (see below)
```

Minimal `.env`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/nexacare
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3001
CORS_ORIGINS=http://localhost:5173
PORT=3001
```

### 2. Install, migrate and seed

```bash
bun install              # at the workspace root
cd apps/back-end
bunx drizzle-kit push    # or: bunx drizzle-kit migrate
bun run src/database/seed/index.ts   # roles + demo accounts + sample data
```

### 3. Run both apps

```bash
# Terminal 1 — API on :3001
cd apps/back-end && bun run dev

# Terminal 2 — SPA on :5173 (proxies /api + /uploads to the API)
cd apps/front-end && bun run dev
```

Open **http://localhost:5173**.

---

## Demo accounts

| Role         | Email                      | Password                  |
| ------------ | -------------------------- | ------------------------- |
| Admin        | `admin@hospital.local`     | `AdminPassw0rd!2026`      |
| Doctor       | `dr.owen@hospital.local`   | `DoctorPassw0rd!2026`     |
| Receptionist | `frontdesk@hospital.local` | `FrontDeskPassw0rd!2026`  |

> The seeded admin email/password can be overridden with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

---

## API documentation

The backend ships an interactive **Swagger UI** reference (OpenAPI 3.1) covering the
whole API surface — authentication, users, doctors, patients, appointments, medical
records, billing, audit logs, dashboard and file uploads.

- **Local (dev)** — http://localhost:3001/docs
- **Deployed** — https://nexacare-xppe.onrender.com/docs
- **Raw JSON spec** — http://localhost:3001/docs.json (and
  `https://nexacare-xppe.onrender.com/docs.json`)

Shared components are defined in `apps/back-end/src/config/swagger.ts`, with
per-route `@openapi` blocks alongside each handler in `apps/back-end/src/routes/**`
and `apps/back-end/src/docs/**`.

---

## Useful commands

| Command                          | Where            | Purpose                               |
| -------------------------------- | ---------------- | ------------------------------------- |
| `bun run dev`                    | `apps/back-end`  | Start API with watch                  |
| `bun run dev`                    | `apps/front-end` | Start Vite dev server                 |
| `bun run build`                  | `apps/front-end` | Typecheck (`tsc -b`) + production build |
| `pnpm lint`                      | `apps/front-end` | Biome lint                           |
| `bunx drizzle-kit generate`      | `apps/back-end`  | Generate a migration from schema      |
| `bunx drizzle-kit migrate`       | `apps/back-end`  | Apply migrations                      |
| `bunx drizzle-kit push`          | `apps/back-end`  | Push schema directly (dev)            |
| `bun run src/database/seed/index.ts` | `apps/back-end` | Seed roles, accounts and sample data |

---

## Formatting & linting (Biome)

Both apps use [Biome](https://biomejs.dev) for formatting, linting and import organization.

### Frontend (pnpm)

```bash
cd apps/front-end
pnpm format   # format all files
pnpm lint     # lint all files
pnpm check    # format + lint, applying fixes
```

### Backend (Bun)

```bash
cd apps/back-end
bun run format
bun run lint
bun run check
```

Recommended `biome.json` (place it in each app root):

```json
{
  "$schema": "https://biomejs.dev/schemas/latest/schema.json",
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "organizeImports": {
    "enabled": true
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "semicolons": "always",
      "trailingCommas": "all"
    }
  }
}
```

---

## Feature overview

- **Auth & RBAC** — email/password sign-in, session cookies, per-request role resolution. Roles: `SUPER_ADMIN`, `ADMIN`, `DOCTOR`, `RECEPTIONIST`, `ACCOUNTANT`, `PATIENT`.
- **Patients & doctors** — CRUD, search, pagination, status toggles.
- **Appointments** — scheduling with date/time validation, no double-booking, a state machine (`SCHEDULED → CHECKED_IN → IN_PROGRESS → COMPLETED`, plus `CANCELLED`/`NO_SHOW`), rescheduling, and a calendar UI (day/week/month).
- **Medical records** — per-patient records with diagnosis/prescription/treatment plan and PDF report uploads.
- **Billing** — bills auto-created on appointment completion, payments, status tracking, refunds/cancellation.
- **Dashboards & reports** — role-specific dashboards and an admin reports page (status distributions, revenue by month).
- **Audit logs** — every mutating operation is recorded with actor, action, target and IP.
