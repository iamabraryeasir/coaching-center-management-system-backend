### 🗓️ High-Level Overview

|  Day  | Focus Area                      | Expected Output                                                                                      |
| :---: | :------------------------------ | :--------------------------------------------------------------------------------------------------- |
| **1** | **Planning & Database**         | Requirements, ERD, modular multi-file Prisma schema, project setup, and API planning.                |
| **2** | **Auth & Core APIs**            | JWT/Bearer Auth, RBAC middleware, user management, and foundational CRUD (Courses & Branches).       |
| **3** | **Business Logic & Validation** | Complete 25+ APIs, Zod validation, error handling, pagination, search, transactions, and attendance. |
| **4** | **Payment & Testing**           | Stripe Checkout & Webhooks, concurrency transactions, rigorous testing, and Postman docs.            |
| **5** | **Deployment & Submission**     | Production deployment (Render/Vercel), final QA, README polish, video walkthrough, and submission.   |

---

### 🟢 Day 1 — Planning, Architecture & Database

**Focus:** Laying a rock-solid foundation. A good schema prevents headaches later.

- [x] Finalize domain specifications and operational workflows for multi-branch coaching center management.
- [x] Define the **4 primary roles** (`SUPER_ADMIN`, `ADMIN`, `TEACHER`, `STUDENT`) and map delegated operational permissions.
- [x] Plan all **30+ RESTful API endpoints** with request/response schemas, status codes, and error envelopes.
- [x] Design the complete relational **Entity Relationship Diagram (ERD)** with indices, foreign keys, and soft delete columns.
- [x] Initialize Node.js (v24+), TypeScript (v7+), Express.js (v5), and Biome (v2.5+) project infrastructure.
- [x] Configure PostgreSQL database pool connection and configure **Prisma ORM (v7+)** with `@prisma/adapter-pg`.
- [ ] Build the modular multi-file Prisma schema architecture:
    - [x] `prisma/schema.prisma` (minimal root config with generator client and datasource db)
    - [x] `prisma/enums.prisma` (`Role`, `UserStatus`, `Gender`, `Permission`, `AttendanceStatus`, `PaymentStatus`, `EnrollmentStatus`, `ExamStatus`)
    - [ ] `prisma/user.prisma` (`User`, `Session`, `AdminProfile`, `TeacherProfile`, `StudentProfile`, `TeacherPermission`)
    - [ ] `prisma/branch.prisma` (`Branch` with `slug`)
    - [ ] `prisma/batch.prisma` (`Batch` with seat limit, schedule, fee)
    - [ ] `prisma/enrollment.prisma` (`Enrollment`)
    - [ ] `prisma/attendance.prisma` (`AttendanceRecord`)
    - [ ] `prisma/exam.prisma` (`Exam`, `ExamResult`)
    - [ ] `prisma/payment.prisma` (`PaymentTransaction`, `Receipt`)
    - [ ] `prisma/audit-log.prisma` (`AuditLog`)
- [ ] Run Prisma migration (`pnpm prisma:migrate`) to create tables, indices, and relations in PostgreSQL.
- [ ] Write and execute an idempotent database seed script (`prisma/seed.ts`) populating default branch and Super Admin credentials.
- [ ] Configure `express-rate-limit`, `helmet`, `cors`, and `cookie-parser` security middleware pipelines.
- [ ] Setup initial Git repository, configure `.gitignore`, and create the initial commit.
- [ ] **Set up initial deployment (Render/Vercel) and testing workflows** so code can be deployed and verified daily.

---

### 🔵 Day 2 — Authentication, RBAC & Core Resources

**Focus:** Securing the application, establishing session lifecycles, and building foundational entity CRUD.

