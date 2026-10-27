import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  canTransitionRisk,
  createRiskSchema,
  transitionRiskSchema,
  type RiskStatus,
} from '@falconv/shared';
import { AuditService } from '../audit/audit.service';
import type { AuthContext } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RisksService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  list(user: AuthContext) {
    return this.prisma.client.risk.findMany({
      where: { organizationId: user.organizationId, deletedAt: null },
      include: {
        owner: { include: { user: { select: { name: true, email: true } } } },
        project: { select: { id: true, name: true, projectNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(user: AuthContext, id: string) {
    const risk = await this.prisma.client.risk.findFirst({
      where: { id, organizationId: user.organizationId, deletedAt: null },
      include: {
        owner: { include: { user: { select: { name: true, email: true } } } },
        project: { select: { id: true, name: true, projectNumber: true } },
        correctiveActions: {
          where: { deletedAt: null },
          select: { id: true, capaNumber: true, title: true, status: true },
        },
      },
    });
    if (!risk) {
      throw new NotFoundException('Risk not found');
    }
    return risk;
  }

  async create(user: AuthContext, input: unknown, ip?: string) {
    const data = createRiskSchema.parse(input);
    if (data.projectId) {
      const project = await this.prisma.client.project.findFirst({
        where: { id: data.projectId, organizationId: user.organizationId, deletedAt: null },
      });
      if (!project) {
        throw new NotFoundException('Project not found');
      }
    }
    if (data.ownerId) {
      const owner = await this.prisma.client.userProfile.findFirst({
        where: { id: data.ownerId, organizationId: user.organizationId, deletedAt: null },
      });
      if (!owner) {
        throw new NotFoundException('Owner not found');
      }
    }
    const year = new Date().getUTCFullYear();
    const prefix = `RSK-${year}-`;
    const last = await this.prisma.client.risk.findFirst({
      where: { riskNumber: { startsWith: prefix } },
      orderBy: { riskNumber: 'desc' },
    });
    const next = (last ? Number(last.riskNumber.slice(prefix.length)) : 0) + 1;
    const riskNumber = `${prefix}${String(next).padStart(4, '0')}`;
    const created = await this.prisma.client.risk.create({
      data: {
        organizationId: user.organizationId,
        riskNumber,
        title: data.title,
        description: data.description,
        severity: data.severity,
        likelihood: data.likelihood,
        ownerId: data.ownerId,
        projectId: data.projectId,
        status: 'OPEN',
      },
    });
    await this.audit.record({
      organizationId: user.organizationId,
      actorProfileId: user.profileId,
      action: 'risk.created',
      resourceType: 'Risk',
      resourceId: created.id,
      metadata: { riskNumber },
      ipAddress: ip,
    });
    return created;
  }

  async transition(user: AuthContext, id: string, input: unknown, ip?: string) {
    const data = transitionRiskSchema.parse(input);
    const risk = await this.get(user, id);
    const from = risk.status as RiskStatus;
    const to = data.toStatus;
    if (!canTransitionRisk(from, to)) {
      throw new BadRequestException(`Cannot move risk from ${from} to ${to}`);
    }
    const updated = await this.prisma.client.risk.update({
      where: { id },
      data: { status: to },
    });
    await this.audit.record({
      organizationId: user.organizationId,
      actorProfileId: user.profileId,
      action: 'risk.transitioned',
      resourceType: 'Risk',
      resourceId: id,
      metadata: { from, to },
      ipAddress: ip,
    });
    return updated;
  }
}
