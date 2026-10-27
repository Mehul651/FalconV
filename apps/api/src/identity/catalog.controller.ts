import { Controller, Get, Inject } from '@nestjs/common';
import { ROLE_CODES, ROLE_LABELS } from '@falconv/shared';
import { RequirePermissions } from '../common/decorators';
import { CurrentUser } from '../common/decorators';
import type { AuthContext } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/v1')
export class CatalogController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @RequirePermissions('users.invite')
  @Get('roles')
  roles() {
    return ROLE_CODES.map((code) => ({ code, name: ROLE_LABELS[code] }));
  }

  @RequirePermissions('users.read')
  @Get('departments')
  departments(@CurrentUser() user: AuthContext) {
    return this.prisma.client.department.findMany({
      where: { organizationId: user.organizationId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }
}
