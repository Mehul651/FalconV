CREATE TYPE "KpiSource" AS ENUM ('CALCULATED', 'IMPORTED', 'MANUAL');
CREATE TYPE "ApprovalRecordStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');
CREATE TYPE "ImportKind" AS ENUM ('KPI', 'EXPENDITURE');
CREATE TYPE "ImportBatchStatus" AS ENUM ('UPLOADED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

CREATE TABLE "KpiDefinition" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "source" "KpiSource" NOT NULL,
    "formula" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KpiDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KpiRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "value" DECIMAL(18,4) NOT NULL,
    "status" "ApprovalRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "source" "KpiSource" NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "importBatchId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KpiRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" "ImportKind" NOT NULL,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'UPLOADED',
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportLine" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "code" TEXT,
    "period" TEXT,
    "amount" DECIMAL(18,4),
    "currency" CHAR(3),
    "occurredOn" TIMESTAMP(3),
    "projectNumber" TEXT,
    "notes" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "status" "ApprovalRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "departmentId" TEXT,
    "projectId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExpenditureEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "occurredOn" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ApprovalRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "budgetId" TEXT,
    "projectId" TEXT,
    "departmentId" TEXT,
    "importBatchId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExpenditureEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KpiDefinition_organizationId_code_key" ON "KpiDefinition"("organizationId", "code");
CREATE INDEX "KpiRecord_organizationId_status_idx" ON "KpiRecord"("organizationId", "status");
CREATE INDEX "KpiRecord_definitionId_period_status_idx" ON "KpiRecord"("definitionId", "period", "status");
CREATE INDEX "ImportBatch_organizationId_status_idx" ON "ImportBatch"("organizationId", "status");
CREATE INDEX "ImportLine_batchId_idx" ON "ImportLine"("batchId");
CREATE INDEX "Budget_organizationId_fiscalYear_status_idx" ON "Budget"("organizationId", "fiscalYear", "status");
CREATE INDEX "ExpenditureEntry_organizationId_status_idx" ON "ExpenditureEntry"("organizationId", "status");
CREATE INDEX "ExpenditureEntry_budgetId_status_idx" ON "ExpenditureEntry"("budgetId", "status");
CREATE INDEX "ExpenditureEntry_projectId_idx" ON "ExpenditureEntry"("projectId");

ALTER TABLE "KpiDefinition" ADD CONSTRAINT "KpiDefinition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KpiRecord" ADD CONSTRAINT "KpiRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KpiRecord" ADD CONSTRAINT "KpiRecord_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "KpiDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KpiRecord" ADD CONSTRAINT "KpiRecord_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KpiRecord" ADD CONSTRAINT "KpiRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ImportLine" ADD CONSTRAINT "ImportLine_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExpenditureEntry" ADD CONSTRAINT "ExpenditureEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExpenditureEntry" ADD CONSTRAINT "ExpenditureEntry_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExpenditureEntry" ADD CONSTRAINT "ExpenditureEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExpenditureEntry" ADD CONSTRAINT "ExpenditureEntry_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExpenditureEntry" ADD CONSTRAINT "ExpenditureEntry_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExpenditureEntry" ADD CONSTRAINT "ExpenditureEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
