import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthContext } from '../common/types';
import { TasksService } from './tasks.service';

@Controller('api/v1')
export class TasksController {
  constructor(@Inject(TasksService) private readonly tasks: TasksService) {}

  @RequirePermissions('tasks.read')
  @Get('tasks')
  list(@CurrentUser() user: AuthContext, @Query('projectId') projectId?: string) {
    return this.tasks.list(user, projectId);
  }

  @RequirePermissions('tasks.read')
  @Get('tasks/:id')
  get(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.tasks.get(user, id);
  }

  @RequirePermissions('tasks.write')
  @Post('tasks')
  create(@CurrentUser() user: AuthContext, @Body() body: unknown, @Req() request: Request) {
    return this.tasks.create(user, body, request.ip);
  }

  @RequirePermissions('tasks.write')
  @Patch('tasks/:id')
  update(@CurrentUser() user: AuthContext, @Param('id') id: string, @Body() body: unknown) {
    return this.tasks.update(user, id, body);
  }

  @RequirePermissions('tasks.write')
  @Post('tasks/:id/transition')
  transition(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.tasks.transition(user, id, body, request.ip);
  }

  @RequirePermissions('tasks.write')
  @Post('tasks/:id/comments')
  comment(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body() body: { body?: string },
  ) {
    return this.tasks.comment(user, id, String(body.body ?? ''));
  }
}
