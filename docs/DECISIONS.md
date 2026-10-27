# Architecture decisions

## ADR 001 — Modular monolith

Accepted. One NestJS API with domain modules. Split only if operational need appears.

## ADR 002 — Better Auth on NestJS + Next rewrite

Accepted. Identity and cookies are first-class on the API. Next.js proxies `/api/*` for same-origin cookies.

## ADR 003 — FalconV RBAC separate from Better Auth

Accepted. Role names are not sufficient. Permissions and resource checks live in FalconV tables.

## ADR 004 — Schema-ready single organization

Accepted. Seed one `Organization` and put `organizationId` on tenant tables. No org switcher yet.

## ADR 005 — Dual onboarding

Accepted. Admins can invite users. People can also self-register; access stays pending until an admin assigns a role.

## ADR 006 — Default currency USD

Accepted for seed data. Every money row will still store an ISO currency code.

## ADR 007 — shadcn in apps/web

Accepted. Extract a UI package only if a second client appears.

## ADR 008 — Better Auth Express mount

The community Nest adapter (`@thallesp/nestjs-better-auth` v2) requires Node.js 22+ and ships ESM-only. This workspace runs Node 20. Phase 1 mounts Better Auth with `toNodeHandler` from `better-auth/node` and uses a FalconV `SessionAuthGuard` for profile status and permissions. The Nest adapter can be reconsidered when the runtime is Node 22+.
