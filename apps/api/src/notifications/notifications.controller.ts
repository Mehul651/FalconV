import { Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { AllowPending, CurrentUser } from '../common/decorators';
import type { AuthContext } from '../common/types';
import { NotificationsService } from './notifications.service';

@Controller('api/v1/notifications')
export class NotificationsController {
  constructor(
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  @AllowPending()
  @Get()
  list(@CurrentUser() user: AuthContext) {
    return this.notifications.listForUser(user.profileId);
  }

  @AllowPending()
  @Post(':id/read')
  markRead(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.notifications.markRead(id, user.profileId);
  }
}
