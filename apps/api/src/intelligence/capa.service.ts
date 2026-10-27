import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  canTransitionCapa,
  createCapaSchema,
  transitionCapaSchema,
  type CapaStatus,
} from '@falconv/shared';
import { AuditService } from '../audit/audit.service';
import type { AuthContext } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CapaService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  list(user: AuthContext) {
    return this.prisma.client.correctiveAction.findMany({
      where: { organizationId: user.organizationId, deletedAt: null },
      include: {
        owner: { include: { user: { select: { name: true, email: true } } } },
        risk: { select: { id: true, riskNumber: true, title: true } },
        project: { select: { id: true, name: true, projectNumber: true } },
      },
      orderBy: { dueOn: 'asc' },
    });
  }

  async get(user: AuthContext, id: string) {
    const capa = await this.prisma.client.correctiveAction.findFirst({
      where: { id, organizationId: user.organizationId, deletedAt: null },
      include: {
        owner: { include: { user: { select: { name: true, email: true } } } },
        risk: { select: { id: true, riskNumber: true, title: true } },
        project: { select: { id: true, name: true, projectNumber: true } },
      },
    });
    if (!capa) {
      throw new NotFoundException('Corrective action not found');
    }
    return capa;
  }

  async create(user: AuthContext, input: unknown, ip?: string) {
    const data = createCapaSchema.parse(input);
    const dueOn = new Date(data.dueOn);
    if (Number.isNaN(dueOn.getTime())) {
      throw new BadRequestException('dueOn must be a valid date');
    }
    const owner = await this.prisma.client.userProfile.findFirst({
      where: { id: data.ownerId, organizationId: user.organizationId, deletedAt: null },
    });
    if (!owner) {
      throw new NotFoundException('Owner not found');
    }
    let projectId: string | null = null;
    if (data.riskId) {
      const risk = await this.prisma.client.risk.findFirst({
        where: { id: data.riskId, organizationId: user.organizationId, deletedAt: null },
      });
      if (!risk) {
        throw new NotFoundException('Risk not found');
      }
      projectId = risk.projectId;
    }
    const year = new Date().getUTCFullYear();
    const prefix = `CAPA-${year}-`;
    const last = await this.prisma.client.correctiveAction.findFirst({
      where: { capaNumber: { startsWith: prefix } },
      orderBy: { capaNumber: 'desc' },
    });
    const next = (last ? Number(last.capaNumber.slice(prefix.length)) : 0) + 1;
    const capaNumber = `${prefix}${String(next).padStart(4, '0')}`;
    const created = await this.prisma.client.correctiveAction.create({
      data: {
        organizationId: user.organizationId,
        capaNumber,
        title: data.title,
        description: data.description,
        ownerId: data.ownerId,
        dueOn,
        riskId: data.riskId,
        projectId,
        status: 'OPEN',
      },
    });
    await this.audit.record({
      organizationId: user.organizationId,
      actorProfileId: user.profileId,
      action: 'capa.created',
      resourceType: 'CorrectiveAction',
      resourceId: created.id,
      metadata: { capaNumber },
      ipAddress: ip,
    });
    return created;
  }

  async transition(user: AuthContext, id: string, input: unknown, ip?: string) {
    const data = transitionCapaSchema.parse(input);
    const capa = await this.get(user, id);
    const from = capa.status as CapaStatus;
    const to = data.toStatus;
    if (!canTransitionCapa(from, to)) {
      throw new BadRequestException(`Cannot move CAPA from ${from} to ${to}`);
    }
    if (to === 'VERIFIED' && !data.verificationNotes && !capa.verificationNotes) {
      throw new BadRequestException('Verification notes are required to mark a CAPA verified');
    }
    const updated = await this.prisma.client.correctiveAction.update({
      where: { id },
      data: {
        status: to,
        verificationNotes: data.verificationNotes ?? capa.verificationNotes,
      },
    });
    await this.audit.record({
      organizationId: user.organizationId,
      actorProfileId: user.profileId,
      action: 'capa.transitioned',
      resourceType: 'CorrectiveAction',
      resourceId: id,
      metadata: { from, to },
      ipAddress: ip,
    });
    return updated;
  }
}
