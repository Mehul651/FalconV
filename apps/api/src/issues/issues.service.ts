import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  canTransitionIssue,
  createIssueSchema,
  transitionIssueSchema,
  type IssueStatus,
} from '@falconv/shared';
import { AuditService } from '../audit/audit.service';
import type { AuthContext } from '../common/types';
import { ProjectsService } from '../projects/projects.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IssuesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(ProjectsService) private readonly projects: ProjectsService,
  ) {}

  async list(user: AuthContext, projectId?: string) {
    if (projectId) {
      await this.projects.get(user, projectId);
    }
    return this.prisma.client.issue.findMany({
      where: {
        organizationId: user.organizationId,
        deletedAt: null,
        ...(projectId ? { projectId } : {}),
        project: { deletedAt: null, ...this.projects.clientScope(user) },
      },
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
        reporter: { include: { user: { select: { name: true, email: true } } } },
        assignee: { include: { user: { select: { name: true, email: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(user: AuthContext, id: string) {
    const issue = await this.prisma.client.issue.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
        deletedAt: null,
        project: { deletedAt: null, ...this.projects.clientScope(user) },
      },
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
        reporter: { include: { user: { select: { name: true, email: true } } } },
        assignee: { include: { user: { select: { name: true, email: true } } } },
      },
    });
    if (!issue) {
      throw new NotFoundException('Issue not found');
    }
    return issue;
  }

  async create(user: AuthContext, input: unknown, ip?: string) {
    const data = createIssueSchema.parse(input);
    await this.projects.get(user, data.projectId);
    const year = new Date().getUTCFullYear();
    const prefix = `ISS-${year}-`;
    const last = await this.prisma.client.issue.findFirst({
      where: { issueNumber: { startsWith: prefix } },
      orderBy: { issueNumber: 'desc' },
    });
    const next = (last ? Number(last.issueNumber.slice(prefix.length)) : 0) + 1;
    const issueNumber = `${prefix}${String(next).padStart(4, '0')}`;
    const created = await this.prisma.client.issue.create({
      data: {
        organizationId: user.organizationId,
        projectId: data.projectId,
        issueNumber,
        title: data.title,
        description: data.description,
        severity: data.severity,
        priority: data.priority ?? 'MEDIUM',
        assigneeId: data.assigneeId,
        reporterId: user.profileId,
        reproductionSteps: data.reproductionSteps,
        expectedBehavior: data.expectedBehavior,
        actualBehavior: data.actualBehavior,
        status: 'OPEN',
      },
    });
    await this.audit.record({
      organizationId: user.organizationId,
      actorProfileId: user.profileId,
      action: 'issue.created',
      resourceType: 'Issue',
      resourceId: created.id,
      metadata: { issueNumber },
      ipAddress: ip,
    });
    return created;
  }

  async transition(user: AuthContext, id: string, input: unknown, ip?: string) {
    const data = transitionIssueSchema.parse(input);
    const issue = await this.get(user, id);
    const from = issue.status as IssueStatus;
    const to = data.toStatus;
    if (!canTransitionIssue(from, to)) {
      throw new BadRequestException(`Cannot move issue from ${from} to ${to}`);
    }
    if (to === 'ASSIGNED' && !data.assigneeId && !issue.assigneeId) {
      throw new BadRequestException('Assignee is required to move to ASSIGNED');
    }
    if ((to === 'RESOLVED' || to === 'CLOSED') && !data.resolution && !issue.resolution) {
      throw new BadRequestException('Resolution is required to resolve or close an issue');
    }
    const updated = await this.prisma.client.issue.update({
      where: { id },
      data: {
        status: to,
        assigneeId: data.assigneeId ?? issue.assigneeId,
        resolution: data.resolution ?? issue.resolution,
      },
    });
    await this.audit.record({
      organizationId: user.organizationId,
      actorProfileId: user.profileId,
      action: 'issue.transitioned',
      resourceType: 'Issue',
      resourceId: id,
      metadata: { from, to },
      ipAddress: ip,
    });
    return updated;
  }
}
