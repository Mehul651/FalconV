import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IMPORT_KINDS, type ImportKind, reviewImportSchema } from '@falconv/shared';
import { AuditService } from '../audit/audit.service';
import type { AuthContext } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';
import { LocalStorageService } from '../storage/local-storage.service';
import { parseImportWorkbook } from './excel';

@Injectable()
export class ImportsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(LocalStorageService) private readonly storage: LocalStorageService,
  ) {}

  async list(user: AuthContext, status?: string) {
    return this.prisma.client.importBatch.findMany({
      where: {
        organizationId: user.organizationId,
        ...(status ? { status: status as 'UPLOADED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' } : {}),
      },
      include: {
        uploadedBy: { include: { user: { select: { name: true, email: true } } } },
        _count: { select: { lines: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(user: AuthContext, id: string) {
    const batch = await this.prisma.client.importBatch.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        lines: { orderBy: { rowNumber: 'asc' } },
        uploadedBy: { include: { user: { select: { name: true } } } },
      },
    });
    if (!batch) {
      throw new NotFoundException('Import batch not found');
    }
    return batch;
  }

  async upload(
    user: AuthContext,
    kind: ImportKind,
    file: { originalname: string; buffer: Buffer },
    ip?: string,
  ) {
    if (!IMPORT_KINDS.includes(kind)) {
      throw new BadRequestException('Import kind must be KPI or EXPENDITURE');
    }
    if (!file?.buffer) {
      throw new BadRequestException('Excel file is required');
    }
    const parsed = await parseImportWorkbook(kind, file.buffer);
    if (parsed.length === 0) {
      throw new BadRequestException('The spreadsheet has no data rows');
    }
    const saved = await this.storage.saveImport({ originalName: file.originalname, buffer: file.buffer });
    const batch = await this.prisma.client.importBatch.create({
      data: {
        organizationId: user.organizationId,
        kind,
        status: 'UPLOADED',
        fileName: file.originalname,
        storageKey: saved.storageKey,
        checksum: saved.checksum,
        uploadedById: user.profileId,
        lines: {
          create: parsed.map((line) => ({
            rowNumber: line.rowNumber,
            code: line.code,
            period: line.period,
            amount: line.amount,
            currency: line.currency,
            occurredOn: line.occurredOn ? new Date(line.occurredOn) : null,
            projectNumber: line.projectNumber,
            notes: line.notes,
            error: line.error,
          })),
        },
      },
      include: { lines: { orderBy: { rowNumber: 'asc' } } },
    });
    await this.audit.record({
      organizationId: user.organizationId,
      actorProfileId: user.profileId,
      action: 'import.uploaded',
      resourceType: 'ImportBatch',
      resourceId: batch.id,
      metadata: { kind, fileName: file.originalname, rows: parsed.length },
      ipAddress: ip,
    });
    return batch;
  }

  async submit(user: AuthContext, id: string) {
    const batch = await this.get(user, id);
    if (batch.status !== 'UPLOADED') {
      throw new BadRequestException('Only uploaded previews can be submitted');
    }
    const valid = batch.lines.filter((line) => !line.error);
    if (valid.length === 0) {
      throw new BadRequestException('No valid rows to submit');
    }
    return this.prisma.client.importBatch.update({
      where: { id },
      data: { status: 'PENDING_APPROVAL' },
      include: { lines: { orderBy: { rowNumber: 'asc' } } },
    });
  }

  async decide(user: AuthContext, id: string, approve: boolean, input: unknown, ip?: string) {
    const data = reviewImportSchema.parse(input ?? {});
    const batch = await this.get(user, id);
    if (batch.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Import is not pending approval');
    }
    if (!approve) {
      const rejected = await this.prisma.client.importBatch.update({
        where: { id },
        data: {
          status: 'REJECTED',
          reviewedById: user.profileId,
          reviewedAt: new Date(),
          reviewComment: data.comment,
        },
      });
      await this.audit.record({
        organizationId: user.organizationId,
        actorProfileId: user.profileId,
        action: 'import.rejected',
        resourceType: 'ImportBatch',
        resourceId: id,
        ipAddress: ip,
      });
      return rejected;
    }

    const valid = batch.lines.filter((line) => !line.error);
    await this.prisma.client.$transaction(async (tx) => {
      if (batch.kind === 'KPI') {
        for (const line of valid) {
          const definition = await tx.kpiDefinition.findFirst({
            where: { organizationId: user.organizationId, code: line.code ?? '' },
          });
          if (!definition || definition.source === 'CALCULATED' || !line.period || line.amount == null) {
            continue;
          }
          await tx.kpiRecord.updateMany({
            where: { definitionId: definition.id, period: line.period, status: 'APPROVED' },
            data: { status: 'REJECTED', notes: 'Superseded by approved import' },
          });
          await tx.kpiRecord.create({
            data: {
              organizationId: user.organizationId,
              definitionId: definition.id,
              period: line.period,
              value: line.amount,
              status: 'APPROVED',
              source: 'IMPORTED',
              notes: line.notes,
              importBatchId: batch.id,
              createdById: user.profileId,
            },
          });
        }
      } else {
        for (const line of valid) {
          const project = line.projectNumber
            ? await tx.project.findFirst({
                where: { organizationId: user.organizationId, projectNumber: line.projectNumber, deletedAt: null },
              })
            : null;
          await tx.expenditureEntry.create({
            data: {
              organizationId: user.organizationId,
              amount: line.amount ?? 0,
              currency: line.currency ?? 'USD',
              occurredOn: line.occurredOn ?? new Date(),
              category: line.code ?? 'OTHER',
              description: line.notes ?? `Imported row ${line.rowNumber}`,
              projectId: project?.id,
              status: 'APPROVED',
              importBatchId: batch.id,
              createdById: user.profileId,
            },
          });
        }
      }
      await tx.importBatch.update({
        where: { id: batch.id },
        data: {
          status: 'APPROVED',
          reviewedById: user.profileId,
          reviewedAt: new Date(),
          reviewComment: data.comment,
        },
      });
    });

    await this.audit.record({
      organizationId: user.organizationId,
      actorProfileId: user.profileId,
      action: 'import.approved',
      resourceType: 'ImportBatch',
      resourceId: id,
      metadata: { kind: batch.kind },
      ipAddress: ip,
    });
    return this.get(user, id);
  }
}
