# API design

Base URL (dev): `http://localhost:3001`

| Path | Auth | Purpose |
|---|---|---|
| `GET /api/health` | public | Liveness + database probe |
| `GET /api/docs` | public | OpenAPI UI |
| `/api/auth/*` | Better Auth | Sign-in, session, password reset |
| `POST /api/v1/auth/register` | public | Self-register (pending approval) |
| `POST /api/v1/auth/accept-invite` | public | Accept invitation |
| `GET /api/v1/users/me` | session (pending allowed) | Current user + permissions |
| `GET /api/v1/users` | `users.read` | Directory |
| `GET /api/v1/users/pending` | `users.approve` | Registration queue |
| `POST /api/v1/users/invite` | `users.invite` | Create invite |
| `POST /api/v1/users/:id/approve` | `users.approve` | Activate + assign role |
| `POST /api/v1/users/:id/reject` | `users.approve` | Reject registration |
| `GET /api/v1/departments` | `users.read` | Department list |
| `GET /api/v1/roles` | `users.invite` | Role catalog |
| `GET /api/v1/notifications` | session | In-app notifications |
| `GET/POST /api/v1/clients` | `clients.read` / `clients.write` | Client CRM |
| `GET/PATCH /api/v1/clients/:id` | `clients.read` / `clients.write` | Client detail |
| `POST /api/v1/clients/:id/contacts` | `clients.write` | Add contact |
| `GET/POST /api/v1/service-requests` | `requests.read` / `requests.write` | Intake list/create |
| `GET /api/v1/service-requests/:id` | `requests.read` | Request + history |
| `POST /api/v1/service-requests/:id/transition` | `requests.write` (+ `requests.approve` for approve/reject) | Enforced status change |
| `GET/POST /api/v1/projects` | `projects.read` / `projects.write` | Create from an approved request (moves request to PROJECT_CREATED) |
| `GET/PATCH /api/v1/projects/:id` | `projects.read` / `projects.write` | Project detail |
| `GET /api/v1/staff` | `projects.read` | Active staff for assignment (not client users) |
| `GET/POST /api/v1/tasks` | `tasks.read` / `tasks.write` | Tasks |
| `POST /api/v1/tasks/:id/transition` | `tasks.write` | Enforced Kanban move |
| `GET/POST /api/v1/issues` | `issues.read` / `issues.write` | Issues |
| `POST /api/v1/issues/:id/transition` | `issues.write` | Enforced issue workflow |
| `GET/POST /api/v1/documents` | `documents.read` / `documents.write` | Document records |
| `POST /api/v1/documents/:id/versions` | `documents.write` | Multipart file upload |

| `GET /api/v1/kpi` | `kpi.read` | Calculated snapshot + approved/pending records |
| `POST /api/v1/kpi/records` | `kpi.import` | Manual draft (not in approved totals) |
| `GET /api/v1/finance` | `finance.read` | Approved budget/spend; pending excluded |
| `POST /api/v1/imports` | `kpi.import` | Excel preview (KPI or expenditure) |
| `POST /api/v1/imports/:id/approve` | `kpi.approve` | Publish preview into approved records |
| `GET /api/v1/dashboard` | `dashboard.executive` | Live ops counts + approved KPI/finance (pending excluded) |
| `GET/POST /api/v1/risks` | `risks.read` / `risks.write` | Operational risks |
| `POST /api/v1/risks/:id/transition` | `risks.write` | Enforced OPEN → MITIGATING → CLOSED |
| `GET/POST /api/v1/capa` | `capa.read` / `capa.write` | Corrective actions |
| `POST /api/v1/capa/:id/transition` | `capa.write` | Enforced OPEN → IN_PROGRESS → VERIFIED |

Errors use a Problem-like JSON body: `title`, `status`, `detail`, `requestId`.
