# Security

- Authentication: Better Auth email/password, httpOnly cookies, Prisma sessions.
- Authorization: permission codes enforced in NestJS. UI hiding is not security.
- Self-registration never grants operational access.
- Disabled and rejected accounts cannot use the app.
- Secrets live in environment variables. `.env` is gitignored.
- Helmet, validation, throttling, and structured error responses are enabled on the API.
- File uploads are not enabled in Phase 1; when added they will use signed URLs and type/size checks.
- Audit logs are append-only.

Report issues internally before any production deployment. Do not commit production credentials.
