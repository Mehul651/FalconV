import type { PermissionCode, UserStatus } from '@falconv/shared';

export type AuthContext = {
  userId: string;
  email: string;
  name: string;
  profileId: string;
  organizationId: string;
  departmentId: string | null;
  clientId: string | null;
  status: UserStatus;
  roles: string[];
  permissions: PermissionCode[];
};
