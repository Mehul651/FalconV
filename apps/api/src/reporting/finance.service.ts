import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  createBudgetSchema,
  createExpenditureSchema,
  isApprovedStatus,
  sumApprovedValues,
} from '@falconv/shared';
import { AuditService } from '../audit/audit.service';
import type { AuthContext } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinanceService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async snapshot(user: AuthContext) {
    const [budgets, entries] = await Promise.all([
      this.prisma.client.budget.findMany({
        where: { organizationId: user.organizationId, deletedAt: null },
        include: { project: { select: { projectNumber: true, name: true } } },
        orderBy: { fiscalYear: 'desc' },
      }),
      this.prisma.client.expenditureEntry.findMany({
        where: { organizationId: user.organizationId },
        include: {
          project: { select: { projectNumber: true, name: true } },
          budget: { select: { name: true } },
        },
        orderBy: { occurredOn: 'desc' },
      }),
    ]);
    const approvedEntries = entries.filter((row) => isApprovedStatus(row.status));
    const pendingEntries = entries.filter(
      (row) => row.status === 'PENDING_APPROVAL' || row.status === 'DRAFT',
    );
    const approvedSpend = sumApprovedValues(
      entries.map((row) => ({ status: row.status, value: Number(row.amount) })),
    );
    const approvedBudget = sumApprovedValues(
      budgets.map((row) => ({ status: row.status, value: Number(row.amount) })),
    );
    return {
      budgets: budgets.map((budget) => ({
        ...budget,
        spentApproved: approvedEntries
          .filter((entry) => entry.budgetId === budget.id)
          .reduce((sum, entry) => sum + Number(entry.amount), 0),
      })),
      approvedEntries,
      pendingEntries,
      totals: {
        approvedBudget,
        approvedSpend,
        pendingSpendExcluded: pendingEntries.reduce((sum, row) => sum + Number(row.amount), 0),
      },
    };
  }

  async createBudget(user: AuthContext, input: unknown, ip?: string) {
    const data = createBudgetSchema.parse(input);
    const created = await this.prisma.client.budget.create({
      data: {
        organizationId: user.organizationId,
        name: data.name,
        fiscalYear: data.fiscalYear,
        amount: data.amount,
        currency: data.currency ?? 'USD',
        departmentId: data.departmentId,
        projectId: data.projectId,
        status: 'DRAFT',
        createdById: user.profileId,
      },
    });
    await this.audit.record({
      organizationId: user.organizationId,
      actorProfileId: user.profileId,
      action: 'budget.drafted',
      resourceType: 'Budget',
      resourceId: created.id,
      ipAddress: ip,
    });
    return created;
  }

  async decideBudget(user: AuthContext, id: string, approve: boolean, ip?: string) {
    const budget = await this.prisma.client.budget.findFirst({
      where: { id, organizationId: user.organizationId, deletedAt: null },
    });
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    if (budget.status === 'APPROVED' && approve) {
      return budget;
    }
    const updated = await this.prisma.client.budget.update({
      where: { id },
      data: { status: approve ? 'APPROVED' : 'REJECTED' },
    });
    await this.audit.record({
      organizationId: user.organizationId,
      actorProfileId: user.profileId,
      action: approve ? 'budget.approved' : 'budget.rejected',
      resourceType: 'Budget',
      resourceId: id,
      ipAddress: ip,
    });
    return updated;
  }

  async createExpenditure(user: AuthContext, input: unknown, ip?: string) {
    const data = createExpenditureSchema.parse(input);
    const created = await this.prisma.client.expenditureEntry.create({
      data: {
        organizationId: user.organizationId,
        amount: data.amount,
        currency: data.currency ?? 'USD',
        occurredOn: new Date(data.occurredOn),
        category: data.category,
        description: data.description,
        budgetId: data.budgetId,
        projectId: data.projectId,
        departmentId: data.departmentId,
        status: 'DRAFT',
        createdById: user.profileId,
      },
    });
    await this.audit.record({
      organizationId: user.organizationId,
      actorProfileId: user.profileId,
      action: 'expenditure.drafted',
      resourceType: 'ExpenditureEntry',
      resourceId: created.id,
      ipAddress: ip,
    });
    return created;
  }

  async submitExpenditure(user: AuthContext, id: string) {
    const entry = await this.prisma.client.expenditureEntry.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!entry) {
      throw new NotFoundException('Expenditure not found');
    }
    if (entry.status !== 'DRAFT') {
      throw new BadRequestException('Only drafts can be submitted');
    }
    return this.prisma.client.expenditureEntry.update({
      where: { id },
      data: { status: 'PENDING_APPROVAL' },
    });
  }

  async decideExpenditure(user: AuthContext, id: string, approve: boolean, ip?: string) {
    const entry = await this.prisma.client.expenditureEntry.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!entry) {
      throw new NotFoundException('Expenditure not found');
    }
    if (entry.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Entry is not pending approval');
    }
    const updated = await this.prisma.client.expenditureEntry.update({
      where: { id },
      data: { status: approve ? 'APPROVED' : 'REJECTED' },
    });
    await this.audit.record({
      organizationId: user.organizationId,
      actorProfileId: user.profileId,
      action: approve ? 'expenditure.approved' : 'expenditure.rejected',
      resourceType: 'ExpenditureEntry',
      resourceId: id,
      ipAddress: ip,
    });
    return updated;
  }
}
