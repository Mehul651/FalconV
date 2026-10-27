import { Inject, Injectable } from '@nestjs/common';
import { SERVICE_REQUEST_STATUS_LABELS } from '@falconv/shared';
import type { AuthContext } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';
import { KpiService } from '../reporting/kpi.service';
import { dashboardApprovedFinance, lastNUtcWeekStarts } from './dashboard-totals';

const INTAKE_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'TRIAGE',
  'FEASIBILITY',
  'PENDING_APPROVAL',
  'RETURNED_FOR_REVISION',
  'APPROVED',
] as const;
const CSM_ROLES = new Set(['csm', 'executive']);
const ENGINEERING_ROLES = new Set([
  'engineer',
  'engineering_lead',
  'quality_reviewer',
  'project_manager',
  'department_manager',
]);
const PRIORITY_SCORE: Record<string, number> = { CRITICAL: 50, HIGH: 30, MEDIUM: 10, LOW: 0 };

const PIPELINE: Array<{ key: string; label: string; statuses: string[] }> = [
  { key: 'submitted', label: 'Submitted', statuses: ['SUBMITTED', 'UNDER_REVIEW'] },
  { key: 'triage', label: 'Triage', statuses: ['TRIAGE', 'FEASIBILITY'] },
  { key: 'approval', label: 'Pending approval', statuses: ['PENDING_APPROVAL'] },
  { key: 'approved', label: 'Approved', statuses: ['APPROVED'] },
  { key: 'won', label: 'Project created', statuses: ['PROJECT_CREATED'] },
];

