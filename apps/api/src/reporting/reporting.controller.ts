import {
  Body,
  Controller,
  Get,
  Header,
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
import type { ImportKind } from '@falconv/shared';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthContext } from '../common/types';
import { FinanceService } from './finance.service';
import { ImportsService } from './imports.service';
import { KpiService } from './kpi.service';
import { buildImportTemplate } from './excel';

@Controller('api/v1')
export class ReportingController {
  constructor(
    @Inject(KpiService) private readonly kpi: KpiService,
    @Inject(FinanceService) private readonly finance: FinanceService,
    @Inject(ImportsService) private readonly imports: ImportsService,
  ) {}

  @RequirePermissions('kpi.read')
  @Get('kpi')
  kpiSnapshot(@CurrentUser() user: AuthContext) {
    return this.kpi.snapshot(user);
  }

  @RequirePermissions('kpi.import')
  @Post('kpi/definitions')
  createDefinition(@CurrentUser() user: AuthContext, @Body() body: unknown, @Req() request: Request) {
    return this.kpi.createDefinition(user, body, request.ip);
  }

  @RequirePermissions('kpi.import')
  @Post('kpi/records')
  createRecord(@CurrentUser() user: AuthContext, @Body() body: unknown, @Req() request: Request) {
    return this.kpi.createRecord(user, body, request.ip);
  }

  @RequirePermissions('kpi.import')
  @Post('kpi/records/:id/submit')
  submitRecord(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.kpi.submitRecord(user, id);
  }

  @RequirePermissions('kpi.approve')
  @Post('kpi/records/:id/approve')
  approveRecord(@CurrentUser() user: AuthContext, @Param('id') id: string, @Req() request: Request) {
    return this.kpi.decideRecord(user, id, true, request.ip);
  }

  @RequirePermissions('kpi.approve')
  @Post('kpi/records/:id/reject')
  rejectRecord(@CurrentUser() user: AuthContext, @Param('id') id: string, @Req() request: Request) {
    return this.kpi.decideRecord(user, id, false, request.ip);
  }

  @RequirePermissions('finance.read')
  @Get('finance')
  financeSnapshot(@CurrentUser() user: AuthContext) {
    return this.finance.snapshot(user);
  }

  @RequirePermissions('finance.write')
  @Post('finance/budgets')
  createBudget(@CurrentUser() user: AuthContext, @Body() body: unknown, @Req() request: Request) {
    return this.finance.createBudget(user, body, request.ip);
  }

  @RequirePermissions('finance.approve')
  @Post('finance/budgets/:id/approve')
  approveBudget(@CurrentUser() user: AuthContext, @Param('id') id: string, @Req() request: Request) {
    return this.finance.decideBudget(user, id, true, request.ip);
  }

  @RequirePermissions('finance.write')
  @Post('finance/expenditures')
  createExpenditure(@CurrentUser() user: AuthContext, @Body() body: unknown, @Req() request: Request) {
    return this.finance.createExpenditure(user, body, request.ip);
  }

  @RequirePermissions('finance.write')
  @Post('finance/expenditures/:id/submit')
  submitExpenditure(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.finance.submitExpenditure(user, id);
  }

  @RequirePermissions('finance.approve')
  @Post('finance/expenditures/:id/approve')
  approveExpenditure(@CurrentUser() user: AuthContext, @Param('id') id: string, @Req() request: Request) {
    return this.finance.decideExpenditure(user, id, true, request.ip);
  }

  @RequirePermissions('finance.approve')
  @Post('finance/expenditures/:id/reject')
  rejectExpenditure(@CurrentUser() user: AuthContext, @Param('id') id: string, @Req() request: Request) {
    return this.finance.decideExpenditure(user, id, false, request.ip);
  }

  @RequirePermissions('kpi.import')
  @Get('imports/template')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async template(@Query('kind') kind: ImportKind = 'KPI') {
    const buffer = await buildImportTemplate(kind === 'EXPENDITURE' ? 'EXPENDITURE' : 'KPI');
    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${kind === 'EXPENDITURE' ? 'expenditure' : 'kpi'}-template.xlsx"`,
    });
  }

  @RequirePermissions('kpi.read')
  @Get('imports')
  listImports(@CurrentUser() user: AuthContext, @Query('status') status?: string) {
    return this.imports.list(user, status);
  }

  @RequirePermissions('kpi.read')
  @Get('imports/:id')
  getImport(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.imports.get(user, id);
  }

  @RequirePermissions('kpi.import')
  @Post('imports')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  upload(
    @CurrentUser() user: AuthContext,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { kind?: ImportKind },
    @Req() request: Request,
  ) {
    return this.imports.upload(user, (body.kind ?? 'KPI') as ImportKind, file, request.ip);
  }

  @RequirePermissions('kpi.import')
  @Post('imports/:id/submit')
  submitImport(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.imports.submit(user, id);
  }

  @RequirePermissions('kpi.approve')
  @Post('imports/:id/approve')
  approveImport(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.imports.decide(user, id, true, body, request.ip);
  }

  @RequirePermissions('kpi.approve')
  @Post('imports/:id/reject')
  rejectImport(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.imports.decide(user, id, false, body, request.ip);
  }
}
