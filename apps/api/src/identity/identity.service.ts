import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  approveUserSchema,
  inviteUserSchema,
  registerSchema,
  rejectUserSchema,
  acceptInviteSchema,
  ROLE_LABELS,
  type PermissionCode,
  type RoleCode,
} from '@falconv/shared';
import { hashPassword } from 'better-auth/crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { adminNotifyEmail, sendMail } from '../mail/mailer';
import { createInviteToken, hashInviteToken } from '../auth/auth';
import type { AuthContext } from '../common/types';

@Injectable()
export class IdentityService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  async me(user: AuthContext) {
    return {
      id: user.userId,
      email: user.email,
      name: user.name,
      profileId: user.profileId,
      organizationId: user.organizationId,
      departmentId: user.departmentId,
      clientId: user.clientId,
      status: user.status,
      roles: user.roles,
      permissions: user.permissions,
    };
  }

  async register(input: unknown, ipAddress?: string) {
    const data = registerSchema.parse(input);
    const existing = await this.prisma.client.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const organization = await this.prisma.client.organization.findUniqueOrThrow({
      where: { slug: 'falconv' },
    });
    const userId = randomBytes(16).toString('hex');
    const email = data.email.toLowerCase();

    const profile = await this.prisma.client.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: userId,
          name: data.name,
          email,
          emailVerified: false,
        },
      });
      await tx.account.create({
        data: {
          id: randomBytes(16).toString('hex'),
          accountId: userId,
          providerId: 'credential',
          userId,
          password: await hashPassword(data.password),
        },
      });
      return tx.userProfile.create({
        data: {
          userId,
          organizationId: organization.id,
          status: 'PENDING_APPROVAL',
          jobTitle: data.jobTitle,
          requestedAt: new Date(),
        },
      });
    });

    await this.notifyOwnerOfSignup({
      organizationId: organization.id,
      profileId: profile.id,
      name: data.name,
      email,
    });

    await this.audit.record({
      organizationId: organization.id,
      action: 'user.registered',
      resourceType: 'UserProfile',
      resourceId: profile.id,
      metadata: { email },
      ipAddress,
    });

    return {
      status: 'PENDING_APPROVAL' as const,
      message: 'Registration received. An administrator will review your access request.',
    };
  }

  async invite(actor: AuthContext, input: unknown, ipAddress?: string) {
    const data = inviteUserSchema.parse(input);
    const email = data.email.toLowerCase();
    const existing = await this.prisma.client.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    if (data.roleCode === 'super_admin') {
      throw new BadRequestException('Super Admin cannot be assigned through invitations');
    }
    const role = await this.prisma.client.role.findUnique({ where: { code: data.roleCode } });
    if (!role) {
      throw new BadRequestException('Unknown role');
    }

    const token = createInviteToken();
    const invite = await this.prisma.client.userInvite.create({
      data: {
        organizationId: actor.organizationId,
        email,
        name: data.name,
        tokenHash: hashInviteToken(token),
        roleId: role.id,
        departmentId: data.departmentId ?? undefined,
        jobTitle: data.jobTitle,
        invitedById: actor.profileId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    });

    const acceptUrl = `${process.env.WEB_URL ?? 'http://localhost:3000'}/invite?token=${token}`;
    const roleLabel = ROLE_LABELS[data.roleCode as RoleCode] ?? data.roleCode;
    try {
      await sendMail({
        to: email,
        subject: 'You are invited to FalconV',
        text: `Hello ${data.name}, ${adminNotifyEmail()} has invited you to FalconV as ${roleLabel}. Accept: ${acceptUrl}`,
        html: `<p>Hello ${data.name},</p><p>${adminNotifyEmail()} has invited you to FalconV as <strong>${roleLabel}</strong>.</p><p><a href="${acceptUrl}">Accept invitation</a></p>`,
      });
    } catch (error) {
      await this.audit.record({
        organizationId: actor.organizationId,
        actorProfileId: actor.profileId,
        action: 'user.invite_email_failed',
        resourceType: 'UserInvite',
        resourceId: invite.id,
        metadata: { email, detail: error instanceof Error ? error.message : 'send failed' },
        ipAddress,
      });
    }

    await this.audit.record({
      organizationId: actor.organizationId,
      actorProfileId: actor.profileId,
      action: 'user.invited',
      resourceType: 'UserInvite',
      resourceId: invite.id,
      metadata: { email, roleCode: data.roleCode },
      ipAddress,
    });

    return {
      id: invite.id,
      email,
      expiresAt: invite.expiresAt,
      ...(process.env.NODE_ENV !== 'production' ? { acceptUrl } : {}),
    };
  }

  async acceptInvite(input: unknown, ipAddress?: string) {
    const data = acceptInviteSchema.parse(input);
    const invite = await this.prisma.client.userInvite.findUnique({
      where: { tokenHash: hashInviteToken(data.token) },
    });
    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      throw new BadRequestException('Invitation is invalid or expired');
    }

    const existing = await this.prisma.client.user.findUnique({
      where: { email: invite.email },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const userId = randomBytes(16).toString('hex');
    await this.prisma.client.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: userId,
          name: data.name,
          email: invite.email,
          emailVerified: true,
        },
      });
      await tx.account.create({
        data: {
          id: randomBytes(16).toString('hex'),
          accountId: userId,
          providerId: 'credential',
          userId,
          password: await hashPassword(data.password),
        },
      });
      const profile = await tx.userProfile.create({
        data: {
          userId,
          organizationId: invite.organizationId,
          departmentId: invite.departmentId,
          status: 'ACTIVE',
          jobTitle: invite.jobTitle,
          reviewedAt: new Date(),
          reviewedByUserId: invite.invitedById,
        },
      });
      await tx.userRole.create({
        data: { userProfileId: profile.id, roleId: invite.roleId },
      });
      await tx.userInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
    });

    await this.audit.record({
      organizationId: invite.organizationId,
      action: 'user.invite_accepted',
      resourceType: 'UserInvite',
      resourceId: invite.id,
      metadata: { email: invite.email },
      ipAddress,
    });

    return { status: 'ACTIVE' as const, email: invite.email };
  }

  async listPending(organizationId: string) {
    return this.prisma.client.userProfile.findMany({
      where: { organizationId, status: 'PENDING_APPROVAL', deletedAt: null },
      include: { user: { select: { id: true, email: true, name: true, createdAt: true } } },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async listUsers(organizationId: string) {
    return this.prisma.client.userProfile.findMany({
      where: { organizationId, deletedAt: null },
      include: {
        user: { select: { id: true, email: true, name: true } },
        department: { select: { id: true, name: true, code: true } },
        roles: { include: { role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(actor: AuthContext, profileId: string, input: unknown, ipAddress?: string) {
    const data = approveUserSchema.parse(input);
    const profile = await this.prisma.client.userProfile.findFirst({
      where: { id: profileId, organizationId: actor.organizationId },
      include: { user: true },
    });
    if (!profile) {
      throw new NotFoundException('User not found');
    }
    if (profile.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Only pending users can be approved');
    }
    if (data.roleCode === 'super_admin') {
      throw new BadRequestException('Super Admin cannot be assigned through approvals');
    }
    const role = await this.prisma.client.role.findUnique({ where: { code: data.roleCode } });
    if (!role) {
      throw new BadRequestException('Unknown role');
    }

    await this.prisma.client.$transaction(async (tx) => {
      await tx.userProfile.update({
        where: { id: profile.id },
        data: {
          status: 'ACTIVE',
          departmentId: data.departmentId ?? undefined,
          jobTitle: data.jobTitle ?? profile.jobTitle,
          reviewedAt: new Date(),
          reviewedByUserId: actor.profileId,
        },
      });
      await tx.userRole.deleteMany({ where: { userProfileId: profile.id } });
      await tx.userRole.create({
        data: { userProfileId: profile.id, roleId: role.id },
      });
    });

    await this.notifications.create({
      organizationId: actor.organizationId,
      userProfileId: profile.id,
      type: 'user.approved',
      title: 'Access approved',
      body: 'Your FalconV account has been approved. You can now use the application.',
      resourceType: 'UserProfile',
      resourceId: profile.id,
    });
    try {
      await sendMail({
        to: profile.user.email,
        subject: 'FalconV access approved',
        text: `Your FalconV account has been approved by ${adminNotifyEmail()} with the ${ROLE_LABELS[data.roleCode as RoleCode] ?? data.roleCode} role. You can now sign in.`,
        html: `<p>Your FalconV account has been approved by ${adminNotifyEmail()} with the <strong>${ROLE_LABELS[data.roleCode as RoleCode] ?? data.roleCode}</strong> role.</p><p>You can now sign in.</p>`,
      });
    } catch {
      // SMTP optional in local setup
    }

    await this.audit.record({
      organizationId: actor.organizationId,
      actorProfileId: actor.profileId,
      action: 'user.approved',
      resourceType: 'UserProfile',
      resourceId: profile.id,
      metadata: { roleCode: data.roleCode },
      ipAddress,
    });

    return { status: 'ACTIVE' as const };
  }

  async reject(actor: AuthContext, profileId: string, input: unknown, ipAddress?: string) {
    const data = rejectUserSchema.parse(input);
    const profile = await this.prisma.client.userProfile.findFirst({
      where: { id: profileId, organizationId: actor.organizationId },
      include: { user: true },
    });
    if (!profile) {
      throw new NotFoundException('User not found');
    }
    if (profile.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Only pending users can be rejected');
    }

    await this.prisma.client.userProfile.update({
      where: { id: profile.id },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewedByUserId: actor.profileId,
      },
    });
    await this.prisma.client.session.deleteMany({ where: { userId: profile.userId } });

    try {
      await sendMail({
        to: profile.user.email,
        subject: 'FalconV access request update',
        text: `Your access request was not approved. Reason: ${data.reason}`,
      });
    } catch {
      // SMTP optional
    }

    await this.audit.record({
      organizationId: actor.organizationId,
      actorProfileId: actor.profileId,
      action: 'user.rejected',
      resourceType: 'UserProfile',
      resourceId: profile.id,
      metadata: { reason: data.reason },
      ipAddress,
    });

    return { status: 'REJECTED' as const };
  }

  hasPermission(user: AuthContext, permission: PermissionCode) {
    return user.permissions.includes(permission);
  }

  private async notifyOwnerOfSignup(input: {
    organizationId: string;
    profileId: string;
    name: string;
    email: string;
  }) {
    const ownerEmail = adminNotifyEmail();
    const reviewers = await this.prisma.client.userProfile.findMany({
      where: {
        organizationId: input.organizationId,
        status: 'ACTIVE',
        OR: [
          { user: { email: ownerEmail } },
          { roles: { some: { role: { code: { in: ['super_admin', 'admin'] } } } } },
        ],
      },
      include: { user: true },
    });

    const notified = new Set<string>();
    for (const reviewer of reviewers) {
      if (notified.has(reviewer.id)) {
        continue;
      }
      notified.add(reviewer.id);
      await this.notifications.create({
        organizationId: input.organizationId,
        userProfileId: reviewer.id,
        type: 'user.registration_requested',
        title: 'New access request',
        body: `${input.name} (${input.email}) requested access. Assign CSM, Admin, Engineer, or another role in Administration.`,
        resourceType: 'UserProfile',
        resourceId: input.profileId,
      });
    }

    const recipients = new Set<string>([ownerEmail, ...reviewers.map((item) => item.user.email.toLowerCase())]);
    try {
      await sendMail({
        to: [...recipients],
        subject: 'FalconV: new registration request',
        text: `${input.name} (${input.email}) requested access. Open Administration to approve and assign a role (CSM, Admin, Engineer, or another role).`,
        html: `<p>${input.name} (${input.email}) requested access to FalconV.</p><p>Open <strong>Administration</strong> to approve and assign CSM, Admin, Engineer, or another role.</p>`,
      });
    } catch (error) {
      await this.audit.record({
        organizationId: input.organizationId,
        action: 'user.registration_email_failed',
        resourceType: 'UserProfile',
        resourceId: input.profileId,
        metadata: { detail: error instanceof Error ? error.message : 'send failed' },
      });
    }
  }
}
