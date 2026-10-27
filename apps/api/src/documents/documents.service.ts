import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { DOCUMENT_STATUSES, createDocumentSchema, type DocumentStatus } from '@falconv/shared';
import { AuditService } from '../audit/audit.service';
import type { AuthContext } from '../common/types';
import { ProjectsService } from '../projects/projects.service';
import { PrismaService } from '../prisma/prisma.service';
import { LocalStorageService } from '../storage/local-storage.service';

const MAX_BYTES = 20 * 1024 * 1024;

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(ProjectsService) private readonly projects: ProjectsService,
    @Inject(LocalStorageService) private readonly storage: LocalStorageService,
  ) {}

  async list(user: AuthContext, projectId?: string) {
    if (projectId) {
      await this.projects.get(user, projectId);
    }
    return this.prisma.client.engineeringDocument.findMany({
      where: {
        organizationId: user.organizationId,
        deletedAt: null,
        ...(projectId ? { projectId } : {}),
        project: { deletedAt: null, ...this.projects.clientScope(user) },
      },
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
        owner: { include: { user: { select: { name: true, email: true } } } },
        versions: { orderBy: { version: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async get(user: AuthContext, id: string) {
    const document = await this.prisma.client.engineeringDocument.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
        deletedAt: null,
        project: { deletedAt: null, ...this.projects.clientScope(user) },
      },
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
        owner: { include: { user: { select: { name: true, email: true } } } },
        versions: { orderBy: { version: 'desc' } },
      },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    return document;
  }

  async create(user: AuthContext, input: unknown, ip?: string) {
    const data = createDocumentSchema.parse(input);
    await this.projects.get(user, data.projectId);
    const created = await this.prisma.client.engineeringDocument.create({
      data: {
        organizationId: user.organizationId,
        projectId: data.projectId,
        title: data.title,
        category: data.category,
        ownerId: user.profileId,
        status: 'DRAFT',
      },
    });
    await this.audit.record({
      organizationId: user.organizationId,
      actorProfileId: user.profileId,
      action: 'document.created',
      resourceType: 'EngineeringDocument',
      resourceId: created.id,
      metadata: { title: data.title },
      ipAddress: ip,
    });
    return created;
  }

  async addVersion(
    user: AuthContext,
    id: string,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    ip?: string,
  ) {
    const document = await this.get(user, id);
    if (!file?.buffer) {
      throw new BadRequestException('File is required');
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('File exceeds 20MB limit');
    }
    const latest = document.versions[0];
    const version = (latest?.version ?? 0) + 1;
    const saved = await this.storage.saveDocumentVersion({
      documentId: id,
      version,
      originalName: file.originalname,
      buffer: file.buffer,
    });
    const created = await this.prisma.client.documentVersion.create({
      data: {
        documentId: id,
        version,
        storageKey: saved.storageKey,
        fileName: file.originalname,
        mimeType: file.mimetype || 'application/octet-stream',
        sizeBytes: file.size,
        checksum: saved.checksum,
      },
    });
    await this.prisma.client.engineeringDocument.update({
      where: { id },
      data: { status: document.status === 'APPROVED' ? 'SUPERSEDED' : document.status },
    });
    await this.audit.record({
      organizationId: user.organizationId,
      actorProfileId: user.profileId,
      action: 'document.version_uploaded',
      resourceType: 'EngineeringDocument',
      resourceId: id,
      metadata: { version, fileName: file.originalname },
      ipAddress: ip,
    });
    return created;
  }

  async setStatus(user: AuthContext, id: string, status: DocumentStatus) {
    if (!(DOCUMENT_STATUSES as readonly string[]).includes(status)) {
      throw new BadRequestException('Invalid document status');
    }
    await this.get(user, id);
    return this.prisma.client.engineeringDocument.update({
      where: { id },
      data: { status },
    });
  }

  async download(user: AuthContext, id: string, versionId: string) {
    const document = await this.get(user, id);
    const version = document.versions.find((item) => item.id === versionId);
    if (!version) {
      throw new NotFoundException('Version not found');
    }
    return {
      stream: createReadStream(this.storage.resolve(version.storageKey)),
      fileName: version.fileName,
      mimeType: version.mimeType,
    };
  }
}
