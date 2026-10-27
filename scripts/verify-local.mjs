/**
 * Live verification of FalconV phases 1–4 against a running API + Postgres.
 * Usage: node scripts/verify-local.mjs
 */
import { createRequire } from 'node:module';
import { unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const ExcelJS = require('../apps/api/node_modules/exceljs');

const BASE = process.env.WEB_URL ?? 'http://localhost:3000';
const ADMIN_EMAIL = process.env.VERIFY_ADMIN_EMAIL ?? process.env.SEED_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.VERIFY_ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  throw new Error(
    'Set VERIFY_ADMIN_EMAIL and VERIFY_ADMIN_PASSWORD (or SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD) in the environment. FalconV does not ship a default administrator password.',
  );
}
const results = [];

function okStatus(status) {
  return status === 200 || status === 201;
}

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function absorbCookies(jar, response) {
  const raw = response.headers.getSetCookie?.() ?? [];
  for (const line of raw) {
    const part = line.split(';')[0];
    const eq = part.indexOf('=');
    if (eq > 0) {
      jar.set(part.slice(0, eq), part.slice(eq + 1));
    }
  }
}

async function req(jar, path, init = {}) {
  const headers = {
    Origin: BASE,
    Referer: `${BASE}/`,
    ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    ...(init.headers ?? {}),
  };
  if (jar) {
    headers.cookie = cookieHeader(jar);
  }
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    redirect: 'manual',
    headers,
  });
  if (jar) {
    absorbCookies(jar, response);
  }
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: response.status, data, headers: response.headers };
}

async function json(jar, path, method, body) {
  return req(jar, path, { method, body: body === undefined ? undefined : JSON.stringify(body) });
}

async function writeXlsx(kind, rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(kind);
  if (kind === 'KPI') {
    sheet.addRow(['code', 'period', 'value', 'notes']);
    for (const row of rows) {
      sheet.addRow([row.code, row.period, row.value, row.notes ?? '']);
    }
  } else {
    sheet.addRow(['date', 'amount', 'currency', 'category', 'description', 'projectNumber']);
    for (const row of rows) {
      sheet.addRow([row.date, row.amount, row.currency, row.category, row.description, row.projectNumber ?? '']);
    }
  }
  const path = join(tmpdir(), `falconv-${kind}-${Date.now()}.xlsx`);
  await workbook.xlsx.writeFile(path);
  return path;
}

