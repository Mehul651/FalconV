import { Body, Controller, Get, Inject, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthContext } from '../common/types';
import { ProjectsService } from './projects.service';

@Controller('api/v1')
export class ProjectsController {
  constructor(@Inject(ProjectsService) private readonly projects: ProjectsService) {}

  @RequirePermissions('projects.read')
  @Get('staff')
  staff(@CurrentUser() user: AuthContext) {
    return this.projects.staff(user);
  }

  @RequirePermissions('projects.read')
  @Get('projects')
  list(@CurrentUser() user: AuthContext) {
    return this.projects.list(user);
  }

  @RequirePermissions('projects.read')
  @Get('projects/:id')
  get(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.projects.get(user, id);
  }

  @RequirePermissions('projects.write')
  @Post('projects')
  create(@CurrentUser() user: AuthContext, @Body() body: unknown, @Req() request: Request) {
    return this.projects.create(user, body, request.ip);
  }

  @RequirePermissions('projects.write')
  @Patch('projects/:id')
  update(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.projects.update(user, id, body, request.ip);
  }

  @RequirePermissions('projects.write')
  @Post('projects/:id/members')
  addMember(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body() body: { userProfileId?: string },
  ) {
    return this.projects.addMember(user, id, String(body.userProfileId));
  }

  @RequirePermissions('projects.write')
  @Post('projects/:id/milestones')
  addMilestone(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body() body: { name?: string; dueDate?: string | null },
  ) {
    return this.projects.addMilestone(user, id, String(body.name ?? ''), body.dueDate);
  }
}