- [ ] Implement secure password hashing and verification using `bcryptjs`.
- [ ] Implement JWT token generator and validator (15m Access Token + 30d rotating Refresh Token).
- [ ] Create authentication middleware (`authenticate`) verifying Bearer JWT tokens.
- [ ] Create strict **Role-Based Access Control (RBAC)** middleware (`authorizeRoles`) enforcing role boundaries.
- [ ] Create branch-scoping middleware (`authorizeBranch`) ensuring Admins, Teachers, and Students cannot access cross-branch records.
- [ ] Create Zod request validation middleware (`validateRequest`) for body, query, and params.
- [ ] Build Authentication & Session Endpoints:
  - [ ] `POST /api/v1/auth/register` — Student self-registration and profile creation.
  - [ ] `POST /api/v1/auth/login` — Email/password login issuing access token and HttpOnly refresh cookie.
  - [ ] `POST /api/v1/auth/google` — Google ID Token verification (strictly for students; issues JWT if active, triggers onboarding if new).
  - [ ] `POST /api/v1/auth/google/onboard` — Student completes onboarding details (branch, phone, guardian); creates account in `PENDING_ACTIVATION` state.
  - [ ] `POST /api/v1/auth/refresh-token` — Token rotation issuing fresh access token.
  - [ ] `POST /api/v1/auth/logout` — Session revocation and cookie clearing.
- [ ] Build User & Profile Management Endpoints:
  - [ ] `GET /api/v1/users/me` — Retrieve logged-in user profile, permissions, and branch.
  - [ ] `PATCH /api/v1/users/me` — Update personal profile details (contact, avatar, address).
  - [ ] `PATCH /api/v1/users/change-password` — Secure password update with current password validation.
  - [ ] `GET /api/v1/users` — Admin/Super Admin list users with pagination, search, and role filtering.
  - [ ] `GET /api/v1/users/:id` — Admin view of detailed user profile and permissions.
  - [ ] `PATCH /api/v1/users/:id/status` — Admin/Super Admin toggle status (`ACTIVE`, `INACTIVE`, `BLOCKED`).
  - [ ] `PATCH /api/v1/users/:id/role` — Super Admin updates user role.
- [ ] Build Branch Governance Endpoints:
  - [ ] `POST /api/v1/branches` — Super Admin creates a new branch (generates unique `slug` from name).
  - [ ] `GET /api/v1/branches` — List all active branches.
  - [ ] `GET /api/v1/branches/:id` — Retrieve specific branch details.
  - [ ] `PATCH /api/v1/branches/:id` — Update branch details.
  - [ ] `DELETE /api/v1/branches/:id` — Soft-delete branch (`deletedAt`).
- [ ] Build Batches & Scheduling (Core Resource CRUD):
  - [ ] `POST /api/v1/batches` — Admin creates batch with seat capacity, schedule, and course fee.
  - [ ] `GET /api/v1/batches` — List batches with pagination, search (`?q=`), and filtering (`?branchId=&status=&classLevel=`).
  - [ ] `GET /api/v1/batches/:id` — Retrieve single batch with linked teacher and student roster.
  - [ ] `PATCH /api/v1/batches/:id` — Update batch information.
  - [ ] `DELETE /api/v1/batches/:id` — Soft-delete batch (`deletedAt`).
- [ ] Initialize Postman Collection (v2.1) with environment variables (`{{baseUrl}}`, `{{accessToken}}`) and test auth flows.

---

### 🟡 Day 3 — Business Logic, Academics, Validation & Advanced Queries

**Focus:** The heavy lifting day. Turning basic CRUD into full institutional business workflows.

- [ ] Build Batches & Scheduling Endpoints:
    - [ ] `POST /api/v1/batches` — Admin creates batch with seat capacity, schedule, room, and course fee.
    - [ ] `GET /api/v1/batches` — List batches with filtering (`?courseId=`, `?branchId=`, `?status=`).
    - [ ] `GET /api/v1/batches/:id` — Retrieve batch details, assigned teacher, and enrolled student roster.
    - [ ] `PATCH /api/v1/batches/:id` — Update batch schedule, room, or teacher assignment.
    - [ ] `PATCH /api/v1/batches/:id/status` — Transition batch lifecycle (`UPCOMING`, `ONGOING`, `COMPLETED`, `CANCELLED`).
    - [ ] `DELETE /api/v1/batches/:id` — Soft-delete batch (`deletedAt`).