@Injectable()
export class DashboardService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(KpiService) private readonly kpi: KpiService,
  ) {}

  async snapshot(user: AuthContext) {
    const organizationId = user.organizationId;
    const isClient = user.roles.includes('client_user');
    const clientId = isClient ? (user.clientId ?? '__none__') : undefined;
    const clientFilter = clientId ? { clientId } : {};
    const projectFilter = { organizationId, deletedAt: null as Date | null, ...clientFilter };
    const weekStarts = lastNUtcWeekStarts(12);
    const rangeStart = new Date(`${weekStarts[0]}T00:00:00.000Z`);
    const year = new Date().getUTCFullYear();
    const fyStart = new Date(Date.UTC(year, 0, 1));
    const prevFyStart = new Date(Date.UTC(year - 1, 0, 1));
    const prevFyEnd = new Date(Date.UTC(year, 0, 1));

    const [
      calculated,
      kpiRecords,
      budgets,
      expenditures,
      clientCount,
      requestGroups,
      taskGroups,
      projectGroups,
      openIssues,
      openRisks,
      openCapa,
      overdueTasks,
      clients,
      requestRows,
      approvedSpendRows,
    ] = await Promise.all([
      isClient ? Promise.resolve([]) : this.kpi.calculated(organizationId),
      this.prisma.client.kpiRecord.findMany({
        where: { organizationId, status: 'APPROVED' },
        include: { definition: { select: { code: true, name: true, unit: true } } },
        orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
        take: 20,
      }),
      this.prisma.client.budget.findMany({
        where: { organizationId, deletedAt: null, ...(clientId ? { project: clientFilter } : {}) },
        select: { status: true, amount: true },
      }),
      this.prisma.client.expenditureEntry.findMany({
        where: { organizationId, ...(clientId ? { project: clientFilter } : {}) },
        select: { status: true, amount: true, occurredOn: true, category: true },
      }),
      this.prisma.client.client.count({
        where: { organizationId, deletedAt: null, ...(clientId ? { id: clientId } : {}) },
      }),
      this.prisma.client.serviceRequest.groupBy({
        by: ['status'],
        where: { organizationId, deletedAt: null, ...clientFilter },
        _count: { _all: true },
      }),
      this.prisma.client.task.groupBy({
        by: ['status'],
        where: { deletedAt: null, project: projectFilter },
        _count: { _all: true },
      }),
      this.prisma.client.project.groupBy({
        by: ['status'],
        where: projectFilter,
        _count: { _all: true },
      }),
      this.prisma.client.issue.count({
        where: { organizationId, deletedAt: null, status: { not: 'CLOSED' }, project: projectFilter },
      }),
      this.prisma.client.risk.count({
        where: { organizationId, deletedAt: null, status: { not: 'CLOSED' }, ...(clientId ? { project: clientFilter } : {}) },
      }),
      this.prisma.client.correctiveAction.count({
        where: { organizationId, deletedAt: null, status: { not: 'VERIFIED' }, ...(clientId ? { project: clientFilter } : {}) },
      }),
      this.prisma.client.task.count({
        where: {
          deletedAt: null,
          status: { not: 'DONE' },
          dueDate: { lt: new Date() },
          project: projectFilter,
        },
      }),
      this.prisma.client.client.findMany({
        where: { organizationId, deletedAt: null, ...(clientId ? { id: clientId } : {}) },
        select: {
          id: true,
          name: true,
          status: true,
          notes: true,
          activities: { orderBy: { createdAt: 'desc' }, take: 1, select: { summary: true, createdAt: true } },
          projects: { where: { deletedAt: null }, select: { status: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 8,
      }),
      this.prisma.client.serviceRequest.findMany({
        where: { organizationId, deletedAt: null, submittedAt: { gte: rangeStart }, ...clientFilter },
        select: { submittedAt: true },
      }),
      this.prisma.client.expenditureEntry.findMany({
        where: {
          organizationId,
          status: 'APPROVED',
          ...(clientId ? { project: clientFilter } : {}),
        },
        select: {
          amount: true,
          occurredOn: true,
          category: true,
          project: { select: { client: { select: { id: true, name: true } } } },
        },
      }),
    ]);

    const finance = dashboardApprovedFinance({
      budgets: budgets.map((row) => ({ status: row.status, amount: Number(row.amount) })),
      expenditures: expenditures.map((row) => ({ status: row.status, amount: Number(row.amount) })),
    });
    const pendingKpiExcluded = isClient
      ? 0
      : await this.prisma.client.kpiRecord.count({
          where: { organizationId, status: { in: ['DRAFT', 'PENDING_APPROVAL'] } },
        });

    const requestsByStatus = Object.fromEntries(
      requestGroups.map((row) => [row.status, row._count._all]),
    ) as Record<string, number>;
    const tasksByStatus = Object.fromEntries(taskGroups.map((row) => [row.status, row._count._all]));
    const projectsByStatus = Object.fromEntries(projectGroups.map((row) => [row.status, row._count._all]));
    const openTasks = taskGroups.filter((row) => row.status !== 'DONE').reduce((sum, row) => sum + row._count._all, 0);
    const taskTotal = taskGroups.reduce((sum, row) => sum + row._count._all, 0);
    const taskDone = tasksByStatus['DONE'] ?? 0;
    const taskCompletionPct = taskTotal === 0 ? 0 : Number(((taskDone / taskTotal) * 100).toFixed(2));

    const spendByWeek = new Map(weekStarts.map((week) => [week, 0]));
    const requestsByWeek = new Map(weekStarts.map((week) => [week, 0]));
    for (const row of approvedSpendRows) {
      const week = startOfUtcIsoWeekKey(row.occurredOn);
      if (spendByWeek.has(week)) {
        spendByWeek.set(week, (spendByWeek.get(week) ?? 0) + Number(row.amount));
      }
    }
    for (const row of requestRows) {
      const week = startOfUtcIsoWeekKey(row.submittedAt);
      if (requestsByWeek.has(week)) {
        requestsByWeek.set(week, (requestsByWeek.get(week) ?? 0) + 1);
      }
    }

    const spendByClient = new Map<string, { name: string; amount: number }>();
    const spendByCategory = new Map<string, number>();
    let fytdSpend = 0;
    let priorFySpend = 0;
    for (const row of approvedSpendRows) {
      const amount = Number(row.amount);
      const client = row.project?.client;
      const key = client?.id ?? 'unassigned';
      const name = client?.name ?? 'Unassigned (no project)';
      spendByClient.set(key, { name, amount: (spendByClient.get(key)?.amount ?? 0) + amount });
      spendByCategory.set(row.category, (spendByCategory.get(row.category) ?? 0) + amount);
      if (row.occurredOn >= fyStart) fytdSpend += amount;
      if (row.occurredOn >= prevFyStart && row.occurredOn < prevFyEnd) priorFySpend += amount;
    }

    const depletion = [...spendByClient.values()].sort((a, b) => b.amount - a.amount).slice(0, 8);
    const categoryRows = [...spendByCategory.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);

    const pipeline = PIPELINE.map((stage) => ({
      key: stage.key,
      label: stage.label,
      count: stage.statuses.reduce((sum, status) => sum + (requestsByStatus[status] ?? 0), 0),
    }));

    const onPath = (projectsByStatus['PLANNED'] ?? 0) + (projectsByStatus['ACTIVE'] ?? 0);
    const offPath = (projectsByStatus['AT_RISK'] ?? 0) + (projectsByStatus['ON_HOLD'] ?? 0);
    const atClosure = projectsByStatus['COMPLETED'] ?? 0;
    const projectTotal = onPath + offPath + atClosure + (projectsByStatus['CANCELLED'] ?? 0);

    const weekStarts4 = lastNUtcWeekStarts(4);
    const spendByWeek4 = new Map(weekStarts4.map((week) => [week, 0]));
    const fySpendByClient = new Map<string, { id: string; name: string; amount: number }>();
    let unassignedFySpend = 0;
    for (const row of approvedSpendRows) {
      const amount = Number(row.amount);
      const week = startOfUtcIsoWeekKey(row.occurredOn);
      if (spendByWeek4.has(week)) {
        spendByWeek4.set(week, (spendByWeek4.get(week) ?? 0) + amount);
      }
      if (row.occurredOn >= fyStart) {
        const client = row.project?.client;
        if (!client) {
          unassignedFySpend += amount;
          continue;
        }
        fySpendByClient.set(client.id, {
          id: client.id,
          name: client.name,
          amount: (fySpendByClient.get(client.id)?.amount ?? 0) + amount,
        });
      }
    }

    const assigneeSelect = {
      select: {
        user: { select: { name: true } },
        roles: { select: { role: { select: { code: true } } } },
      },
    } as const;

    const [
      org,
      activeClients,
      prospectClients,
      majorTasks,
      majorIssues,
      majorRisks,
      attentionProjects,
      majorRequests,
    ] = await Promise.all([
        this.prisma.client.organization.findUnique({
          where: { id: organizationId },
          select: { defaultCurrency: true },
        }),
        this.prisma.client.client.findMany({
          where: { organizationId, deletedAt: null, status: 'ACTIVE', ...(clientId ? { id: clientId } : {}) },
          select: { id: true, name: true, category: true },
          orderBy: { name: 'asc' },
        }),
        this.prisma.client.client.findMany({
          where: { organizationId, deletedAt: null, status: 'PROSPECT', ...(clientId ? { id: clientId } : {}) },
          select: {
            id: true,
            name: true,
            createdAt: true,
            requests: {
              where: { deletedAt: null, status: { in: [...INTAKE_STATUSES] } },
              orderBy: { submittedAt: 'desc' },
              take: 1,
              select: { id: true, requestNumber: true, title: true, status: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.client.task.findMany({
          where: {
            deletedAt: null,
            status: { not: 'DONE' },
            project: projectFilter,
            OR: [
              { status: 'BLOCKED' },
              { priority: { in: ['HIGH', 'CRITICAL'] } },
              { dueDate: { lt: new Date() } },
            ],
          },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            assignee: assigneeSelect,
            project: { select: { name: true, client: { select: { name: true } } } },
          },
          orderBy: { updatedAt: 'desc' },
          take: 20,
        }),
        this.prisma.client.issue.findMany({
          where: {
            organizationId,
            deletedAt: null,
            status: { not: 'CLOSED' },
            project: projectFilter,
            OR: [{ severity: { in: ['HIGH', 'CRITICAL'] } }, { priority: { in: ['HIGH', 'CRITICAL'] } }],
          },
          select: {
            id: true,
            title: true,
            status: true,
            severity: true,
            priority: true,
            assignee: assigneeSelect,
            project: { select: { name: true, client: { select: { name: true } } } },
          },
          orderBy: { updatedAt: 'desc' },
          take: 20,
        }),
        this.prisma.client.risk.findMany({
          where: {
            organizationId,
            deletedAt: null,
            status: { not: 'CLOSED' },
            ...(clientId ? { project: clientFilter } : {}),
          },
          select: {
            id: true,
            title: true,
            status: true,
            likelihood: true,
            owner: assigneeSelect,
            project: { select: { name: true, client: { select: { name: true } } } },
          },
          orderBy: { updatedAt: 'desc' },
          take: 10,
        }),
        this.prisma.client.project.findMany({
          where: { ...projectFilter, status: { in: ['AT_RISK', 'ON_HOLD'] } },
          select: { id: true, name: true, status: true, client: { select: { name: true } } },
          take: 10,
        }),
        this.prisma.client.serviceRequest.findMany({
          where: {
            organizationId,
            deletedAt: null,
            ...clientFilter,
            status: { in: [...INTAKE_STATUSES] },
            OR: [
              { priority: { in: ['HIGH', 'CRITICAL'] } },
              { status: { in: ['PENDING_APPROVAL', 'RETURNED_FOR_REVISION'] } },
            ],
          },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            requestNumber: true,
            client: { select: { name: true } },
            assignedReviewer: assigneeSelect,
          },
          orderBy: { submittedAt: 'desc' },
          take: 15,
        }),
      ]);

    const briefing = {
      currency: org?.defaultCurrency ?? 'USD',
      activeClients,
      weekSpend: weekStarts4.map((week) => ({
        week,
        approvedSpend: spendByWeek4.get(week) ?? 0,
      })),
      topClients: [...fySpendByClient.values()]
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5),
      unassignedFySpend,
      onboarding: prospectClients.map((client) => {
        const request = client.requests[0];
        return {
          id: client.id,
          name: client.name,
          since: client.createdAt,
          requestId: request?.id ?? null,
          requestNumber: request?.requestNumber ?? null,
          requestTitle: request?.title ?? null,
          stage: request
            ? (SERVICE_REQUEST_STATUS_LABELS[
                request.status as keyof typeof SERVICE_REQUEST_STATUS_LABELS
              ] ?? request.status)
            : 'Prospect — no service request yet',
        };
      }),
      majorActions: buildMajorActions({
        tasks: majorTasks,
        issues: majorIssues,
        risks: majorRisks,
        projects: attentionProjects,
        requests: majorRequests,
      }),
    };

    return {
      demo: process.env.DEMO_DATA === 'true',
      generatedAt: new Date().toISOString(),
      fiscalYear: year,
      calculated,
      approvedKpiRecords: kpiRecords,
      pendingKpiExcluded,
      finance: {
        ...finance,
        fytdSpend,
        priorFySpend,
        remainingBudget: finance.approvedBudget - finance.approvedSpend,
      },
      operations: {
        clientCount,
        openTasks,
        openIssues,
        openRisks,
        openCapa,
        overdueTasks,
        requestsByStatus,
        tasksByStatus,
        projectsByStatus,
      },
      momentum: weekStarts.map((week) => ({
        week,
        approvedSpend: spendByWeek.get(week) ?? 0,
        requestsOpened: requestsByWeek.get(week) ?? 0,
      })),
      clientPulse: clients.map((client) => {
        const latest = client.activities[0];
        const risky = client.projects.some((project) => project.status === 'AT_RISK' || project.status === 'ON_HOLD');
        return {
          id: client.id,
          name: client.name,
          status: client.status,
          note: latest?.summary ?? client.notes ?? 'No activity recorded yet',
          at: latest?.createdAt ?? null,
          attention: risky,
        };
      }),
      depletion,
      pipeline,
      actionBoard: [
        { key: 'inProgress', label: 'Work in progress', value: tasksByStatus['IN_PROGRESS'] ?? 0, href: '/tasks' },
        { key: 'inReview', label: 'In review', value: tasksByStatus['IN_REVIEW'] ?? 0, href: '/tasks' },
        { key: 'blocked', label: 'Blocked', value: tasksByStatus['BLOCKED'] ?? 0, href: '/tasks' },
        { key: 'overdue', label: 'Overdue tasks', value: overdueTasks, href: '/tasks' },
        { key: 'onHold', label: 'Projects on hold', value: projectsByStatus['ON_HOLD'] ?? 0, href: '/projects' },
        { key: 'atRisk', label: 'Projects at risk', value: projectsByStatus['AT_RISK'] ?? 0, href: '/projects' },
        { key: 'openIssues', label: 'Open issues', value: openIssues, href: '/issues' },
        { key: 'openRisks', label: 'Open risks', value: openRisks, href: '/risks' },
      ],
      spendCategories: categoryRows,
      clientHealth: {
        onPath,
        offPath,
        atClosure,
        projectTotal,
        taskCompletionPct,
        clientsWithAttention: clients.filter((client) =>
          client.projects.some((project) => project.status === 'AT_RISK' || project.status === 'ON_HOLD'),
        ).length,
      },
      recommendations: buildRecommendations({
        openRisks,
        openCapa,
        overdueTasks,
        pendingSpend: finance.pendingSpendExcluded,
        pendingKpi: pendingKpiExcluded,
        offPath,
        rejected: requestsByStatus['REJECTED'] ?? 0,
      }),
      briefing,
    };
  }
}

function roleCodes(assignee: { roles: Array<{ role: { code: string } }> } | null | undefined) {
  return assignee?.roles.map((row) => row.role.code) ?? [];
}

function actionSide(codes: string[], fallback: 'csm' | 'engineering'): 'csm' | 'engineering' {
  const csm = codes.some((code) => CSM_ROLES.has(code));
  const engineering = codes.some((code) => ENGINEERING_ROLES.has(code));
  if (csm && !engineering) return 'csm';
  if (engineering && !csm) return 'engineering';
  return fallback;
}

function ownerLabel(assignee: { user: { name: string } } | null | undefined) {
  return assignee?.user.name ?? 'Unassigned';
}

function buildMajorActions(input: {
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: Date | null;
    assignee: { user: { name: string }; roles: Array<{ role: { code: string } }> } | null;
    project: { name: string; client: { name: string } | null };
  }>;
  issues: Array<{
    id: string;
    title: string;
    status: string;
    severity: string;
    priority: string;
    assignee: { user: { name: string }; roles: Array<{ role: { code: string } }> } | null;
    project: { name: string; client: { name: string } | null };
  }>;
  risks: Array<{
    id: string;
    title: string;
    status: string;
    likelihood: string;
    owner: { user: { name: string }; roles: Array<{ role: { code: string } }> } | null;
    project: { name: string; client: { name: string } | null } | null;
  }>;
  projects: Array<{
    id: string;
    name: string;
    status: string;
    client: { name: string } | null;
  }>;
  requests: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    requestNumber: string;
    client: { name: string } | null;
    assignedReviewer: { user: { name: string }; roles: Array<{ role: { code: string } }> } | null;
  }>;
}) {
  const now = Date.now();
  const items: Array<{
    id: string;
    side: 'csm' | 'engineering';
    kind: string;
    title: string;
    detail: string;
    href: string;
    score: number;
  }> = [];

  for (const task of input.tasks) {
    const overdue = Boolean(task.dueDate && task.dueDate.getTime() < now);
    const blocked = task.status === 'BLOCKED';
    items.push({
      id: `task-${task.id}`,
      side: actionSide(roleCodes(task.assignee), 'engineering'),
      kind: blocked ? 'Blocked task' : overdue ? 'Overdue task' : 'High-priority task',
      title: task.title,
      detail: `${task.project.client?.name ?? 'Client'} · ${ownerLabel(task.assignee)} · ${task.status.replaceAll('_', ' ')}`,
      href: '/tasks',
      score:
        (PRIORITY_SCORE[task.priority] ?? 0) + (blocked ? 25 : 0) + (overdue ? 20 : 0),
    });
  }
  for (const issue of input.issues) {
    items.push({
      id: `issue-${issue.id}`,
      side: actionSide(roleCodes(issue.assignee), 'engineering'),
      kind: issue.severity === 'CRITICAL' ? 'Critical issue' : 'High-severity issue',
      title: issue.title,
      detail: `${issue.project.client?.name ?? 'Client'} · ${ownerLabel(issue.assignee)}`,
      href: '/issues',
      score: (PRIORITY_SCORE[issue.severity] ?? 0) + (PRIORITY_SCORE[issue.priority] ?? 0) / 2,
    });
  }
  for (const risk of input.risks) {
    items.push({
      id: `risk-${risk.id}`,
      side: actionSide(roleCodes(risk.owner), 'engineering'),
      kind: 'Open risk',
      title: risk.title,
      detail: `${risk.project?.client?.name ?? 'Client'} · ${ownerLabel(risk.owner)} · ${risk.status.replaceAll('_', ' ')}`,
      href: '/risks',
      score: 28 + (PRIORITY_SCORE[risk.likelihood] ?? 0),
    });
  }
  for (const request of input.requests) {
    items.push({
      id: `request-${request.id}`,
      side: actionSide(roleCodes(request.assignedReviewer), 'csm'),
      kind:
        request.status === 'PENDING_APPROVAL'
          ? 'Request pending approval'
          : request.status === 'RETURNED_FOR_REVISION'
            ? 'Request returned'
            : 'High-priority request',
      title: `${request.requestNumber} · ${request.title}`,
      detail: `${request.client?.name ?? 'Client'} · ${ownerLabel(request.assignedReviewer)}`,
      href: `/service-requests/${request.id}`,
      score: 22 + (PRIORITY_SCORE[request.priority] ?? 0),
    });
  }
  for (const project of input.projects) {
    items.push({
      id: `project-${project.id}`,
      side: 'csm',
      kind: project.status === 'AT_RISK' ? 'Project at risk' : 'Project on hold',
      title: project.name,
      detail: project.client?.name ?? 'Client',
      href: `/projects/${project.id}`,
      score: project.status === 'AT_RISK' ? 45 : 35,
    });
  }

  return items
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ score: _score, ...item }) => item);
}

