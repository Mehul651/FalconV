"""One-off generator for FalconV-Study-Guide.docx. Not part of the app runtime."""
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


def set_run(run, *, size=11, bold=False, color=None):
    run.font.name = "Calibri"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")
    run.font.size = Pt(size)
    run.bold = bold
    if color:
        run.font.color.rgb = color


def heading(doc, text, level=1):
    p = doc.add_heading(text, level=level)
    for run in p.runs:
        run.font.color.rgb = RGBColor(0x1C, 0x19, 0x17)
    return p


def para(doc, text, *, bold=False, italic=False):
    p = doc.add_paragraph()
    run = p.add_run(text)
    set_run(run, bold=bold)
    run.italic = italic
    p.paragraph_format.space_after = Pt(8)
    return p


def bullets(doc, items):
    for item in items:
        p = doc.add_paragraph(item, style="List Bullet")
        p.paragraph_format.space_after = Pt(2)


def numbered(doc, items):
    for item in items:
        p = doc.add_paragraph(item, style="List Number")
        p.paragraph_format.space_after = Pt(2)


def add_table(doc, headers, rows):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = "Table Grid"
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = ""
        run = cell.paragraphs[0].add_run(h)
        set_run(run, bold=True, size=10)
    for r_i, row in enumerate(rows):
        for c_i, value in enumerate(row):
            cell = table.rows[r_i + 1].cells[c_i]
            cell.text = ""
            run = cell.paragraphs[0].add_run(value)
            set_run(run, size=10)
    doc.add_paragraph()


