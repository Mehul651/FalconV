import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(input: {
    organizationId: string;
    userProfileId: string;
    type: string;
    title: string;
    body: string;
    resourceType?: string;
    resourceId?: string;
  }) {
    return this.prisma.client.notification.create({ data: input });
  }

  async listForUser(userProfileId: string) {
    return this.prisma.client.notification.findMany({
      where: { userProfileId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(id: string, userProfileId: string) {
    return this.prisma.client.notification.updateMany({
      where: { id, userProfileId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