function startOfUtcIsoWeekKey(date: Date): string {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() - day + 1);
  return utc.toISOString().slice(0, 10);
}

function buildRecommendations(input: {
  openRisks: number;
  openCapa: number;
  overdueTasks: number;
  pendingSpend: number;
  pendingKpi: number;
  offPath: number;
  rejected: number;
}) {
  const items: string[] = [];
  if (input.offPath > 0) {
    items.push(`${input.offPath} project${input.offPath === 1 ? '' : 's'} are on hold or at risk.`);
  }
  if (input.openRisks > 0) {
    items.push(`${input.openRisks} open operational risk${input.openRisks === 1 ? '' : 's'} need owners or closure.`);
  }
  if (input.openCapa > 0) {
    items.push(`${input.openCapa} CAPA item${input.openCapa === 1 ? '' : 's'} are not yet verified.`);
  }
  if (input.overdueTasks > 0) {
    items.push(`${input.overdueTasks} incomplete task${input.overdueTasks === 1 ? '' : 's'} are past due.`);
  }
  if (input.pendingSpend > 0) {
    items.push('Pending expenditure imports are excluded from approved spend until finance approval.');
  }
  if (input.pendingKpi > 0) {
    items.push(`${input.pendingKpi} KPI draft/pending record${input.pendingKpi === 1 ? '' : 's'} are excluded from published totals.`);
  }
  if (input.rejected > 0) {
    items.push(`${input.rejected} rejected service request${input.rejected === 1 ? '' : 's'} sit outside the won pipeline.`);
  }
  if (items.length === 0) {
    items.push('No exception signals from live operations. Approved totals still exclude unreviewed imports.');
  }
  return items.slice(0, 5);
}
