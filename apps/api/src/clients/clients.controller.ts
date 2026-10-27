import { Body, Controller, Get, Inject, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthContext } from '../common/types';
import { ClientsService } from './clients.service';

@Controller('api/v1/clients')
export class ClientsController {
  constructor(@Inject(ClientsService) private readonly clients: ClientsService) {}

  @RequirePermissions('clients.read')
  @Get()
  list(@CurrentUser() user: AuthContext) {
    return this.clients.list(user);
  }

  @RequirePermissions('clients.read')
  @Get(':id')
  get(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.clients.get(user, id);
  }

  @RequirePermissions('clients.write')
  @Post()
  create(@CurrentUser() user: AuthContext, @Body() body: unknown, @Req() request: Request) {
    return this.clients.create(user, body, request.ip);
  }

  @RequirePermissions('clients.write')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.clients.update(user, id, body, request.ip);
  }

  @RequirePermissions('clients.write')
  @Post(':id/contacts')
  addContact(@CurrentUser() user: AuthContext, @Param('id') id: string, @Body() body: unknown) {
    return this.clients.addContact(user, id, body);
  }
}
