import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@falconv/db';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async record(input: {
    organizationId?: string | null;
    actorProfileId?: string | null;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    metadata?: Prisma.InputJsonValue;
    ipAddress?: string | null;
    requestId?: string | null;
  }) {
    await this.prisma.client.auditLog.create({
      data: {
        organizationId: input.organizationId ?? undefined,
        actorProfileId: input.actorProfileId ?? undefined,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? undefined,
        metadata: input.metadata,
        ipAddress: input.ipAddress ?? undefined,
        requestId: input.requestId ?? undefined,
      },
    });
  }
}
