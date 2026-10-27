import { Body, Controller, Get, Inject, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthContext } from '../common/types';
import { CapaService } from './capa.service';
import { DashboardService } from './dashboard.service';
import { RisksService } from './risks.service';

@Controller('api/v1')
export class IntelligenceController {
  constructor(
    @Inject(DashboardService) private readonly dashboard: DashboardService,
    @Inject(RisksService) private readonly risks: RisksService,
    @Inject(CapaService) private readonly capa: CapaService,
  ) {}

  @Get('dashboard')
  snapshot(@CurrentUser() user: AuthContext) {
    return this.dashboard.snapshot(user);
  }

  @RequirePermissions('risks.read')
  @Get('risks')
  listRisks(@CurrentUser() user: AuthContext) {
    return this.risks.list(user);
  }

  @RequirePermissions('risks.read')
  @Get('risks/:id')
  getRisk(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.risks.get(user, id);
  }

  @RequirePermissions('risks.write')
  @Post('risks')
  createRisk(@CurrentUser() user: AuthContext, @Body() body: unknown, @Req() request: Request) {
    return this.risks.create(user, body, request.ip);
  }

  @RequirePermissions('risks.write')
  @Post('risks/:id/transition')
  transitionRisk(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.risks.transition(user, id, body, request.ip);
  }

  @RequirePermissions('capa.read')
  @Get('capa')
  listCapa(@CurrentUser() user: AuthContext) {
    return this.capa.list(user);
  }

  @RequirePermissions('capa.read')
  @Get('capa/:id')
  getCapa(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.capa.get(user, id);
  }

  @RequirePermissions('capa.write')
  @Post('capa')
  createCapa(@CurrentUser() user: AuthContext, @Body() body: unknown, @Req() request: Request) {
    return this.capa.create(user, body, request.ip);
  }

  @RequirePermissions('capa.write')
  @Post('capa/:id/transition')
  transitionCapa(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.capa.transition(user, id, body, request.ip);
  }
}
