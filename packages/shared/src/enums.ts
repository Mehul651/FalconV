export const USER_STATUSES = [
  'INVITED',
  'PENDING_APPROVAL',
  'ACTIVE',
  'REJECTED',
  'DISABLED',
] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export const CLIENT_STATUSES = ['PROSPECT', 'ACTIVE', 'ON_HOLD', 'INACTIVE'] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const CLIENT_CATEGORIES = ['ENTERPRISE', 'SMB', 'GOVERNMENT', 'INTERNAL', 'OTHER'] as const;
export type ClientCategory = (typeof CLIENT_CATEGORIES)[number];

export const REQUEST_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type RequestPriority = (typeof REQUEST_PRIORITIES)[number];

export const REQUEST_CATEGORIES = ['NEW_WORK', 'CHANGE', 'SUPPORT', 'ASSESSMENT', 'OTHER'] as const;
export type RequestCategory = (typeof REQUEST_CATEGORIES)[number];

export const SERVICE_REQUEST_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'TRIAGE',
  'FEASIBILITY',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'RETURNED_FOR_REVISION',
  'PROJECT_CREATED',
] as const;
export type ServiceRequestStatus = (typeof SERVICE_REQUEST_STATUSES)[number];

export const SERVICE_REQUEST_TRANSITIONS: Record<
  ServiceRequestStatus,
  ServiceRequestStatus[]
> = {
  SUBMITTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['TRIAGE', 'RETURNED_FOR_REVISION'],
  TRIAGE: ['FEASIBILITY', 'RETURNED_FOR_REVISION'],
  FEASIBILITY: ['PENDING_APPROVAL', 'REJECTED', 'RETURNED_FOR_REVISION'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'RETURNED_FOR_REVISION'],
  RETURNED_FOR_REVISION: ['SUBMITTED'],
  APPROVED: ['PROJECT_CREATED'],
  REJECTED: [],
  PROJECT_CREATED: [],
};

export function canTransitionRequest(
  from: ServiceRequestStatus,
  to: ServiceRequestStatus,
): boolean {
  return SERVICE_REQUEST_TRANSITIONS[from].includes(to);
}

export const SERVICE_REQUEST_STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  TRIAGE: 'Triage',
  FEASIBILITY: 'Feasibility Assessment',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  RETURNED_FOR_REVISION: 'Returned for Revision',
  PROJECT_CREATED: 'Project Created',
};

export const PROJECT_STATUSES = [
  'PLANNED',
  'ACTIVE',
  'ON_HOLD',
  'AT_RISK',
  'COMPLETED',
  'CANCELLED',
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNED: 'Planned',
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  AT_RISK: 'At Risk',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const TASK_STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  BACKLOG: 'Backlog',
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  BLOCKED: 'Blocked',
  DONE: 'Done',
};

export const TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  BACKLOG: ['TODO'],
  TODO: ['IN_PROGRESS', 'BACKLOG'],
  IN_PROGRESS: ['IN_REVIEW', 'BLOCKED', 'TODO'],
  IN_REVIEW: ['DONE', 'IN_PROGRESS', 'BLOCKED'],
  BLOCKED: ['TODO', 'IN_PROGRESS'],
  DONE: ['TODO'],
};

export function canTransitionTask(from: TaskStatus, to: TaskStatus): boolean {
  return from === to || TASK_TRANSITIONS[from].includes(to);
}

export const ISSUE_STATUSES = [
  'OPEN',
  'TRIAGED',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'VERIFICATION',
  'CLOSED',
] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  OPEN: 'Open',
  TRIAGED: 'Triaged',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  VERIFICATION: 'Verification',
  CLOSED: 'Closed',
};

export const ISSUE_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  OPEN: ['TRIAGED'],
  TRIAGED: ['ASSIGNED'],
  ASSIGNED: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['VERIFICATION'],
  VERIFICATION: ['CLOSED', 'OPEN'],
  CLOSED: ['OPEN'],
};

export function canTransitionIssue(from: IssueStatus, to: IssueStatus): boolean {
  return ISSUE_TRANSITIONS[from].includes(to);
}

export const ISSUE_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];

export const DOCUMENT_CATEGORIES = [
  'DRAWING',
  'SPEC',
  'TEST_REPORT',
  'DESIGN_REVIEW',
  'QUALITY',
  'DELIVERY',
  'OTHER',
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_STATUSES = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'SUPERSEDED'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const KPI_SOURCES = ['CALCULATED', 'IMPORTED', 'MANUAL'] as const;
export type KpiSource = (typeof KPI_SOURCES)[number];

export const APPROVAL_RECORD_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'] as const;
export type ApprovalRecordStatus = (typeof APPROVAL_RECORD_STATUSES)[number];

export const IMPORT_KINDS = ['KPI', 'EXPENDITURE'] as const;
export type ImportKind = (typeof IMPORT_KINDS)[number];

export const IMPORT_BATCH_STATUSES = ['UPLOADED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'] as const;
export type ImportBatchStatus = (typeof IMPORT_BATCH_STATUSES)[number];

export const RISK_STATUSES = ['OPEN', 'MITIGATING', 'CLOSED'] as const;
export type RiskStatus = (typeof RISK_STATUSES)[number];

export const RISK_STATUS_LABELS: Record<RiskStatus, string> = {
  OPEN: 'Open',
  MITIGATING: 'Mitigating',
  CLOSED: 'Closed',
};

export const RISK_TRANSITIONS: Record<RiskStatus, RiskStatus[]> = {
  OPEN: ['MITIGATING'],
  MITIGATING: ['CLOSED', 'OPEN'],
  CLOSED: ['OPEN'],
};

export function canTransitionRisk(from: RiskStatus, to: RiskStatus): boolean {
  return RISK_TRANSITIONS[from].includes(to);
}

export const RISK_LIKELIHOODS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type RiskLikelihood = (typeof RISK_LIKELIHOODS)[number];

export const CAPA_STATUSES = ['OPEN', 'IN_PROGRESS', 'VERIFIED'] as const;
export type CapaStatus = (typeof CAPA_STATUSES)[number];

export const CAPA_STATUS_LABELS: Record<CapaStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  VERIFIED: 'Verified',
};

