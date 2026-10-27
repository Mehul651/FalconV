import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  canTransitionTask,
  createTaskSchema,
  transitionTaskSchema,
  updateTaskSchema,
  type TaskStatus,
} from '@falconv/shared';
import { AuditService } from '../audit/audit.service';
import type { AuthContext } from '../common/types';
import { ProjectsService } from '../projects/projects.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TasksService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(ProjectsService) private readonly projects: ProjectsService,
  ) {}

  async list(user: AuthContext, projectId?: string) {
    if (projectId) {
      await this.projects.get(user, projectId);
    }
    return this.prisma.client.task.findMany({
      where: {
        deletedAt: null,
        ...(projectId ? { projectId } : {}),
        project: {
          organizationId: user.organizationId,
          deletedAt: null,
          ...this.projects.clientScope(user),
        },
      },
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
        assignee: { include: { user: { select: { name: true, email: true } } } },
      },
      orderBy: [{ status: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async get(user: AuthContext, id: string) {
    const task = await this.prisma.client.task.findFirst({
      where: {
        id,
        deletedAt: null,
        project: {
          organizationId: user.organizationId,
          deletedAt: null,
          ...this.projects.clientScope(user),
        },
      },
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
        assignee: { include: { user: { select: { name: true, email: true } } } },
        comments: {
          include: { author: { include: { user: { select: { name: true } } } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  async create(user: AuthContext, input: unknown, ip?: string) {
    const data = createTaskSchema.parse(input);
    await this.projects.get(user, data.projectId);
    const created = await this.prisma.client.task.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        priority: data.priority ?? 'MEDIUM',
        assigneeId: data.assigneeId,
        parentId: data.parentId,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        labels: data.labels ?? [],
        status: 'BACKLOG',
      },
    });
    await this.audit.record({
      organizationId: user.organizationId,
      actorProfileId: user.profileId,
      action: 'task.created',
      resourceType: 'Task',
      resourceId: created.id,
      metadata: { projectId: data.projectId },
      ipAddress: ip,
    });
    return created;
  }

  async update(user: AuthContext, id: string, input: unknown) {
    await this.get(user, id);
    const data = updateTaskSchema.parse(input);
    return this.prisma.client.task.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        assigneeId: data.assigneeId,
        dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : undefined,
        labels: data.labels,
        sortOrder: data.sortOrder,
      },
    });
  }

  async transition(user: AuthContext, id: string, input: unknown, ip?: string) {
    const data = transitionTaskSchema.parse(input);
    const task = await this.get(user, id);
    const from = task.status as TaskStatus;
    const to = data.toStatus;
    if (!canTransitionTask(from, to)) {
      throw new BadRequestException(`Cannot move task from ${from} to ${to}`);
    }
    const updated = await this.prisma.client.task.update({
      where: { id },
      data: { status: to },
    });
    await this.audit.record({
      organizationId: user.organizationId,
      actorProfileId: user.profileId,
      action: 'task.transitioned',
      resourceType: 'Task',
      resourceId: id,
      metadata: { from, to },
      ipAddress: ip,
    });
    return updated;
  }

  async comment(user: AuthContext, id: string, body: string) {
    await this.get(user, id);
    if (!body || body.trim().length < 1) {
      throw new BadRequestException('Comment is required');
    }
    return this.prisma.client.taskComment.create({
      data: { taskId: id, authorId: user.profileId, body: body.trim() },
    });
  }
}
