import { Body, Controller, Get, Inject, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthContext } from '../common/types';
import { RequestsService } from './requests.service';

@Controller('api/v1/service-requests')
export class RequestsController {
  constructor(@Inject(RequestsService) private readonly requests: RequestsService) {}

  @RequirePermissions('requests.read')
  @Get()
  list(@CurrentUser() user: AuthContext) {
    return this.requests.list(user);
  }

  @RequirePermissions('requests.read')
  @Get(':id')
  get(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.requests.get(user, id);
  }

  @RequirePermissions('requests.write')
  @Post()
  create(@CurrentUser() user: AuthContext, @Body() body: unknown, @Req() request: Request) {
    return this.requests.create(user, body, request.ip);
  }

  @RequirePermissions('requests.write')
  @Post(':id/transition')
  transition(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.requests.transition(user, id, body, request.ip);
  }
}