async function main() {
  const healthDirect = await fetch('http://127.0.0.1:3001/api/health').then((r) => r.json());
  record('API health database up', healthDirect.database === 'up', healthDirect.status);

  const unauth = await json(null, '/api/v1/clients', 'GET');
  record('Unauthenticated clients list is 401', unauth.status === 401, String(unauth.status));

  const admin = new Map();
  const login = await json(admin, '/api/auth/sign-in/email', 'POST', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  if (login.status !== 200) {
    console.log('sign-in body', login.data);
  }
  record('Super Admin sign-in', login.status === 200, String(login.status));
  const me1 = await json(admin, '/api/v1/users/me', 'GET');
  record('Session /users/me after login', me1.status === 200 && me1.data?.status === 'ACTIVE', me1.data?.status);
  record('Super Admin has users.approve', Array.isArray(me1.data?.permissions) && me1.data.permissions.includes('users.approve'));
  const me2 = await json(admin, '/api/v1/users/me', 'GET');
  record('Session persists across requests', me2.status === 200 && me2.data?.id === me1.data?.id);

  const stamp = Date.now();
  const pendingEmail = `pending.${stamp}@falconv.test`;
  const rejectEmail = `reject.${stamp}@falconv.test`;
  const engineerEmail = `engineer.${stamp}@falconv.test`;
  const password = 'VerifyUser!12345';

  const pendingReg = await json(null, '/api/v1/auth/register', 'POST', {
    name: 'Pending Person',
    email: pendingEmail,
    password,
    jobTitle: 'Applicant',
  });
  record('Public registration', pendingReg.status === 201 || pendingReg.status === 200, String(pendingReg.status));

  const rejectReg = await json(null, '/api/v1/auth/register', 'POST', {
    name: 'Reject Person',
    email: rejectEmail,
    password,
    jobTitle: 'Applicant',
  });
  record('Second public registration', rejectReg.status === 201 || rejectReg.status === 200, String(rejectReg.status));

  const engineerReg = await json(null, '/api/v1/auth/register', 'POST', {
    name: 'Engineer Person',
    email: engineerEmail,
    password,
    jobTitle: 'Engineer',
  });
  record('Engineer registration', engineerReg.status === 201 || engineerReg.status === 200, String(engineerReg.status));

  const pendingLogin = new Map();
  const pendingSignIn = await json(pendingLogin, '/api/auth/sign-in/email', 'POST', {
    email: pendingEmail,
    password,
  });
  const pendingMe = await json(pendingLogin, '/api/v1/users/me', 'GET');
  record(
    'Pending user can authenticate but is PENDING_APPROVAL',
    pendingSignIn.status === 200 && pendingMe.data?.status === 'PENDING_APPROVAL',
    pendingMe.data?.status,
  );
  const pendingClients = await json(pendingLogin, '/api/v1/clients', 'GET');
  record('Pending user blocked from operational module', pendingClients.status === 403, String(pendingClients.status));

  const queue = await json(admin, '/api/v1/users/pending', 'GET');
  record('Admin can list pending users', queue.status === 200 && Array.isArray(queue.data), String(queue.status));
  const pendingRow = (queue.data ?? []).find((row) => row.user?.email === pendingEmail);
  const rejectRow = (queue.data ?? []).find((row) => row.user?.email === rejectEmail);
  const engineerRow = (queue.data ?? []).find((row) => row.user?.email === engineerEmail);
  record('Pending users appear in approval queue', Boolean(pendingRow && rejectRow && engineerRow));

  const depts = await json(admin, '/api/v1/departments', 'GET');
  const engDept = (depts.data ?? []).find((d) => d.code === 'ENG') ?? depts.data?.[0];

  const approved = await json(admin, `/api/v1/users/${pendingRow?.id}/approve`, 'POST', {
    roleCode: 'project_manager',
    departmentId: engDept?.id,
    jobTitle: 'PM',
  });
  record('Admin approves pending user as project_manager', approved.status === 200 || approved.status === 201, String(approved.status));

  const rejected = await json(admin, `/api/v1/users/${rejectRow?.id}/reject`, 'POST', {
    reason: 'Not a fit for this verification run',
  });
  record('Admin rejects a registration', rejected.status === 200 || rejected.status === 201, String(rejected.status));

  const engApproved = await json(admin, `/api/v1/users/${engineerRow?.id}/approve`, 'POST', {
    roleCode: 'engineer',
    departmentId: engDept?.id,
    jobTitle: 'Engineer',
  });
  record('Admin approves engineer', engApproved.status === 200 || engApproved.status === 201, String(engApproved.status));

  const afterApprove = new Map();
  const afterLogin = await json(afterApprove, '/api/auth/sign-in/email', 'POST', {
    email: pendingEmail,
    password,
  });
  const afterMe = await json(afterApprove, '/api/v1/users/me', 'GET');
  record(
    'Approved user can sign in as ACTIVE',
    afterLogin.status === 200 && afterMe.data?.status === 'ACTIVE',
    afterMe.data?.status,
  );

  const rejectLogin = new Map();
  const rejectSign = await json(rejectLogin, '/api/auth/sign-in/email', 'POST', {
    email: rejectEmail,
    password,
  });
  const rejectMe = await json(rejectLogin, '/api/v1/users/me', 'GET');
  record(
    'Rejected user cannot use the app',
    rejectSign.status >= 400 || rejectMe.status === 403 || rejectMe.data?.status === 'REJECTED',
    `sign-in ${rejectSign.status} me ${rejectMe.status}`,
  );

  const engineer = new Map();
  await json(engineer, '/api/auth/sign-in/email', 'POST', { email: engineerEmail, password });
  const engMe = await json(engineer, '/api/v1/users/me', 'GET');
  record('Engineer session is ACTIVE', engMe.data?.status === 'ACTIVE', engMe.data?.status);
  const engInvite = await json(engineer, '/api/v1/users/invite', 'POST', {
    name: 'Nope',
    email: `nope.${stamp}@falconv.test`,
    roleCode: 'engineer',
  });
  record('Engineer cannot invite users', engInvite.status === 403, String(engInvite.status));

  const client = await json(admin, '/api/v1/clients', 'POST', {
    name: `Verify Client ${stamp}`,
    status: 'ACTIVE',
    category: 'ENTERPRISE',
    industry: 'Verification',
  });
  record('Create client', client.status === 201 || client.status === 200, String(client.status));
  const clientId = client.data?.id;
  const contact = await json(admin, `/api/v1/clients/${clientId}/contacts`, 'POST', {
    name: 'Primary Contact',
    email: `contact.${stamp}@example.com`,
    isPrimary: true,
  });
  record('Create contact', contact.status === 201 || contact.status === 200, String(contact.status));

  const request = await json(admin, '/api/v1/service-requests', 'POST', {
    clientId,
    title: `Verify request ${stamp}`,
    description: 'End-to-end verification of intake through delivery.',
    category: 'NEW_WORK',
    priority: 'HIGH',
  });
  record('Submit service request', Boolean(request.data?.id), String(request.status));
  const requestId = request.data?.id;
  const flow = ['UNDER_REVIEW', 'TRIAGE', 'FEASIBILITY', 'PENDING_APPROVAL', 'APPROVED'];
  let last = request;
  for (const toStatus of flow) {
    last = await json(admin, `/api/v1/service-requests/${requestId}/transition`, 'POST', {
      toStatus,
      comment: `Move to ${toStatus}`,
    });
    record(`Request → ${toStatus}`, okStatus(last.status) && last.data?.status === toStatus, last.data?.detail ?? String(last.status));
  }
  const skip = await json(admin, `/api/v1/service-requests/${requestId}/transition`, 'POST', {
    toStatus: 'PROJECT_CREATED',
    comment: 'should fail',
  });
  record('Direct PROJECT_CREATED via transition is blocked', skip.status >= 400, String(skip.status));

  const project = await json(admin, '/api/v1/projects', 'POST', {
    serviceRequestId: requestId,
    name: `Verify Project ${stamp}`,
    description: 'Created from approved request',
  });
  record('Create project from approved request', Boolean(project.data?.id), project.data?.detail ?? String(project.status));
  const projectId = project.data?.id;
  const dup = await json(admin, '/api/v1/projects', 'POST', {
    serviceRequestId: requestId,
    name: 'Duplicate should fail',
  });
  record('Duplicate project from same request is prevented', dup.status >= 400, String(dup.status));

  const task = await json(admin, '/api/v1/tasks', 'POST', {
    projectId,
    title: 'Verification task',
  });
  record('Create task', Boolean(task.data?.id), String(task.status));
  const taskId = task.data?.id;
  const invalidMove = await json(admin, `/api/v1/tasks/${taskId}/transition`, 'POST', { toStatus: 'DONE' });
  record('Invalid Kanban jump BACKLOG→DONE rejected', invalidMove.status >= 400, String(invalidMove.status));
  const toTodo = await json(admin, `/api/v1/tasks/${taskId}/transition`, 'POST', { toStatus: 'TODO' });
  record('Task BACKLOG→TODO', okStatus(toTodo.status) && toTodo.data?.status === 'TODO', String(toTodo.status));
  const toProg = await json(admin, `/api/v1/tasks/${taskId}/transition`, 'POST', { toStatus: 'IN_PROGRESS' });
  record('Task TODO→IN_PROGRESS', okStatus(toProg.status) && toProg.data?.status === 'IN_PROGRESS', String(toProg.status));

  const issue = await json(admin, '/api/v1/issues', 'POST', {
    projectId,
    title: 'Verification issue',
    description: 'Need to complete the issue lifecycle.',
    severity: 'MEDIUM',
    priority: 'MEDIUM',
  });
  record('Create issue', Boolean(issue.data?.id), String(issue.status));
  const issueId = issue.data?.id;
  const issueFlow = [
    ['TRIAGED', {}],
    ['ASSIGNED', { assigneeId: me1.data?.profileId }],
    ['IN_PROGRESS', {}],
    ['RESOLVED', { resolution: 'Fixed in verification' }],
    ['VERIFICATION', {}],
    ['CLOSED', { resolution: 'Verified closed' }],
  ];
  for (const [toStatus, extra] of issueFlow) {
    const moved = await json(admin, `/api/v1/issues/${issueId}/transition`, 'POST', { toStatus, ...extra });
    record(`Issue → ${toStatus}`, okStatus(moved.status) && moved.data?.status === toStatus, moved.data?.detail ?? String(moved.status));
  }

  const doc = await json(admin, '/api/v1/documents', 'POST', {
    projectId,
    title: 'Verification drawing',
    category: 'DRAWING',
  });
  record('Create document record', Boolean(doc.data?.id), String(doc.status));
  const docId = doc.data?.id;
  async function uploadVersion(name, body) {
    const form = new FormData();
    form.append('file', new Blob([body], { type: 'text/plain' }), name);
    return req(admin, `/api/v1/documents/${docId}/versions`, { method: 'POST', body: form });
  }
  const v1 = await uploadVersion('spec-v1.txt', 'version one');
  const v2 = await uploadVersion('spec-v2.txt', 'version two');
  record('Upload document v1', v1.status === 201 || v1.status === 200, String(v1.status));
  record('Upload document v2', v2.status === 201 || v2.status === 200, String(v2.status));
  const docGet = await json(admin, `/api/v1/documents/${docId}`, 'GET');
  record('Document has two versions', (docGet.data?.versions?.length ?? 0) >= 2, String(docGet.data?.versions?.length));

  const kpiBefore = await json(admin, '/api/v1/kpi', 'GET');
  const calc = (kpiBefore.data?.calculated ?? []).find((row) => row.code === 'ACTIVE_PROJECTS');
  record('Live calculated KPI ACTIVE_PROJECTS >= 1', Number(calc?.value) >= 1, String(calc?.value));
  const approvedKpiBefore = (kpiBefore.data?.approvedRecords ?? []).length;

  const def = await json(admin, '/api/v1/kpi/definitions', 'POST', {
    code: `HEADCOUNT_${stamp}`,
    name: 'Headcount',
    unit: 'count',
    source: 'IMPORTED',
  });
  record('Create imported KPI definition', Boolean(def.data?.id), def.data?.detail ?? String(def.status));

  const validPath = await writeXlsx('KPI', [
    { code: def.data?.code ?? `HEADCOUNT_${stamp}`, period: '2026-10', value: 42, notes: 'valid import' },
  ]);
  const invalidPath = await writeXlsx('KPI', [{ code: 'NOPE', period: 'October', value: 'abc', notes: 'bad' }]);
  const validBuf = await (await import('node:fs/promises')).readFile(validPath);
  const invalidBuf = await (await import('node:fs/promises')).readFile(invalidPath);

  async function uploadImport(kind, buffer, filename) {
    const form = new FormData();
    form.append('kind', kind);
    form.append('file', new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
    return req(admin, '/api/v1/imports', { method: 'POST', body: form });
  }

  const invalidBatch = await uploadImport('KPI', invalidBuf, 'invalid.xlsx');
  record('Invalid Excel is stored as preview', Boolean(invalidBatch.data?.id), String(invalidBatch.status));
  const invalidLine = (invalidBatch.data?.lines ?? []).some((line) => line.error);
  record('Invalid Excel rows have validation errors', invalidLine);

  const validBatch = await uploadImport('KPI', validBuf, 'valid.xlsx');
  record('Valid Excel preview created', Boolean(validBatch.data?.id) && validBatch.data?.status === 'UPLOADED', validBatch.data?.status);
  const kpiPending = await json(admin, '/api/v1/kpi', 'GET');
  record(
    'Pending import does not add approved KPI records',
    (kpiPending.data?.approvedRecords ?? []).length === approvedKpiBefore,
    `${approvedKpiBefore} -> ${(kpiPending.data?.approvedRecords ?? []).length}`,
  );

  const submitted = await json(admin, `/api/v1/imports/${validBatch.data?.id}/submit`, 'POST', {});
  record('Submit import for approval', submitted.data?.status === 'PENDING_APPROVAL', submitted.data?.status);

  const engApprove = await json(engineer, `/api/v1/imports/${validBatch.data?.id}/approve`, 'POST', {});
  record('Engineer cannot approve/publish import', engApprove.status === 403, String(engApprove.status));

  const published = await json(admin, `/api/v1/imports/${validBatch.data?.id}/approve`, 'POST', {});
  record('Admin publishes import', okStatus(published.status) && published.data?.status === 'APPROVED', published.data?.status ?? String(published.status));
  const kpiAfter = await json(admin, '/api/v1/kpi', 'GET');
  const imported = (kpiAfter.data?.approvedRecords ?? []).find((row) => Number(row.value) === 42 || String(row.value).startsWith('42'));
  record('Approved import appears in official KPI records', Boolean(imported), imported ? `${imported.definition?.code} ${imported.value}` : 'missing');

  const financeBefore = await json(admin, '/api/v1/finance', 'GET');
  const spendBefore = financeBefore.data?.totals?.approvedSpend ?? 0;
  const budget = await json(admin, '/api/v1/finance/budgets', 'POST', {
    name: `Verify budget ${stamp}`,
    fiscalYear: 2026,
    amount: 10000,
    currency: 'USD',
  });
  record('Create budget draft', Boolean(budget.data?.id), String(budget.status));
  const financeDraft = await json(admin, '/api/v1/finance', 'GET');
  record(
    'Draft budget excluded from approved budget total',
    Number(financeDraft.data?.totals?.approvedBudget) === Number(financeBefore.data?.totals?.approvedBudget ?? 0),
    String(financeDraft.data?.totals?.approvedBudget),
  );
  const budgetOk = await json(admin, `/api/v1/finance/budgets/${budget.data?.id}/approve`, 'POST', {});
  record('Approve budget', budgetOk.data?.status === 'APPROVED', budgetOk.data?.status);

  const exp = await json(admin, '/api/v1/finance/expenditures', 'POST', {
    amount: 250,
    currency: 'USD',
    occurredOn: '2026-10-02',
    category: 'Travel',
    description: 'Verification trip',
    budgetId: budget.data?.id,
  });
  record('Create expenditure draft', Boolean(exp.data?.id), String(exp.status));
  const submittedExp = await json(admin, `/api/v1/finance/expenditures/${exp.data?.id}/submit`, 'POST', {});
  record('Submit expenditure', submittedExp.data?.status === 'PENDING_APPROVAL', submittedExp.data?.status);
  const financePending = await json(admin, '/api/v1/finance', 'GET');
  record(
    'Pending expenditure excluded from approved spend',
    Number(financePending.data?.totals?.approvedSpend) === Number(spendBefore),
    String(financePending.data?.totals?.approvedSpend),
  );
  const expOk = await json(admin, `/api/v1/finance/expenditures/${exp.data?.id}/approve`, 'POST', {});
  record('Approve expenditure', expOk.data?.status === 'APPROVED', expOk.data?.status);
  const financeAfter = await json(admin, '/api/v1/finance', 'GET');
  record(
    'Approved spend increased after publish',
    Number(financeAfter.data?.totals?.approvedSpend) >= Number(spendBefore) + 250,
    String(financeAfter.data?.totals?.approvedSpend),
  );

  const varianceBudget = (financeAfter.data?.budgets ?? []).find((row) => row.id === budget.data?.id);
  record(
    'Budget variance uses approved spend only',
    varianceBudget && Number(varianceBudget.spentApproved) >= 250,
    String(varianceBudget?.spentApproved),
  );

  const signOut = await json(admin, '/api/auth/sign-out', 'POST', {});
  record('Sign-out accepted', signOut.status === 200 || signOut.status === 204, String(signOut.status));
  const afterOut = await json(admin, '/api/v1/users/me', 'GET');
  record('Session invalid after sign-out', afterOut.status === 401, String(afterOut.status));

  await unlink(validPath).catch(() => undefined);
  await unlink(invalidPath).catch(() => undefined);

  const failed = results.filter((row) => !row.ok);
  console.log('\n--- summary ---');
  console.log(`passed ${results.filter((row) => row.ok).length}/${results.length}`);
  if (failed.length) {
    for (const row of failed) {
      console.log(`FAIL ${row.name}: ${row.detail}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
