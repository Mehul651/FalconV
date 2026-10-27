import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { canCreateClient, onboardClientSchema, upsertClientSchema, upsertContactSchema } from '@falconv/shared';
import { AuditService } from '../audit/audit.service';
import type { AuthContext } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  private scopedWhere(user: AuthContext) {
    if (user.roles.includes('client_user')) {
      return { organizationId: user.organizationId, deletedAt: null, id: user.clientId ?? '__none__' };
    }
    return { organizationId: user.organizationId, deletedAt: null };
  }

  async list(user: AuthContext) {
    return this.prisma.client.client.findMany({
      where: this.scopedWhere(user),
      include: {
        contacts: { where: { deletedAt: null }, take: 5 },
        _count: { select: { requests: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async get(user: AuthContext, id: string) {
    const client = await this.prisma.client.client.findFirst({
      where: { ...this.scopedWhere(user), id },
      include: {
        contacts: { where: { deletedAt: null }, orderBy: { isPrimary: 'desc' } },
        activities: { orderBy: { createdAt: 'desc' }, take: 50 },
        requests: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!client) {
      throw new NotFoundException('Client not found');
    }
    return client;
  }

  async create(user: AuthContext, input: unknown, ip?: string) {
    if (!canCreateClient(user.roles, user.permissions)) {
      throw new ForbiddenException('Only CSM or administrative users can create clients');
    }
    const data = onboardClientSchema.parse(input);
    const client = await this.prisma.client.$transaction(async (tx) => {
      const created = await tx.client.create({
        data: {
          organizationId: user.organizationId,
          name: data.name,
          legalName: data.legalName || null,
          status: data.status ?? 'PROSPECT',
          category: data.category ?? 'OTHER',
          industry: data.industry || null,
          website: data.website || null,
          notes: data.notes || null,
          activities: {
            create: {
              actorProfileId: user.profileId,
              type: 'client.created',
              summary: `Client ${data.name} created`,
            },
          },
        },
      });
      if (data.primaryContact) {
        await tx.clientContact.create({
          data: {
            clientId: created.id,
            name: data.primaryContact.name,
            email: data.primaryContact.email || null,
            phone: data.primaryContact.phone || null,
            title: data.primaryContact.title || null,
            isPrimary: data.primaryContact.isPrimary ?? true,
          },
        });
      }
      return created;
    });
    await this.audit.record({
      organizationId: user.organizationId,
      actorProfileId: user.profileId,
      action: 'client.created',
      resourceType: 'Client',
      resourceId: client.id,
      ipAddress: ip,
    });
    return client;
  }

  async update(user: AuthContext, id: string, input: unknown, ip?: string) {
    if (user.roles.includes('client_user')) {
      throw new ForbiddenException('Insufficient permissions');
    }
    await this.get(user, id);
    const data = upsertClientSchema.parse(input);
    const client = await this.prisma.client.client.update({
      where: { id },
      data: {
        name: data.name,
        legalName: data.legalName || null,
        status: data.status,
        category: data.category,
        industry: data.industry || null,
        website: data.website || null,
        notes: data.notes || null,
      },
    });
    await this.prisma.client.clientActivity.create({
      data: {
        clientId: id,
        actorProfileId: user.profileId,
        type: 'client.updated',
        summary: `Client profile updated`,
      },
    });
    await this.audit.record({
      organizationId: user.organizationId,
      actorProfileId: user.profileId,
      action: 'client.updated',
      resourceType: 'Client',
      resourceId: id,
      ipAddress: ip,
    });
    return client;
  }

  async addContact(user: AuthContext, clientId: string, input: unknown) {
    if (user.roles.includes('client_user')) {
      throw new ForbiddenException('Insufficient permissions');
    }
    await this.get(user, clientId);
    const data = upsertContactSchema.parse(input);
    return this.prisma.client.clientContact.create({
      data: {
        clientId,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        title: data.title || null,
        isPrimary: data.isPrimary ?? false,
      },
    });
  }
}
