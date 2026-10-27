import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { fromNodeHeaders } from 'better-auth/node';
import type { PermissionCode } from '@falconv/shared';
import { PrismaService } from '../prisma/prisma.service';
import {
  ALLOW_PENDING_KEY,
  IS_PUBLIC_KEY,
  PERMISSIONS_KEY,
} from '../common/decorators';
import type { AuthContext } from '../common/types';
import { auth } from './auth';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const path = (request.originalUrl as string | undefined) ?? request.url ?? '';
    if (
      path.startsWith('/api/auth') ||
      path.startsWith('/api/docs') ||
      path.startsWith('/api/health')
    ) {
      return true;
    }

    const isPublic = this.reflector?.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;
    try {
      session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });
    } catch {
      throw new UnauthorizedException('Authentication required');
    }
    if (!session?.user) {
      throw new UnauthorizedException('Authentication required');
    }

    const profile = await this.prisma.client.userProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });

    if (!profile) {
      throw new ForbiddenException('User profile is not provisioned');
    }
    if (profile.status === 'DISABLED' || profile.status === 'REJECTED') {
      throw new ForbiddenException('This account is not allowed to sign in');
    }

    const allowPending = this.reflector?.getAllAndOverride<boolean>(ALLOW_PENDING_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (profile.status === 'PENDING_APPROVAL' && !allowPending) {
      throw new ForbiddenException('Account is pending approval');
    }
    if (profile.status === 'INVITED' && !allowPending) {
      throw new ForbiddenException('Invitation has not been accepted');
    }

    const permissions = [
      ...new Set(
        profile.roles.flatMap((assignment) =>
          assignment.role.permissions.map((item) => item.permission.code),
        ),
      ),
    ] as PermissionCode[];

    const authContext: AuthContext = {
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
      profileId: profile.id,
      organizationId: profile.organizationId,
      departmentId: profile.departmentId,
      clientId: profile.clientId,
      status: profile.status,
      roles: profile.roles.map((item) => item.role.code),
      permissions,
    };
    request.authContext = authContext;

    const required = this.reflector?.getAllAndOverride<PermissionCode[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (required?.length) {
      const allowed = required.every((permission) => permissions.includes(permission));
      if (!allowed) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    return true;
  }
}