export const CAPA_TRANSITIONS: Record<CapaStatus, CapaStatus[]> = {
  OPEN: ['IN_PROGRESS'],
  IN_PROGRESS: ['VERIFIED', 'OPEN'],
  VERIFIED: ['OPEN'],
};

export function canTransitionCapa(from: CapaStatus, to: CapaStatus): boolean {
  return CAPA_TRANSITIONS[from].includes(to);
}

export const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isApprovedStatus(status: string): status is 'APPROVED' {
  return status === 'APPROVED';
}

export function sumApprovedValues(rows: Array<{ status: string; value: number }>): number {
  return rows.filter((row) => isApprovedStatus(row.status)).reduce((sum, row) => sum + row.value, 0);
}

export type KpiImportInputRow = {
  rowNumber: number;
  code?: string;
  period?: string;
  value?: string;
  notes?: string;
};

export type ExpenditureImportInputRow = {
  rowNumber: number;
  date?: string;
  amount?: string;
  currency?: string;
  category?: string;
  description?: string;
  projectNumber?: string;
};

export type ParsedImportLine = {
  rowNumber: number;
  code?: string;
  period?: string;
  amount?: number;
  currency?: string;
  occurredOn?: string;
  projectNumber?: string;
  notes?: string;
  error?: string;
};

export function parseKpiImportRow(row: KpiImportInputRow): ParsedImportLine {
  const code = row.code?.trim().toUpperCase();
  const period = row.period?.trim();
  const rawValue = row.value?.trim();
  const value = rawValue ? Number(rawValue) : NaN;
  let error: string | undefined;
  if (!code) {
    error = 'KPI code is required';
  } else if (!period || !PERIOD_PATTERN.test(period)) {
    error = 'Period must be YYYY-MM';
  } else if (!Number.isFinite(value)) {
    error = 'Value must be a number';
  }
  return {
    rowNumber: row.rowNumber,
    code,
    period,
    amount: Number.isFinite(value) ? value : undefined,
    notes: row.notes?.trim(),
    error,
  };
}

export function parseExpenditureImportRow(row: ExpenditureImportInputRow): ParsedImportLine {
  const amount = row.amount?.trim() ? Number(row.amount.trim()) : NaN;
  const currency = (row.currency?.trim() || 'USD').toUpperCase();
  const occurredOn = row.date?.trim();
  const category = row.category?.trim();
  const description = row.description?.trim();
  let error: string | undefined;
  if (!occurredOn || Number.isNaN(Date.parse(occurredOn))) {
    error = 'A valid date is required';
  } else if (!Number.isFinite(amount) || amount < 0) {
    error = 'Amount must be a non-negative number';
  } else if (!/^[A-Z]{3}$/.test(currency)) {
    error = 'Currency must be a 3-letter ISO code';
  } else if (!category) {
    error = 'Category is required';
  } else if (!description) {
    error = 'Description is required';
  }
  return {
    rowNumber: row.rowNumber,
    amount: Number.isFinite(amount) ? amount : undefined,
    currency,
    occurredOn,
    code: category,
    projectNumber: row.projectNumber?.trim(),
    notes: description,
    error,
  };
}

export const NAV_ITEMS = [
  { href: '/overview', label: 'Overview', icon: 'LayoutDashboard' },
  { href: '/dashboard', label: 'Executive Dashboard', icon: 'LineChart' },
  { href: '/clients', label: 'Clients', icon: 'Building2' },
  { href: '/client-status', label: 'Client Status', icon: 'Activity' },
  { href: '/service-requests', label: 'Service Requests', icon: 'ClipboardList' },
  { href: '/projects', label: 'Projects', icon: 'FolderKanban' },
  { href: '/tasks', label: 'Tasks', icon: 'ListTodo' },
  { href: '/issues', label: 'Issues', icon: 'Bug' },
  { href: '/documents', label: 'Documents', icon: 'FileText' },
  { href: '/kpi', label: 'KPI Reporting', icon: 'Gauge' },
  { href: '/expenditure', label: 'Expenditure', icon: 'Wallet' },
  { href: '/approvals', label: 'Approvals', icon: 'CheckSquare' },
  { href: '/risks', label: 'Risks', icon: 'ShieldAlert' },
  { href: '/corrective-actions', label: 'Corrective Actions', icon: 'ListChecks' },
  { href: '/notifications', label: 'Notifications', icon: 'Bell' },
  { href: '/administration', label: 'Administration', icon: 'Settings2' },
  { href: '/settings', label: 'Settings', icon: 'Settings' },
] as const;