- [ ] Implement Concurrency-Safe Student Enrollment:
    - [ ] `POST /api/v1/batches/:id/enroll` — Student enrolls in batch.
    - [ ] Execute inside interactive **`prisma.$transaction`** to check maximum seat capacity and prevent race-condition over-enrollment.
    - [ ] Initialize enrollment with `PENDING` status awaiting fee payment.
    - [ ] `GET /api/v1/batches/my-enrollments` — Student views their enrolled batches and schedule.
- [ ] Build Attendance Management Endpoints:
    - [ ] `POST /api/v1/attendance` — Teacher/Admin records student attendance (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`, `LEAVE`).
    - [ ] `GET /api/v1/attendance/batch/:batchId` — View batch attendance sheet with date range filtering (`?startDate=&endDate=`).
    - [ ] `PATCH /api/v1/attendance/:id` — Admin/Teacher corrects attendance record with audit trail logging.
    - [ ] `GET /api/v1/attendance/my-attendance` — Student views personal attendance records and calculate overall attendance percentage.
- [ ] Build Examination & Result Publication Endpoints:
    - [ ] `POST /api/v1/exams` — Admin/Teacher creates exam schedule with total and passing marks.
    - [ ] `GET /api/v1/exams/batch/:batchId` — List exams for a specific batch.
    - [ ] `POST /api/v1/exams/:id/marks` — Teacher/Admin enters marks for batch students with validation against maximum marks.
    - [ ] `PATCH /api/v1/exams/:id/publish` — Admin publishes results from `DRAFT` to `PUBLISHED`.
    - [ ] `GET /api/v1/exams/my-results` — Student views own published exam marks and grades.
- [ ] Implement Advanced Query Features across all list endpoints:
    - [ ] Standardized pagination helper (`?page=1&limit=10`) calculating `total`, `page`, `limit`, and `totalPage`.
    - [ ] Dynamic sorting (`?sortBy=createdAt&sortOrder=desc`).
    - [ ] Full-text search filters (`?q=keyword`) on searchable fields (names, codes, emails).
- [ ] Implement Universal Soft Deletes across all entities ensuring read queries filter `deletedAt: null`.
- [ ] Enforce Zod validation on 100% of mutation routes (`POST`, `PATCH`, `PUT`).
- [ ] Verify structured error handling via `globalErrorHandler` returning `{ success: false, statusCode, message, errors }`.

---

### 🟠 Day 4 — Stripe Payment Integration, Auditing & Rigorous Testing

**Focus:** Handling money securely, verifying webhooks, immutable audit logs, and bulletproof testing.

- [ ] Integrate official **Stripe SDK** (`stripe`) with API version pinning.
- [ ] Build Stripe Payment Initiation:
    - [ ] `POST /api/v1/payments/create-checkout-session` — Student initiates Stripe Checkout for enrolled batch fee.
    - [ ] Calculate fee server-side from database (prevent client-side price tampering).
    - [ ] Generate Stripe Checkout Session with `client_reference_id`, customer email, and success/cancel callback URLs.
    - [ ] Create initial `PaymentTransaction` record with `PENDING` status.
- [ ] Build Cryptographic Stripe Webhook Processing:
    - [ ] `POST /api/v1/payments/webhook` — Webhook listener endpoint with raw body stream parsing.
    - [ ] Verify Stripe webhook cryptographic signature (`stripe.webhooks.constructEvent`) using `STRIPE_WEBHOOK_SECRET`.
    - [ ] Handle `checkout.session.completed` event:
        - [ ] Execute within **`prisma.$transaction`** for atomicity.
        - [ ] Update `PaymentTransaction` status to `COMPLETED` and record Stripe payment intent ID.
        - [ ] Update student `Enrollment` status from `PENDING` to `ACTIVE`.
        - [ ] Generate immutable `Receipt` record with unique receipt number.
        - [ ] Log `AuditLog` entry for financial transaction.
    - [ ] Handle `payment_intent.payment_failed` event to mark transaction as `FAILED`.
    - [ ] Implement idempotency checks to prevent duplicate processing of replayed webhook events.
- [ ] Build Payment Verification & Ledger Endpoints:
    - [ ] `GET /api/v1/payments/my-payments` — Student views personal payment history, receipts, and status.
    - [ ] `GET /api/v1/payments/:id` — Retrieve detailed transaction breakdown and receipt details.
    - [ ] `GET /api/v1/payments` — Admin/Super Admin views organization-wide payment records with date filtering.
- [ ] Build Admin Analytics & Audit Trail Endpoints:
    - [ ] `GET /api/v1/admin/dashboard-stats` — Overview metrics (total students, teachers, active batches, Stripe revenue).
    - [ ] `GET /api/v1/admin/audit-logs` — Paginated audit log tracking critical actions (`PAYMENT_COMPLETED`, `ENROLLMENT_ACTIVATED`, `ROLE_CHANGED`, `STATUS_MODIFIED`).
- [ ] Rigorous End-to-End Testing:
    - [ ] Test RBAC permissions across all 4 roles (`SUPER_ADMIN`, `ADMIN`, `TEACHER`, `STUDENT`).
    - [ ] Verify 401 Unauthorized on missing/invalid Bearer tokens.
    - [ ] Verify 403 Forbidden on role boundary violations and cross-branch access attempts.
    - [ ] Test validation error formats when invalid payloads are submitted.
    - [ ] Test concurrency-safe enrollment when seats are full.
    - [ ] Test Stripe webhook processing with Stripe CLI mock events.
- [ ] Finalize the **Postman Collection (v2.1)**:
    - [ ] Organize requests into logical folders (`Auth`, `Users`, `Branches`, `Courses`, `Batches`, `Attendance`, `Exams`, `Payments`, `Admin`).
    - [ ] Include pre-request scripts auto-populating Bearer tokens.
    - [ ] Include test scripts asserting `200 OK`, `success: true`, and schema structures.
    - [ ] Export both `collection.json` and `environment.json`.

---

### 🔴 Day 5 — Production Deployment, Final Polish & Submission

**Focus:** Going live, production verification, and packaging deliverables for evaluation.

- [ ] Configure production environment variables on deployment platform (Render / Vercel Serverless):
    - [ ] `NODE_ENV=production`
    - [ ] `DATABASE_URL` (production PostgreSQL with SSL enabled)
    - [ ] `JWT_ACCESS_SECRET` (cryptographically strong >= 32 characters)
    - [ ] `JWT_REFRESH_SECRET` (cryptographically strong >= 32 characters)
    - [ ] `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET`
    - [ ] `CORS_ORIGIN` (configured production domains)
- [ ] Deploy production backend build and apply migrations (`pnpm prisma:migrate:deploy`).
- [ ] Seed foundational Super Admin account and default branch in production database (`pnpm prisma:seed`).
- [ ] Configure Stripe live/test webhook endpoint pointing to production URL (`https://your-domain.com/api/v1/payments/webhook`).
- [ ] Live Production Verification:
    - [ ] Verify `GET /health` endpoint returns `200 OK` with database `UP`.
    - [ ] Verify authentication, token issuance, and cookie storage on live URL.
    - [ ] Verify role restrictions, course CRUD, batch enrollment, and Stripe checkout on production.
- [ ] Review Git commit history to ensure **20+ clean, descriptive commits** showing steady progress across all 5 days.
- [ ] Finalize `README.md`:
    - [ ] Project mission, architecture diagram, and tech stack badges.
    - [ ] Live deployment API URL and Postman collection download/import instructions.
    - [ ] **Dedicated Demo Credentials** for all 4 roles (`SUPER_ADMIN`, `ADMIN`, `TEACHER`, `STUDENT`).
    - [ ] Complete API endpoint reference table with methods, routes, access levels, and descriptions.
    - [ ] Local setup guide (`pnpm install`, `.env`, migrations, seed, `pnpm dev`).
- [ ] Record and upload a clear **3–5 minute API walkthrough video** demonstrating:
    - [ ] Health check and server status.
    - [ ] Authentication, token refresh, and role-based access restrictions.
    - [ ] Course/batch creation and student enrollment with seat quota enforcement.
    - [ ] Real Stripe checkout session initiation and webhook payment completion.
    - [ ] Admin dashboard analytics and audit logging.
- [ ] Submit all deliverables (GitHub repository link, live API URL, Postman collection link, and video walkthrough link) in the assignment portal.
