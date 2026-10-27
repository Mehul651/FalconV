import { Body, Controller, Get, Inject, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthContext } from '../common/types';
import { IssuesService } from './issues.service';

@Controller('api/v1/issues')
export class IssuesController {
  constructor(@Inject(IssuesService) private readonly issues: IssuesService) {}

  @RequirePermissions('issues.read')
  @Get()
  list(@CurrentUser() user: AuthContext, @Query('projectId') projectId?: string) {
    return this.issues.list(user, projectId);
  }

  @RequirePermissions('issues.read')
  @Get(':id')
  get(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.issues.get(user, id);
  }

  @RequirePermissions('issues.write')
  @Post()
  create(@CurrentUser() user: AuthContext, @Body() body: unknown, @Req() request: Request) {
    return this.issues.create(user, body, request.ip);
  }

  @RequirePermissions('issues.write')
  @Post(':id/transition')
  transition(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.issues.transition(user, id, body, request.ip);
  }
}
