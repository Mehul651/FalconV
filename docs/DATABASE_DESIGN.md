# Database design

PostgreSQL with Prisma migrations. UUID primary keys on FalconV tables. Better Auth user/session/account/verification tables use string IDs. All timestamps are UTC.

## Phase 1 tables

- Better Auth: `user`, `session`, `account`, `verification`
- `Organization` (seeded `falconv`, default currency `USD`)
- `Department`
- `UserProfile` (status: INVITED | PENDING_APPROVAL | ACTIVE | REJECTED | DISABLED)
- `Role`, `Permission`, `RolePermission`, `UserRole`
- `UserInvite`
- `Notification`
- `AuditLog` (no update/delete APIs)

Tenant rows include `organizationId`. Soft-delete (`deletedAt`) applies to master data, not audit logs.

## Phase 2 tables

- `Client`, `Contact`, `ClientActivity`
- `ServiceRequest`, `ServiceRequestEvent`

## Phase 3 tables

- `Project`, `ProjectMember`, `ProjectMilestone`
- `Task`, `TaskComment`
- `Issue`
- `EngineeringDocument`, `DocumentVersion` (files on local disk until MinIO)

## Phase 4 tables

- `KpiDefinition`, `KpiRecord` (approved rows only count toward published totals)
- `ImportBatch`, `ImportLine` (preview until approved)
- `Budget`, `ExpenditureEntry`

## Phase 5 tables

- `Risk` (OPEN → MITIGATING → CLOSED; optional project and owner)
- `CorrectiveAction` (OPEN → IN_PROGRESS → VERIFIED; optional linked risk)

## Later modules

None remaining in the original product roadmap besides production hardening.

## Money

Store amounts as decimal and currency as ISO 4217 `CHAR(3)`. Never use floating point for money.
