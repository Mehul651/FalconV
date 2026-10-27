import { createHash } from 'node:crypto';
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(__dirname, '../../../.env') });
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
  ROLE_CODES,
  ROLE_LABELS,
} from '@falconv/shared';
import { hashPassword } from 'better-auth/crypto';
import { randomBytes } from 'node:crypto';
import { prisma } from './index';

const BLOCKED_SEED_EMAILS = new Set(['admin@falconv.local']);

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: 'falconv' },
    update: {},
    create: {
      name: 'FalconV',
      slug: 'falconv',
      defaultCurrency: 'USD',
    },
  });

  const departmentSpecs = [
    { name: 'Executive', code: 'EXEC' },
    { name: 'Engineering', code: 'ENG' },
    { name: 'Quality', code: 'QA' },
    { name: 'Finance', code: 'FIN' },
    { name: 'Operations', code: 'OPS' },
  ];

  for (const dept of departmentSpecs) {
    await prisma.department.upsert({
      where: {
        organizationId_code: {
          organizationId: organization.id,
          code: dept.code,
        },
      },
      update: { name: dept.name },
      create: {
        organizationId: organization.id,
        name: dept.name,
        code: dept.code,
      },
    });
  }

  for (const code of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, description: code },
    });
  }

  const permissions = await prisma.permission.findMany();
  const permissionByCode = new Map(permissions.map((item) => [item.code, item]));

  for (const code of ROLE_CODES) {
    const role = await prisma.role.upsert({
      where: { code },
      update: { name: ROLE_LABELS[code] },
      create: {
        code,
        name: ROLE_LABELS[code],
        description: ROLE_LABELS[code],
      },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    const assigned = DEFAULT_ROLE_PERMISSIONS[code];
    await prisma.rolePermission.createMany({
      data: assigned
        .map((permissionCode) => permissionByCode.get(permissionCode))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .map((permission) => ({
          roleId: role.id,
          permissionId: permission.id,
        })),
    });
  }

  const executive = await prisma.department.findFirstOrThrow({
    where: { organizationId: organization.id, code: 'EXEC' },
  });
  const superAdminRole = await prisma.role.findUniqueOrThrow({
    where: { code: 'super_admin' },
  });

  const existingSuperAdmin = await prisma.userRole.findFirst({
    where: { roleId: superAdminRole.id },
    include: { userProfile: { include: { user: { select: { email: true } } } } },
  });

  let seedActorProfileId: string | null = existingSuperAdmin?.userProfileId ?? null;

  if (existingSuperAdmin) {
    console.log(
      `Seed: super_admin already present (${existingSuperAdmin.userProfile.user.email}); not creating or updating any administrator password.`,
    );
  } else {
    const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.SEED_ADMIN_PASSWORD;
    const name = process.env.SEED_ADMIN_NAME?.trim() || 'FalconV Super Admin';
    if (!email || !password) {
      throw new Error(
        'No Super Admin exists. Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env to create the first administrator. FalconV does not ship a default admin account.',
      );
    }
    if (BLOCKED_SEED_EMAILS.has(email)) {
      throw new Error('The default admin@falconv.local account is not allowed.');
    }
    if (password.length < 10) {
      throw new Error('SEED_ADMIN_PASSWORD must be at least 10 characters.');
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const userId = randomBytes(16).toString('hex');
      user = await prisma.user.create({
        data: {
          id: userId,
          name,
          email,
          emailVerified: true,
        },
      });
      await prisma.account.create({
        data: {
          id: randomBytes(16).toString('hex'),
          accountId: userId,
          providerId: 'credential',
          userId,
          password: await hashPassword(password),
        },
      });
    }

    let profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
    if (!profile) {
      profile = await prisma.userProfile.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          departmentId: executive.id,
          status: 'ACTIVE',
          jobTitle: 'Super Admin',
        },
      });
    }

    await prisma.userRole.upsert({
      where: {
        userProfileId_roleId: {
          userProfileId: profile.id,
          roleId: superAdminRole.id,
        },
      },
      update: {},
      create: {
        userProfileId: profile.id,
        roleId: superAdminRole.id,
      },
    });
    seedActorProfileId = profile.id;
  }

  const kpiDefinitions = [
    {
      code: 'ACTIVE_PROJECTS',
      name: 'Active projects',
      unit: 'count',
      source: 'CALCULATED' as const,
      formula: 'Count of projects in PLANNED, ACTIVE, ON_HOLD, or AT_RISK',
    },
    {
      code: 'OPEN_ISSUES',
      name: 'Open issues',
      unit: 'count',
      source: 'CALCULATED' as const,
      formula: 'Count of issues not CLOSED',
    },
    {
      code: 'TASK_COMPLETION_PCT',
      name: 'Task completion',
      unit: '%',
      source: 'CALCULATED' as const,
      formula: 'DONE tasks / all tasks × 100',
    },
    {
      code: 'OPEN_SERVICE_REQUESTS',
      name: 'Open service requests',
      unit: 'count',
      source: 'CALCULATED' as const,
      formula: 'Requests not REJECTED or PROJECT_CREATED',
    },
    {
      code: 'UTILIZATION_PCT',
      name: 'Utilization',
      unit: '%',
      source: 'IMPORTED' as const,
      formula: 'Imported; unpublished rows never affect approved totals',
    },
  ];

  for (const definition of kpiDefinitions) {
    await prisma.kpiDefinition.upsert({
      where: {
        organizationId_code: {
          organizationId: organization.id,
          code: definition.code,
        },
      },
      update: {
        name: definition.name,
        unit: definition.unit,
        formula: definition.formula,
      },
      create: {
        organizationId: organization.id,
        ...definition,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      organizationId: organization.id,
      actorProfileId: seedActorProfileId,
      action: 'seed.completed',
      resourceType: 'Organization',
      resourceId: organization.id,
      metadata: {
        checksum: createHash('sha256').update(organization.slug).digest('hex').slice(0, 12),
      },
    },
  });

  console.log(`Seeded organization ${organization.slug}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
