# Architecture

## Shape

FalconV is a **modular monolith**.

- `apps/web` — Next.js App Router UI
- `apps/api` — NestJS REST API, OpenAPI, authorization
- `packages/db` — Prisma schema and client
- `packages/shared` — permission codes, enums, Zod contracts

The browser only talks to the Next.js origin. Next.js rewrites `/api/*` to NestJS (`API_URL`, default `http://127.0.0.1:3001`).

```
Browser → Next.js :3000 → rewrite /api/* → NestJS :3001 → PostgreSQL
                                         → Better Auth (/api/auth)
                                         → Gmail SMTP (falconv.notify@gmail.com)
```

## AuthN / AuthZ

- Better Auth owns passwords and sessions (httpOnly cookies, Prisma store).
- FalconV `UserProfile`, `Role`, `Permission`, `UserRole` own authorization.
- Nest `SessionAuthGuard` loads the session, profile, and permissions on every protected route.
- Public self-registration creates `PENDING_APPROVAL` profiles with no business roles.
- Invites pre-assign a role; accepting the invite creates an `ACTIVE` user.

## Module ownership

Each Nest domain module owns writes for its aggregates. Other modules read through services. Audit logs are append-only.

## Files and jobs

Object storage (MinIO locally) and Redis/BullMQ are provisioned in Docker Compose. Documents currently write to local disk. Background import jobs are not implemented.
