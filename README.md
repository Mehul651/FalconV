# FalconV

Enterprise unified business operations platform. Phase 1 delivers the monorepo foundation, authentication, RBAC kernel, and application shell.

Clients, delivery, KPI reporting, Excel import, expenditure, executive dashboard, risks, and CAPA are implemented. Document and import files are stored locally until MinIO is wired. Pending KPI/expenditure imports never change approved totals. The executive dashboard uses the same approved-only rule.

## Local setup

Requirements: Node.js 20+, pnpm 9, and Docker Desktop (Postgres, Redis, MinIO). Transactional email uses Gmail SMTP configured in `.env`.

Without a reachable PostgreSQL instance the web and API still start, but `/api/health` reports `database: down` and login cannot persist sessions until migrate has been run against the database in `DATABASE_URL`.

```bash
cp .env.example .env
pnpm install
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Set `BETTER_AUTH_SECRET`, `DATABASE_URL`, `SMTP_*`, and `ADMIN_NOTIFY_EMAIL` in `.env` before seeding or sending mail. FalconV does not create a default administrator. `pnpm db:seed` only creates a Super Admin when none exists and `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` are set.

- Web: http://localhost:3000
- API health: http://localhost:3001/api/health
- Swagger: http://localhost:3001/api/docs

```bash
pnpm lint
pnpm check-types
pnpm test
```

## Onboarding

Users can be invited (email from the configured Gmail SMTP sender) or can self-register. Self-registered accounts stay `PENDING_APPROVAL` until an administrator assigns a role in **Administration**. Super Admin cannot be assigned through invite or approval.

## Documentation

See `docs/` for architecture, database design, modules, API, security, and the development roadmap.
