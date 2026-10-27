import { Body, Controller, Get, Inject, Param, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AllowPending, CurrentUser, Public, RequirePermissions } from '../common/decorators';
import type { AuthContext } from '../common/types';
import { IdentityService } from './identity.service';

@ApiTags('identity')
@Controller()
export class IdentityController {
  constructor(@Inject(IdentityService) private readonly identity: IdentityService) {}

  @Public()
  @Post('api/v1/auth/register')
  register(@Body() body: unknown, @Req() request: Request) {
    return this.identity.register(body, request.ip);
  }

  @Public()
  @Post('api/v1/auth/accept-invite')
  acceptInvite(@Body() body: unknown, @Req() request: Request) {
    return this.identity.acceptInvite(body, request.ip);
  }

  @AllowPending()
  @Get('api/v1/users/me')
  me(@CurrentUser() user: AuthContext) {
    return this.identity.me(user);
  }

  @RequirePermissions('users.read')
  @Get('api/v1/users')
  list(@CurrentUser() user: AuthContext) {
    return this.identity.listUsers(user.organizationId);
  }

  @RequirePermissions('users.approve')
  @Get('api/v1/users/pending')
  pending(@CurrentUser() user: AuthContext) {
    return this.identity.listPending(user.organizationId);
  }

  @RequirePermissions('users.invite')
  @Post('api/v1/users/invite')
  invite(@CurrentUser() user: AuthContext, @Body() body: unknown, @Req() request: Request) {
    return this.identity.invite(user, body, request.ip);
  }

  @RequirePermissions('users.approve')
  @Post('api/v1/users/:id/approve')
  approve(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.identity.approve(user, id, body, request.ip);
  }

  @RequirePermissions('users.approve')
  @Post('api/v1/users/:id/reject')
  reject(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.identity.reject(user, id, body, request.ip);
  }
}
