import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  canTransitionRequest,
  createServiceRequestSchema,
  transitionServiceRequestSchema,
  type ServiceRequestStatus,
} from '@falconv/shared';
import { AuditService } from '../audit/audit.service';
import type { AuthContext } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RequestsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  private clientScope(user: AuthContext) {
    if (user.roles.includes('client_user')) {
      return { clientId: user.clientId ?? '__none__' };
    }
    return {};
  }

  async list(user: AuthContext) {
    return this.prisma.client.serviceRequest.findMany({
      where: {
        organizationId: user.organizationId,
        deletedAt: null,
        ...this.clientScope(user),
      },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(user: AuthContext, id: string) {
    const request = await this.prisma.client.serviceRequest.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
        deletedAt: null,
        ...this.clientScope(user),
      },
      include: {
        client: true,
        events: { orderBy: { createdAt: 'asc' } },
        assignedReviewer: { include: { user: { select: { name: true, email: true } } } },
        project: { select: { id: true, name: true, projectNumber: true } },
      },
    });
    if (!request) {
      throw new NotFoundException('Service request not found');
    }
    return request;
  }

  async create(user: AuthContext, input: unknown, ip?: string) {
    const data = createServiceRequestSchema.parse(input);
    if (user.roles.includes('client_user') && data.clientId !== user.clientId) {
      throw new ForbiddenException('You can only submit requests for your client');
    }

    const client = await this.prisma.client.client.findFirst({
      where: { id: data.clientId, organizationId: user.organizationId, deletedAt: null },
    });
    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const year = new Date().getUTCFullYear();
    const prefix = `SR-${year}-`;
    const last = await this.prisma.client.serviceRequest.findFirst({
      where: { requestNumber: { startsWith: prefix } },
      orderBy: { requestNumber: 'desc' },
    });
    const next = (last ? Number(last.requestNumber.slice(prefix.length)) : 0) + 1;
    const requestNumber = `${prefix}${String(next).padStart(4, '0')}`;

    const created = await this.prisma.client.$transaction(async (tx) => {
      const request = await tx.serviceRequest.create({
        data: {
          organizationId: user.organizationId,
          requestNumber,
          clientId: data.clientId,
          title: data.title,
          description: data.description,
          category: data.category,
          priority: data.priority,
          requestedDelivery: data.requestedDelivery ? new Date(data.requestedDelivery) : null,
          createdByProfileId: user.profileId,
          status: 'SUBMITTED',
        },
      });
      await tx.serviceRequestEvent.create({
        data: {
          serviceRequestId: request.id,
          actorProfileId: user.profileId,
          fromStatus: null,
          toStatus: 'SUBMITTED',
          comment: 'Request submitted',
        },
      });
      await tx.clientActivity.create({
        data: {
          clientId: data.clientId,
          actorProfileId: user.profileId,
          type: 'request.submitted',
          summary: `${requestNumber} submitted: ${data.title}`,
        },
      });
      return request;
    });

    await this.audit.record({
      organizationId: user.organizationId,
      actorProfileId: user.profileId,
      action: 'request.submitted',
      resourceType: 'ServiceRequest',
      resourceId: created.id,
      metadata: { requestNumber },
      ipAddress: ip,
    });
    return created;
  }

  async transition(user: AuthContext, id: string, input: unknown, ip?: string) {
    const data = transitionServiceRequestSchema.parse(input);
    const request = await this.get(user, id);
    const from = request.status as ServiceRequestStatus;
    const to = data.toStatus;

    if (!canTransitionRequest(from, to)) {
      throw new BadRequestException(`Cannot move from ${from} to ${to}`);
    }
    if (user.roles.includes('client_user') && to !== 'SUBMITTED') {
      throw new ForbiddenException('Client users cannot advance intake workflow');
    }
    if (to === 'APPROVED' || to === 'REJECTED') {
      if (!user.permissions.includes('requests.approve')) {
        throw new ForbiddenException('Approval permission required');
      }
    }
    if (to === 'PROJECT_CREATED') {
      throw new BadRequestException('Project creation ships in Phase 3');
    }

    const updated = await this.prisma.client.$transaction(async (tx) => {
      const next = await tx.serviceRequest.update({
        where: { id },
        data: {
          status: to,
          assignedReviewerId: data.assignedReviewerId ?? request.assignedReviewerId,
        },
      });
      await tx.serviceRequestEvent.create({
        data: {
          serviceRequestId: id,
          actorProfileId: user.profileId,
          fromStatus: from,
          toStatus: to,
          comment: data.comment,
        },
      });
      return next;
    });

    await this.audit.record({
      organizationId: user.organizationId,
      actorProfileId: user.profileId,
      action: 'request.transitioned',
      resourceType: 'ServiceRequest',
      resourceId: id,
      metadata: { from, to, comment: data.comment ?? null },
      ipAddress: ip,
    });
    return updated;
  }
}
