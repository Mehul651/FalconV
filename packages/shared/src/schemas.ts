import { z } from 'zod';
import { ASSIGNABLE_ROLE_CODES } from './permissions';
import {
  CLIENT_CATEGORIES,
  CLIENT_STATUSES,
  DOCUMENT_CATEGORIES,
  ISSUE_SEVERITIES,
  ISSUE_STATUSES,
  KPI_SOURCES,
  PERIOD_PATTERN,
  PROJECT_STATUSES,
  REQUEST_CATEGORIES,
  REQUEST_PRIORITIES,
  SERVICE_REQUEST_STATUSES,
  TASK_STATUSES,
  USER_STATUSES,
  RISK_STATUSES,
  RISK_LIKELIHOODS,
  CAPA_STATUSES,
} from './enums';

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(10).max(128),
  jobTitle: z.string().max(120).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(10).max(128),
  confirmPassword: z.string().min(10).max(128),
}).refine((value) => value.password === value.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const inviteUserSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  roleCode: z.enum(ASSIGNABLE_ROLE_CODES),
  departmentId: z.string().uuid().optional().nullable(),
  jobTitle: z.string().max(120).optional(),
});

export const approveUserSchema = z.object({
  roleCode: z.enum(ASSIGNABLE_ROLE_CODES),
  departmentId: z.string().uuid().optional().nullable(),
  jobTitle: z.string().max(120).optional(),
});

export const rejectUserSchema = z.object({
  reason: z.string().min(3).max(500),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(16),
  name: z.string().min(2).max(120),
  password: z.string().min(10).max(128),
});

export const userStatusSchema = z.enum(USER_STATUSES);

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type ApproveUserInput = z.infer<typeof approveUserSchema>;
export type RejectUserInput = z.infer<typeof rejectUserSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

export const upsertClientSchema = z.object({
  name: z.string().min(2).max(160),
  legalName: z.string().max(200).optional().nullable(),
  status: z.enum(CLIENT_STATUSES).optional(),
  category: z.enum(CLIENT_CATEGORIES).optional(),
  industry: z.string().max(120).optional().nullable(),
  website: z.union([z.string().url(), z.literal('')]).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
});

export const upsertContactSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().max(40).optional().nullable(),
  title: z.string().max(120).optional().nullable(),
  isPrimary: z.boolean().optional(),
});

export const onboardClientSchema = upsertClientSchema.extend({
  website: z.preprocess((value) => {
    if (value == null || value === '') return '';
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return '';
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }, z.union([z.string().url(), z.literal('')]).optional().nullable()),
  primaryContact: z.preprocess((value) => {
    if (!value || typeof value !== 'object') return undefined;
    const record = value as { name?: unknown; email?: unknown; phone?: unknown; title?: unknown };
    const name = typeof record.name === 'string' ? record.name.trim() : '';
    const extra = [record.email, record.phone, record.title].some(
      (item) => typeof item === 'string' && item.trim().length > 0,
    );
    if (!name && !extra) return undefined;
    return { ...record, name };
  }, upsertContactSchema.optional()),
});

export const createServiceRequestSchema = z.object({
  clientId: z.string().uuid(),
  title: z.string().min(4).max(200),
  description: z.string().min(10).max(8000),
  category: z.enum(REQUEST_CATEGORIES),
  priority: z.enum(REQUEST_PRIORITIES),
  requestedDelivery: z.string().optional().nullable(),
});

export const transitionServiceRequestSchema = z.object({
  toStatus: z.enum(SERVICE_REQUEST_STATUSES),
  comment: z.string().max(2000).optional(),
  assignedReviewerId: z.string().uuid().optional().nullable(),
});

export type UpsertClientInput = z.infer<typeof upsertClientSchema>;
export type UpsertContactInput = z.infer<typeof upsertContactSchema>;
export type OnboardClientInput = z.infer<typeof onboardClientSchema>;
export type CreateServiceRequestInput = z.infer<typeof createServiceRequestSchema>;
export type TransitionServiceRequestInput = z.infer<typeof transitionServiceRequestSchema>;

