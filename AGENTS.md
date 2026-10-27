# FalconV agent instructions

FalconV is an enterprise business operations platform. Work in small, reviewable increments. Do not present incomplete or mocked behavior as production-ready.

## Stack

- Monorepo: pnpm workspaces + Turborepo
- Web: `apps/web` Next.js App Router
- API: `apps/api` NestJS REST
- DB: `packages/db` Prisma + PostgreSQL
- Shared contracts: `packages/shared`
- Auth: Better Auth (sessions, httpOnly cookies) mounted on NestJS
- Authorization: FalconV RBAC tables and Nest guards — never trust the UI alone

## Rules

1. Inspect existing code before changing it.
2. Business APIs live under `/api/v1`. Auth lives under `/api/auth`. The Next.js app rewrites `/api/*` to NestJS.
3. Next.js must not import Prisma or talk to the database.
4. Enforce permissions on the API. Resource checks belong in services.
5. User statuses: `INVITED`, `PENDING_APPROVAL`, `ACTIVE`, `REJECTED`, `DISABLED`. Only `ACTIVE` users may use operational modules.
6. Database changes require Prisma migrations.
7. Use UTC timestamps. Monetary values use decimal + ISO currency.
8. Pending KPI/expenditure imports must never change approved totals (Phase 4).
9. Label demo/seeded data. Do not invent dashboard numbers.
10. After a task: what changed, how to test, what remains.

Detailed specifications: `docs/`. Architecture: `docs/ARCHITECTURE.md`. Decisions: `docs/DECISIONS.md`.
