import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request } from 'express';
import type { DocumentStatus } from '@falconv/shared';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthContext } from '../common/types';
import { DocumentsService } from './documents.service';

@Controller('api/v1/documents')
export class DocumentsController {
  constructor(@Inject(DocumentsService) private readonly documents: DocumentsService) {}

  @RequirePermissions('documents.read')
  @Get()
  list(@CurrentUser() user: AuthContext, @Query('projectId') projectId?: string) {
    return this.documents.list(user, projectId);
  }

  @RequirePermissions('documents.read')
  @Get(':id')
  get(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.documents.get(user, id);
  }

  @RequirePermissions('documents.write')
  @Post()
  create(@CurrentUser() user: AuthContext, @Body() body: unknown, @Req() request: Request) {
    return this.documents.create(user, body, request.ip);
  }

  @RequirePermissions('documents.write')
  @Post(':id/versions')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  addVersion(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() request: Request,
  ) {
    return this.documents.addVersion(user, id, file, request.ip);
  }

  @RequirePermissions('documents.write')
  @Post(':id/status')
  setStatus(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body() body: { status?: DocumentStatus },
  ) {
    return this.documents.setStatus(user, id, body.status as DocumentStatus);
  }

  @RequirePermissions('documents.read')
  @Get(':id/versions/:versionId/download')
  async download(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    const file = await this.documents.download(user, id, versionId);
    return new StreamableFile(file.stream, {
      type: file.mimeType,
      disposition: `attachment; filename="${file.fileName.replace(/"/g, '')}"`,
    });
  }
}