export const createProjectSchema = z.object({
  serviceRequestId: z.string().uuid(),
  name: z.string().min(3).max(200),
  description: z.string().max(8000).optional().nullable(),
  managerId: z.string().uuid().optional().nullable(),
  priority: z.enum(REQUEST_PRIORITIES).optional(),
  startDate: z.string().optional().nullable(),
  targetDate: z.string().optional().nullable(),
  memberIds: z.array(z.string().uuid()).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  description: z.string().max(8000).optional().nullable(),
  managerId: z.string().uuid().optional().nullable(),
  status: z.enum(PROJECT_STATUSES).optional(),
  priority: z.enum(REQUEST_PRIORITIES).optional(),
  startDate: z.string().optional().nullable(),
  targetDate: z.string().optional().nullable(),
});

export const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(3).max(200),
  description: z.string().max(8000).optional().nullable(),
  priority: z.enum(REQUEST_PRIORITIES).optional(),
  assigneeId: z.string().uuid().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  labels: z.array(z.string()).optional(),
});

export const transitionTaskSchema = z.object({
  toStatus: z.enum(TASK_STATUSES),
});

export const updateTaskSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(8000).optional().nullable(),
  priority: z.enum(REQUEST_PRIORITIES).optional(),
  assigneeId: z.string().uuid().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  labels: z.array(z.string()).optional(),
  sortOrder: z.number().int().optional(),
});

export const createIssueSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(3).max(200),
  description: z.string().min(5).max(8000),
  severity: z.enum(ISSUE_SEVERITIES),
  priority: z.enum(REQUEST_PRIORITIES).optional(),
  assigneeId: z.string().uuid().optional().nullable(),
  reproductionSteps: z.string().max(4000).optional().nullable(),
  expectedBehavior: z.string().max(4000).optional().nullable(),
  actualBehavior: z.string().max(4000).optional().nullable(),
});

export const transitionIssueSchema = z.object({
  toStatus: z.enum(ISSUE_STATUSES),
  assigneeId: z.string().uuid().optional().nullable(),
  resolution: z.string().max(4000).optional().nullable(),
});

export const createDocumentSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(3).max(200),
  category: z.enum(DOCUMENT_CATEGORIES),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TransitionTaskInput = z.infer<typeof transitionTaskSchema>;
export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type TransitionIssueInput = z.infer<typeof transitionIssueSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const createKpiDefinitionSchema = z.object({
  code: z.string().min(2).max(40).transform((value) => value.toUpperCase()),
  name: z.string().min(3).max(200),
  description: z.string().max(4000).optional().nullable(),
  unit: z.string().min(1).max(40),
  source: z.enum(KPI_SOURCES),
  formula: z.string().max(500).optional().nullable(),
});

export const createKpiRecordSchema = z.object({
  definitionId: z.string().uuid(),
  period: z.string().regex(PERIOD_PATTERN),
  value: z.number(),
  notes: z.string().max(2000).optional().nullable(),
});

export const createBudgetSchema = z.object({
  name: z.string().min(3).max(200),
  fiscalYear: z.number().int().min(2000).max(2100),
  amount: z.number().nonnegative(),
  currency: z.string().length(3).default('USD'),
  departmentId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
});

export const createExpenditureSchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.string().length(3).default('USD'),
  occurredOn: z.string(),
  category: z.string().min(2).max(80),
  description: z.string().min(3).max(2000),
  budgetId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
});

export const reviewImportSchema = z.object({
  comment: z.string().max(2000).optional().nullable(),
});

export type CreateKpiDefinitionInput = z.infer<typeof createKpiDefinitionSchema>;
export type CreateKpiRecordInput = z.infer<typeof createKpiRecordSchema>;
export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type CreateExpenditureInput = z.infer<typeof createExpenditureSchema>;
export type ReviewImportInput = z.infer<typeof reviewImportSchema>;

export const createRiskSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(5).max(8000),
  severity: z.enum(ISSUE_SEVERITIES),
  likelihood: z.enum(RISK_LIKELIHOODS),
  ownerId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
});

export const transitionRiskSchema = z.object({
  toStatus: z.enum(RISK_STATUSES),
});

export const createCapaSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(5).max(8000),
  ownerId: z.string().uuid(),
  dueOn: z.string().min(8).max(40),
  riskId: z.string().uuid().optional().nullable(),
});

export const transitionCapaSchema = z.object({
  toStatus: z.enum(CAPA_STATUSES),
  verificationNotes: z.string().max(4000).optional().nullable(),
});

export type CreateRiskInput = z.infer<typeof createRiskSchema>;
export type TransitionRiskInput = z.infer<typeof transitionRiskSchema>;
export type CreateCapaInput = z.infer<typeof createCapaSchema>;
export type TransitionCapaInput = z.infer<typeof transitionCapaSchema>;
