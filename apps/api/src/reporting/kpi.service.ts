import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createKpiDefinitionSchema, createKpiRecordSchema, isApprovedStatus } from '@falconv/shared';
import { AuditService } from '../audit/audit.service';
import type { AuthContext } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

const CALCULATED_CODES = {
  ACTIVE_PROJECTS: 'ACTIVE_PROJECTS',
  OPEN_ISSUES: 'OPEN_ISSUES',
  TASK_COMPLETION_PCT: 'TASK_COMPLETION_PCT',
  OPEN_SERVICE_REQUESTS: 'OPEN_SERVICE_REQUESTS',
} as const;

@Injectable()
export class KpiService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async snapshot(user: AuthContext) {
    const [definitions, records, calculated] = await Promise.all([
      this.prisma.client.kpiDefinition.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { code: 'asc' },
      }),
      this.prisma.client.kpiRecord.findMany({
        where: { organizationId: user.organizationId },
        include: { definition: { select: { code: true, name: true, unit: true } } },
        orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
      }),
      this.calculated(user.organizationId),
    ]);
    const approved = records.filter((row) => isApprovedStatus(row.status));
    const pending = records.filter((row) => row.status === 'PENDING_APPROVAL' || row.status === 'DRAFT');
    return {
      definitions,
      calculated,
      approvedRecords: approved,
      pendingRecords: pending,
      pendingExcludedFromTotals: pending.length,
    };
  }

  async calculated(organizationId: string) {
    const [activeProjects, openIssues, tasks, openRequests] = await Promise.all([
      this.prisma.client.project.count({
        where: {
          organizationId,
          deletedAt: null,
          status: { in: ['PLANNED', 'ACTIVE', 'ON_HOLD', 'AT_RISK'] },
        },
      }),
      this.prisma.client.issue.count({
        where: { organizationId, deletedAt: null, status: { not: 'CLOSED' } },
      }),
      this.prisma.client.task.groupBy({
        by: ['status'],
        where: { deletedAt: null, project: { organizationId, deletedAt: null } },
        _count: { _all: true },
      }),
      this.prisma.client.serviceRequest.count({
        where: {
          organizationId,
          deletedAt: null,
          status: { notIn: ['REJECTED', 'PROJECT_CREATED'] },
        },
      }),
    ]);
    const taskTotal = tasks.reduce((sum, row) => sum + row._count._all, 0);
    const taskDone = tasks.find((row) => row.status === 'DONE')?._count._all ?? 0;
    return [
      {
        code: CALCULATED_CODES.ACTIVE_PROJECTS,
        name: 'Active projects',
        unit: 'count',
        value: activeProjects,
        source: 'CALCULATED' as const,
        formula: 'Count of projects in PLANNED, ACTIVE, ON_HOLD, or AT_RISK',
      },
      {
        code: CALCULATED_CODES.OPEN_ISSUES,
        name: 'Open issues',
        unit: 'count',
        value: openIssues,
        source: 'CALCULATED' as const,
        formula: 'Count of issues not CLOSED',
      },
      {
        code: CALCULATED_CODES.TASK_COMPLETION_PCT,
        name: 'Task completion',
        unit: '%',
        value: taskTotal === 0 ? 0 : Number(((taskDone / taskTotal) * 100).toFixed(2)),
        source: 'CALCULATED' as const,
        formula: 'DONE tasks / all tasks × 100',
      },
      {
        code: CALCULATED_CODES.OPEN_SERVICE_REQUESTS,
        name: 'Open service requests',
        unit: 'count',
        value: openRequests,
        source: 'CALCULATED' as const,
        formula: 'Requests not REJECTED or PROJECT_CREATED',
      },
    ];
  }

  async createDefinition(user: AuthContext, input: unknown, ip?: string) {
    const data = createKpiDefinitionSchema.parse(input);
    if (data.source === 'CALCULATED') {
      throw new BadRequestException('Calculated KPIs are defined by the system from live operations data');
    }
    const created = await this.prisma.client.kpiDefinition.create({
      data: {
        organizationId: user.organizationId,
        code: data.code,
        name: data.name,
        description: data.description,
        unit: data.unit,
        source: data.source,
        formula: data.formula,
      },
    });
    await this.audit.record({
      organizationId: user.organizationId,
      actorProfileId: user.profileId,
      action: 'kpi.definition_created',
      resourceType: 'KpiDefinition',
      resourceId: created.id,
      metadata: { code: created.code },
      ipAddress: ip,
    });
    return created;
  }

  async createRecord(user: AuthContext, input: unknown, ip?: string) {
    const data = createKpiRecordSchema.parse(input);
    const definition = await this.prisma.client.kpiDefinition.findFirst({
      where: { id: data.definitionId, organizationId: user.organizationId },
    });
    if (!definition) {
      throw new NotFoundException('KPI definition not found');
    }
    if (definition.source === 'CALCULATED') {
      throw new BadRequestException('Calculated KPIs cannot be entered manually');
    }
    const created = await this.prisma.client.kpiRecord.create({
      data: {
        organizationId: user.organizationId,
        definitionId: definition.id,
        period: data.period,
        value: data.value,
        notes: data.notes,
        status: 'DRAFT',
        source: 'MANUAL',
        createdById: user.profileId,
      },
    });
    await this.audit.record({
      organizationId: user.organizationId,
      actorProfileId: user.profileId,
      action: 'kpi.record_drafted',
      resourceType: 'KpiRecord',
      resourceId: created.id,
      metadata: { period: data.period },
      ipAddress: ip,
    });
    return created;
  }

  async submitRecord(user: AuthContext, id: string) {
    const record = await this.prisma.client.kpiRecord.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!record) {
      throw new NotFoundException('KPI record not found');
    }
    if (record.status !== 'DRAFT') {
      throw new BadRequestException('Only draft records can be submitted');
    }
    return this.prisma.client.kpiRecord.update({
      where: { id },
      data: { status: 'PENDING_APPROVAL' },
    });
  }

  async decideRecord(user: AuthContext, id: string, approve: boolean, ip?: string) {
    const record = await this.prisma.client.kpiRecord.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!record) {
      throw new NotFoundException('KPI record not found');
    }
    if (record.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Record is not pending approval');
    }
    const status = approve ? 'APPROVED' : 'REJECTED';
    if (approve) {
      await this.prisma.client.kpiRecord.updateMany({
        where: {
          definitionId: record.definitionId,
          period: record.period,
          status: 'APPROVED',
          id: { not: id },
        },
        data: { status: 'REJECTED', notes: 'Superseded by a later approved record' },
      });
    }
    const updated = await this.prisma.client.kpiRecord.update({
      where: { id },
      data: { status },
    });
    await this.audit.record({
      organizationId: user.organizationId,
      actorProfileId: user.profileId,
      action: approve ? 'kpi.record_approved' : 'kpi.record_rejected',
      resourceType: 'KpiRecord',
      resourceId: id,
      ipAddress: ip,
    });
    return updated;
  }
}
