import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { PermissionCode } from '@falconv/shared';
import type { AuthContext } from './types';

export const IS_PUBLIC_KEY = 'isPublic';
export const ALLOW_PENDING_KEY = 'allowPending';
export const PERMISSIONS_KEY = 'permissions';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const AllowPending = () => SetMetadata(ALLOW_PENDING_KEY, true);
export const RequirePermissions = (...permissions: PermissionCode[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext => {
    const request = ctx.switchToHttp().getRequest<{ authContext?: AuthContext }>();
    if (!request.authContext) {
      throw new Error('Auth context missing');
    }
    return request.authContext;
  },
);