def main():
    doc = Document()
    section = doc.sections[0]
    section.top_margin = Inches(0.9)
    section.bottom_margin = Inches(0.9)
    section.left_margin = Inches(1.0)
    section.right_margin = Inches(1.0)

    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title.add_run("FalconV")
    set_run(run, size=28, bold=True, color=RGBColor(0x1C, 0x19, 0x17))

    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = subtitle.add_run("Personal study notes — what has been built so far")
    set_run(run, size=14, color=RGBColor(0x57, 0x53, 0x4E))

    meta = doc.add_paragraph()
    meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = meta.add_run("Phases 1–4  ·  Local app  ·  18 October 2026")
    set_run(run, size=11, color=RGBColor(0x78, 0x71, 0x6C))

    para(
        doc,
        "This file is a study guide of the FalconV product as it exists today. "
        "It is for personal learning, not a customer proposal. It does not contain passwords, "
        "API secrets, or Gmail app passwords.",
        italic=True,
    )

    heading(doc, "1. How to open the app today", 1)
    para(doc, "The public domain work is paused. Use the local machine.")
    bullets(
        doc,
        [
            "Sign in: http://localhost:3000/login",
            "Register (pending approval): http://localhost:3000/register",
            "Forgot password: http://localhost:3000/forgot-password",
            "API health: http://localhost:3001/api/health",
            "Swagger: http://localhost:3001/api/docs",
            "Your Super Admin account: mehulkul651@gmail.com (password is hashed; it cannot be viewed in the app)",
            "Seed does not create a default administrator. Set SEED_ADMIN_EMAIL only when bootstrapping a new environment that has no Super Admin.",
            "Transactional mail is sent from falconv.notify@gmail.com via Gmail SMTP",
        ],
    )
    para(
        doc,
        "Start locally: Docker Desktop for Postgres (FalconV uses port 5433 if Windows already has Postgres on 5432), "
        "then pnpm db:migrate, pnpm db:seed, pnpm dev for the web app and pnpm --filter @falconv/api start for the API if turbo does not bring Nest up.",
    )

    heading(doc, "2. What FalconV is", 1)
    para(
        doc,
        "FalconV is an enterprise business operations platform for a single organization. "
        "It covers identity, CRM (clients), engineering intake (service requests), delivery "
        "(projects, tasks/Kanban, issues, documents), reporting (KPI + Excel import), and finance (budgets + expenditure). "
        "Executive dashboard, risks, and CAPA are still placeholders (Phase 5). Public hosting is Phase 6 / later.",
    )
    para(
        doc,
        "The first release is one company (one Organization row, code falconv, default currency USD). "
        "Every tenant table has organizationId so multiple companies could be added later. There is no org switcher yet.",
    )

    heading(doc, "3. Mental model (how a request becomes work and money)", 1)
    numbered(
        doc,
        [
            "A person is invited or self-registers. Only ACTIVE users may use operational modules.",
            "CSM/admin captures a Client, then a Service Request.",
            "The request moves through a fixed workflow until APPROVED. A Project can be created only from an approved request.",
            "The team tracks Tasks on a Kanban board and Issues on a separate workflow. Documents are versioned files.",
            "KPI numbers are either calculated from live operations, entered manually as drafts, or imported from Excel. Drafts and pending imports never change approved totals.",
            "Budgets and expenditure follow the same rule: only approved amounts appear in published spend figures.",
        ],
    )

    heading(doc, "4. Technology stack", 1)
    add_table(
        doc,
        ["Layer", "Choice", "Why it matters"],
        [
            ["Monorepo", "pnpm workspaces + Turborepo", "Web, API, DB, and shared contracts live in one repo."],
            ["Web", "Next.js 15 App Router, Tailwind, shadcn-style UI, TanStack Query, RHF + Zod", "UI only. Next.js must not import Prisma or talk to Postgres."],
            ["API", "NestJS 11 REST + Swagger + Helmet + throttling", "Authorization source of truth."],
            ["Auth", "Better Auth (email/password, Prisma sessions, httpOnly cookies)", "Mounted on Nest under /api/auth. Self-signup via Better Auth is disabled; FalconV owns register/invite."],
            ["Database", "PostgreSQL 16 + Prisma 6", "Schema changes need Prisma migrations."],
            ["Shared", "packages/shared (permissions, enums, Zod schemas)", "API and web validate the same contracts."],
            ["Mail", "Nodemailer + Gmail SMTP falconv.notify@gmail.com", "Invites, signup alerts, password reset."],
            ["Files", "Local disk apps/api/uploads", "MinIO is in Docker Compose for later; not wired yet."],
        ],
    )
    para(
        doc,
        "Request path: Browser → Next.js :3000 → rewrite /api/* → NestJS :3001 → PostgreSQL. "
        "Same-origin cookies are why the rewrite exists. Calling the API on another origin (for example 127.0.0.1 vs localhost) can fail CSRF/origin checks.",
    )

    heading(doc, "5. Repository map", 1)
    add_table(
        doc,
        ["Path", "Role"],
        [
            ["apps/web", "Next.js UI, App Router, middleware, auth screens, operational pages"],
            ["apps/api", "NestJS modules: identity, clients, requests, projects, tasks, issues, documents, reporting, mail, audit"],
            ["packages/db", "Prisma schema, migrations, seed (Super Admin + KPI definitions + roles)"],
            ["packages/shared", "PERMISSIONS, ROLE_CODES, workflow helpers (canTransition*), Zod schemas"],
            ["docs/", "Architecture, decisions, modules, API, database, security, roadmap"],
            ["docker-compose.yml", "Postgres, Redis, MinIO; transactional email uses Gmail SMTP from .env"],
        ],
    )

    heading(doc, "6. Architecture decisions (ADRs)", 1)
    bullets(
        doc,
        [
            "ADR 001 — Modular monolith: one Nest API with domain modules; do not split until operations force it.",
            "ADR 002 — Better Auth on Nest + Next rewrite: cookies stay first-class on the API; Next only proxies.",
            "ADR 003 — FalconV RBAC is separate from Better Auth: role names are not enough; permission codes live in FalconV tables.",
            "ADR 004 — Single organization with organizationId on tenant tables; no org switcher.",
            "ADR 005 — Dual onboarding: invite with a role, or public self-register that stays pending.",
            "ADR 006 — Seed currency USD; every money row still stores an ISO currency code.",
            "ADR 007 — shadcn-style UI inside apps/web.",
            "ADR 008 — Better Auth is mounted with toNodeHandler from better-auth/node (Node 20). The community Nest adapter needs Node 22+ ESM.",
        ],
    )
    para(
        doc,
        "Practical consequence of ADR 008: the API is started with tsx (pnpm --filter @falconv/api start), not nest start. Nest DI also needs explicit @Inject because tsx/esbuild skips decorator metadata.",
    )

    heading(doc, "7. Authentication and users", 1)
    heading(doc, "7.1 Better Auth vs FalconV identity", 2)
    para(
        doc,
        "Better Auth stores the login user, hashed password, session, and verification tokens. "
        "FalconV stores UserProfile (status, job title, department), Role, Permission, UserRole, and UserInvite. "
        "Never treat the UI as security: Nest guards check the session and permissions on every protected route.",
    )
    heading(doc, "7.2 User statuses", 2)
    add_table(
        doc,
        ["Status", "Meaning", "Can use operational modules?"],
        [
            ["INVITED", "Admin sent an invite email; user has not accepted yet.", "No"],
            ["PENDING_APPROVAL", "Self-registered. Waiting for an admin to assign role/department/scope.", "No"],
            ["ACTIVE", "Approved or invited-and-accepted.", "Yes"],
            ["REJECTED", "Access request declined (reason stored / emailed).", "No"],
            ["DISABLED", "Account turned off later.", "No"],
        ],
    )
    heading(doc, "7.3 Dual onboarding", 2)
    bullets(
        doc,
        [
            "Invite: admin chooses name, email, role (and optional department). Email contains an accept link. Accepting sets password and status ACTIVE.",
            "Self-register: POST /api/v1/auth/register. Profile is PENDING_APPROVAL with no business role. Super Admin (ADMIN_NOTIFY_EMAIL, currently mehulkul651@gmail.com) gets a notification email.",
            "Approve: admin assigns CSM, Admin, Engineer, or another role from Administration. Then the user can sign in to operations.",
            "Better Auth disableSignUp is true so people cannot create a session user except through FalconV invite/register/accept-invite.",
        ],
    )
    heading(doc, "7.4 Passwords", 2)
    para(
        doc,
        "Passwords are one-way hashes. There is no screen that lists passwords. Forgot password uses Better Auth requestPasswordReset / resetPassword. "
        "The email contains a Better Auth URL that redirects to /reset-password?token=… Minimum password length is 10. Sessions are revoked on password reset.",
    )
    heading(doc, "7.5 Public pages (middleware)", 2)
    para(
        doc,
        "Next middleware treats these as public: /login, /register, /invite, /forgot-password, /reset-password, plus /brand and static files. "
        "Everything else requires a session cookie. If a session exists, /login and /register redirect to /overview.",
    )

    heading(doc, "8. Roles and permissions", 1)
    para(
        doc,
        "Roles: super_admin, admin, csm, executive, department_manager, project_manager, engineering_lead, engineer, quality_reviewer, finance_officer, client_user. "
        "Seeded Super Admin has every permission. UI may hide buttons; the API still must check the permission.",
    )
    add_table(
        doc,
        ["Permission family", "Examples"],
        [
            ["Users", "users.read, invite, approve, update, disable, roles.assign"],
            ["CRM / intake", "clients.*, requests.*, requests.approve"],
            ["Delivery", "projects.*, tasks.*, issues.*, documents.*"],
            ["Reporting", "kpi.read, kpi.import, kpi.approve, finance.read/write/approve"],
            ["Later (Phase 5)", "dashboard.executive, risks.read/write, capa.read/write — codes exist; modules not built"],
        ],
    )

    heading(doc, "9. Phase 1 — Foundation (done)", 1)
    bullets(
        doc,
        [
            "Monorepo, env templates, Docker Compose, Prisma, Nest, Next.",
            "Auth screens: cream background, falcon watermark, logo without a white box, centered “Sign in to FalconV”.",
            "App shell: sidebar from NAV_ITEMS, Home to /overview, theme toggle (hydration-safe), profile menu.",
            "Administration: invite, pending queue, user directory (email, role, status — not passwords).",
            "Notifications table (in-app) and append-only AuditLog.",
            "Lint, typecheck, unit tests, CI scaffold.",
        ],
    )

    heading(doc, "10. Phase 2 — Clients and service requests (done)", 1)
    heading(doc, "10.1 Clients", 2)
    para(
        doc,
        "CRM records: name, status (PROSPECT, ACTIVE, ON_HOLD, INACTIVE), category (ENTERPRISE, SMB, GOVERNMENT, INTERNAL, OTHER), contacts, activity timeline. Soft-delete on master data.",
    )
    heading(doc, "10.2 Service requests", 2)
    para(
        doc,
        "Intake workflow is enforced in shared code (canTransitionRequest) and again in the Nest service. You cannot jump to PROJECT_CREATED from the request transition API; that status is set when a project is created from an APPROVED request.",
    )
    para(doc, "Allowed path (study the names):")
    bullets(
        doc,
        [
            "SUBMITTED → UNDER_REVIEW → TRIAGE → FEASIBILITY → PENDING_APPROVAL",
            "PENDING_APPROVAL → APPROVED or REJECTED, or RETURNED_FOR_REVISION (then back into review)",
            "APPROVED → PROJECT_CREATED (only via project create)",
        ],
    )
    para(doc, "Priorities: LOW, MEDIUM, HIGH, CRITICAL. Categories: NEW_WORK, CHANGE, SUPPORT, ASSESSMENT, OTHER. History is stored as ServiceRequestEvent.")

    heading(doc, "11. Phase 3 — Engineering delivery (done)", 1)
    heading(doc, "11.1 Projects", 2)
    para(
        doc,
        "Created from an approved service request. Statuses: PLANNED, ACTIVE, ON_HOLD, AT_RISK, COMPLETED, CANCELLED. Members and milestones are first-class. Staff picker lists ACTIVE staff, not client users.",
    )
    heading(doc, "11.2 Tasks / Kanban", 2)
    para(
        doc,
        "Statuses: BACKLOG → TODO → IN_PROGRESS → IN_REVIEW → DONE, with BLOCKED as a side state. The UI uses dnd-kit; the API validates every move with canTransitionTask. Same-column drop is allowed.",
    )
    heading(doc, "11.3 Issues", 2)
    para(
        doc,
        "Statuses: OPEN → TRIAGED → ASSIGNED → IN_PROGRESS → RESOLVED → VERIFICATION → CLOSED. VERIFICATION can go CLOSED or back to OPEN. Severity: LOW to CRITICAL. Resolution notes are required to resolve or close.",
    )
    heading(doc, "11.4 Documents", 2)
    para(
        doc,
        "EngineeringDocument + DocumentVersion. Categories include DRAWING, SPEC, TEST_REPORT, DESIGN_REVIEW, QUALITY, DELIVERY, OTHER. Status DRAFT → IN_REVIEW → APPROVED / SUPERSEDED. Files are stored on local disk (uploads/). MinIO is reserved for later.",
    )

    heading(doc, "12. Phase 4 — KPI, Excel, expenditure (done)", 1)
    para(
        doc,
        "Core rule (do not forget this): pending KPI/expenditure imports must never change approved totals. sumApprovedValues / isApprovedStatus live in packages/shared and are used by the API. There is an isolation unit test.",
    )
    heading(doc, "12.1 KPI", 2)
    bullets(
        doc,
        [
            "Definitions vs records. Sources: CALCULATED, IMPORTED, MANUAL.",
            "Calculated codes include ACTIVE_PROJECTS, OPEN_ISSUES, TASK_COMPLETION_PCT, OPEN_SERVICE_REQUESTS — derived from live tables, not typed in.",
            "Manual/imported records start as DRAFT or PENDING_APPROVAL. Only APPROVED rows appear in published totals.",
        ],
    )
    heading(doc, "12.2 Excel import", 2)
    para(
        doc,
        "exceljs parses the workbook into ImportBatch + ImportLine (preview). Approving publishes lines into KPI records or expenditure entries. Rejecting leaves approved totals unchanged. A newer approved import can supersede a previous pending batch.",
    )
    heading(doc, "12.3 Finance", 2)
    para(
        doc,
        "Budget and ExpenditureEntry store decimal amounts plus ISO currency (never JavaScript floats for money). Approved spend vs approved budget is what /api/v1/finance returns. UTC timestamps everywhere.",
    )

    heading(doc, "13. Emails", 1)
    add_table(
        doc,
        ["Event", "To", "From"],
        [
            ["Invite", "the invited user", "FalconV <falconv.notify@gmail.com>"],
            ["Self-register notification", "ADMIN_NOTIFY_EMAIL (mehulkul651@gmail.com)", "same From"],
            ["Access approved / rejected", "the applicant", "same From"],
            ["Forgot password", "the account email", "same From"],
        ],
    )
    para(
        doc,
        "Outbound SMTP uses smtp.gmail.com with an App Password in local .env (gitignored). Do not commit SMTP_PASS.",
    )

    heading(doc, "14. Main API surface (study list)", 1)
    para(doc, "Business APIs live under /api/v1. Auth sessions live under /api/auth. Errors use a Problem-like JSON body: title, status, detail, requestId.")
    add_table(
        doc,
        ["Area", "Key paths"],
        [
            ["Health / docs", "GET /api/health, GET /api/docs"],
            ["Auth", "/api/auth/* (sign-in, session, request-password-reset, reset-password)"],
            ["Onboarding", "POST /api/v1/auth/register, POST /api/v1/auth/accept-invite"],
            ["Users", "GET /users/me, GET /users, GET /users/pending, POST /users/invite, approve, reject"],
            ["Clients / requests", "/api/v1/clients, /api/v1/service-requests, …/transition"],
            ["Delivery", "/api/v1/projects, /tasks, /issues, /documents (+ versions upload)"],
            ["Reporting", "/api/v1/kpi, /finance, /imports (preview, approve, reject)"],
        ],
    )

    heading(doc, "15. Database (what to remember)", 1)
    bullets(
        doc,
        [
            "UUID primary keys on FalconV tables. Better Auth tables use string IDs and @@map names such as user, session, account, verification.",
            "UTC timestamps. Soft-delete (deletedAt) on master data, not on audit logs.",
            "Money: Decimal + ISO 4217 CHAR(3).",
            "Phase 1: Organization, Department, UserProfile, Role/Permission/UserRole, UserInvite, Notification, AuditLog.",
            "Phase 2: Client, Contact, ClientActivity, ServiceRequest, ServiceRequestEvent.",
            "Phase 3: Project, ProjectMember, ProjectMilestone, Task, TaskComment, Issue, EngineeringDocument, DocumentVersion.",
            "Phase 4: KpiDefinition, KpiRecord, ImportBatch, ImportLine, Budget, ExpenditureEntry.",
            "Phase 5 tables (Risk, CorrectiveAction) are not in Prisma yet.",
        ],
    )

    heading(doc, "16. UI routes you can click after login", 1)
    add_table(
        doc,
        ["Path", "What you should see"],
        [
            ["/overview", "Signed-in identity, account status, reporting note. Demo badge if DEMO_DATA=true."],
            ["/dashboard", "Coming soon (Phase 5)"],
            ["/clients, /service-requests", "CRM and intake"],
            ["/projects, /tasks, /issues, /documents", "Delivery and Kanban"],
            ["/kpi, /expenditure, /approvals", "Reporting, spend, approval queues"],
            ["/risks, /corrective-actions", "Coming soon (Phase 5)"],
            ["/notifications", "In-app notifications"],
            ["/administration", "Invite, pending users, directory"],
            ["/settings", "Settings shell"],
        ],
    )

    heading(doc, "17. Rules the codebase treats as law", 1)
    numbered(
        doc,
        [
            "Inspect existing code before changing it. Small reviewable increments. Do not ship mocked numbers as production.",
            "Next.js must not import Prisma.",
            "Enforce permissions on the API. Resource checks belong in services.",
            "Only ACTIVE users use operational modules.",
            "Database changes require Prisma migrations.",
            "UTC timestamps. Monetary values use decimal + ISO currency.",
            "Pending KPI/expenditure imports never change approved totals.",
            "Label demo/seeded data. Do not invent dashboard numbers.",
        ],
    )

    heading(doc, "18. What is not built yet", 1)
    bullets(
        doc,
        [
            "Phase 5: live executive dashboard, risks, CAPA (permission codes already exist).",
            "Phase 6: broader tests, security review, observability, public deployment.",
            "MinIO-backed documents and background import jobs (Redis is composed but unused for jobs).",
            "Custom public domain (falconv.com / DuckDNS / Oracle). Paused until the product is further along.",
            "Multi-organization switcher.",
            "Viewing passwords (impossible by design).",
        ],
    )

    heading(doc, "19. How to keep studying in the repo", 1)
    numbered(
        doc,
        [
            "Read docs/ARCHITECTURE.md, DECISIONS.md, MODULES.md, then DATABASE_DESIGN.md and API_DESIGN.md.",
            "Trace a login: apps/web login page → authClient.signIn.email → /api/auth → SessionAuthGuard → /api/v1/users/me.",
            "Trace a request: shared canTransitionRequest → Nest requests service → ServiceRequestEvent.",
            "Trace money: ImportBatch pending vs Approved ExpenditureEntry in finance.service.ts.",
            "Run pnpm test and apps/api reporting approval-isolation.spec.ts.",
        ],
    )

    heading(doc, "20. Local commands cheat sheet", 1)
    bullets(
        doc,
        [
            "pnpm install",
            "docker compose up -d  (Postgres may be on 5433 via docker-compose.override.yml)",
            "pnpm db:migrate   then   pnpm db:seed",
            "Web: pnpm --filter @falconv/web dev   (http://localhost:3000)",
            "API: pnpm --filter @falconv/api start   (http://localhost:3001)",
            "Quality: pnpm lint, pnpm check-types, pnpm test",
        ],
    )

    footer = doc.add_paragraph()
    run = footer.add_run(
        "End of study notes. Rebuild this file only if the product changes; do not treat it as a live spec if the code disagrees — the code wins."
    )
    set_run(run, size=10, color=RGBColor(0x78, 0x71, 0x6C))
    run.italic = True

    out_dir = Path(__file__).resolve().parent
    out_repo = out_dir / "FalconV-Study-Guide.docx"
    doc.save(out_repo)
    documents = Path.home() / "Documents" / "FalconV-Study-Guide.docx"
    try:
        doc.save(documents)
        extra = str(documents)
    except OSError:
        extra = ""
    print(out_repo)
    if extra:
        print(extra)


if __name__ == "__main__":
    main()
