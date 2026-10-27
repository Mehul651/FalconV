import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SessionAuthGuard } from './auth.guard';

jest.mock('better-auth/node', () => ({
  fromNodeHeaders: jest.fn((headers: unknown) => headers),
}));

jest.mock('./auth', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

import { auth } from './auth';

describe('SessionAuthGuard', () => {
  const prisma = {
    client: {
      userProfile: {
        findUnique: jest.fn(),
      },
    },
  };

  const reflector = {
    getAllAndOverride: jest.fn(),
  };

  const guard = new SessionAuthGuard(
    reflector as unknown as Reflector,
    prisma as never,
  );

  function context(path = '/api/v1/users') {
    const request = { originalUrl: path, url: path, headers: {} };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as never;
  }

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('allows health routes without a session', async () => {
    await expect(guard.canActivate(context('/api/health'))).resolves.toBe(true);
  });

  it('rejects missing sessions on protected routes', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    (auth.api.getSession as jest.Mock).mockResolvedValue(null);
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects authenticated users without required permissions', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === 'permissions') return ['users.approve'];
      return undefined;
    });
    (auth.api.getSession as jest.Mock).mockResolvedValue({
      user: { id: 'u1', email: 'a@b.c', name: 'A' },
    });
    prisma.client.userProfile.findUnique.mockResolvedValue({
      id: 'p1',
      organizationId: 'o1',
      departmentId: null,
      clientId: null,
      status: 'ACTIVE',
      roles: [
        {
          role: {
            code: 'engineer',
            permissions: [{ permission: { code: 'tasks.read' } }],
          },
        },
      ],
    });

    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(ForbiddenException);
  });
});
