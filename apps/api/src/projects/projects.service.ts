import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createProjectSchema,
  updateProjectSchema,
  type ProjectStatus,
} from '@falconv/shared';
import { AuditService } from '../audit/audit.service';
import type { AuthContext } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  clientScope(user: AuthContext) {
    if (user.roles.includes('client_user')) {
      return { clientId: user.clientId ?? '__none__' };
    }
    return {};
  }

  async list(user: AuthContext) {
    return this.prisma.client.project.findMany({
      where: {
        organizationId: user.organizationId,
        deletedAt: null,
        ...this.clientScope(user),
      },
      include: {
        client: { select: { id: true, name: true } },
        manager: { include: { user: { select: { name: true, email: true } } } },
        _count: { select: { tasks: true, issues: true, documents: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(user: AuthContext, id: string) {
    const project = await this.prisma.client.project.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
        deletedAt: null,
        ...this.clientScope(user),
      },
      include: {
        client: true,
        serviceRequest: { select: { id: true, requestNumber: true, title: true, status: true } },
        manager: { include: { user: { select: { name: true, email: true } } } },
        members: {
          include: { userProfile: { include: { user: { select: { name: true, email: true } } } } },
        },
        milestones: { orderBy: { createdAt: 'asc' } },
        _count: { select: { tasks: true, issues: true, documents: true } },
      },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async staff(user: AuthContext) {
    if (user.roles.includes('client_user')) {
      throw new ForbiddenException('Client users cannot list staff');
    }
    return this.prisma.client.userProfile.findMany({
      where: { organizationId: user.organizationId, status: 'ACTIVE', deletedAt: null },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(user: AuthContext, input: unknown, ip?: string) {
    if (user.roles.includes('client_user')) {
      throw new ForbiddenException('Client users cannot create projects');
    }
    const data = createProjectSchema.parse(input);
    const request = await this.prisma.client.serviceRequest.findFirst({
      where: {
        id: data.serviceRequestId,
        organizationId: user.organizationId,
        deletedAt: null,
      },
    });
    if (!request) {
      throw new NotFoundException('Service request not found');
    }
    if (request.status !== 'APPROVED') {
      throw new BadRequestException('Projects can only be created from an approved request');
    }

    const existing = await this.prisma.client.project.findUnique({
      where: { serviceRequestId: request.id },
    });
    if (existing) {
      throw new BadRequestException('A project already exists for this request');
    }

    const year = new Date().getUTCFullYear();
    const prefix = `PRJ-${year}-`;
    const last = await this.prisma.client.project.findFirst({
      where: { projectNumber: { startsWith: prefix } },
      orderBy: { projectNumber: 'desc' },
    });
    const next = (last ? Number(last.projectNumber.slice(prefix.length)) : 0) + 1;
    const projectNumber = `${prefix}${String(next).padStart(4, '0')}`;

    const created = await this.prisma.client.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          organizationId: user.organizationId,
          projectNumber,
          name: data.name,
          description: data.description,
          clientId: request.clientId,
          serviceRequestId: request.id,
          managerId: data.managerId,
          priority: data.priority ?? request.priority,
          startDate: data.startDate ? new Date(data.startDate) : null,
          targetDate: data.targetDate ? new Date(data.targetDate) : null,
          status: 'PLANNED',
          members: data.memberIds?.length
            ? {
                create: data.memberIds.map((userProfileId) => ({ userProfileId })),
              }
            : undefined,
        },
      });
      await tx.serviceRequest.update({
        where: { id: request.id },
        data: { status: 'PROJECT_CREATED' },
      });
      await tx.serviceRequestEvent.create({
        data: {
          serviceRequestId: request.id,
          actorProfileId: user.profileId,
          fromStatus: 'APPROVED',
          toStatus: 'PROJECT_CREATED',
          comment: `Project ${projectNumber} created`,
        },
      });
      return project;
    });

    await this.audit.record({
      organizationId: user.organizationId,
      actorProfileId: user.profileId,
      action: 'project.created',
      resourceType: 'Project',
      resourceId: created.id,
      metadata: { projectNumber, serviceRequestId: request.id },
      ipAddress: ip,
    });
    return created;
  }

  async update(user: AuthContext, id: string, input: unknown, ip?: string) {
    const project = await this.get(user, id);
    const data = updateProjectSchema.parse(input);
    const updated = await this.prisma.client.project.update({
      where: { id: project.id },
      data: {
        name: data.name,
        description: data.description,
        managerId: data.managerId,
        status: data.status as ProjectStatus | undefined,
        priority: data.priority,
        startDate: data.startDate ? new Date(data.startDate) : data.startDate === null ? null : undefined,
        targetDate: data.targetDate ? new Date(data.targetDate) : data.targetDate === null ? null : undefined,
      },
    });
    await this.audit.record({
      organizationId: user.organizationId,
      actorProfileId: user.profileId,
      action: 'project.updated',
      resourceType: 'Project',
      resourceId: id,
      metadata: data,
      ipAddress: ip,
    });
    return updated;
  }

  async addMember(user: AuthContext, id: string, userProfileId: string) {
    await this.get(user, id);
    return this.prisma.client.projectMember.create({
      data: { projectId: id, userProfileId },
    });
  }

  async addMilestone(user: AuthContext, id: string, name: string, dueDate?: string | null) {
    await this.get(user, id);
    if (!name || name.length < 2) {
      throw new BadRequestException('Milestone name is required');
    }
    return this.prisma.client.projectMilestone.create({
      data: {
        projectId: id,
        name,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });
  }
}
