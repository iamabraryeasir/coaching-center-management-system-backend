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
  - [x] `prisma/user.prisma` (`User`, `Session`, `AdminProfile`, `TeacherProfile`, `StudentProfile`, `TeacherPermission`)
  - [x] `prisma/batch.prisma` (`Batch` - class with fee, status, routines)
  - [x] `prisma/routine.prisma` (`ClassRoutine` - weekly class timetable)
  - [x] `prisma/enrollment.prisma` (`Enrollment`)
  - [x] `prisma/attendance.prisma` (`AttendanceRecord`)
  - [x] `prisma/exam.prisma` (`Exam`, `ExamResult`)
  - [x] `prisma/payment.prisma` (`PaymentTransaction`, `Receipt`)
  - [x] `prisma/audit-log.prisma` (`AuditLog`)
- [x] Run Prisma migration (`pnpm prisma:migrate`) to create tables, indices, and relations in PostgreSQL.
- [x] Write and execute an idempotent database seed script (`src/utils/seedData.ts` & on-startup in `src/server.ts`) populating default branch and Super Admin credentials.
- [x] Configure `express-rate-limit`, `helmet`, `cors`, and `cookie-parser` security middleware pipelines.
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
  - [ ] `POST /api/v1/admin/teachers` — Admin adds a teacher and automatically dispatches a **Welcome Email** (via `nodemailer` + `ejs`) with login credentials and branch info.
  - [ ] `PATCH /api/v1/admin/students/:id/approve` — Admin approves student account (`PENDING_ACTIVATION` -> `ACTIVE`) and dispatches **Account Activation Welcome Email**.
- [ ] Build Admin/Branch Operations (Admin = Branch):
  - [ ] `POST /api/v1/admin/branches` — Super Admin provisions an Admin with branch campus profile (`branchName`, `branchAddress`, `branchPhone`).
  - [ ] `GET /api/v1/admin/branches` — Super Admin lists all branch admins and campus profiles.
  - [ ] `PATCH /api/v1/admin/branches/:id` — Super Admin updates branch admin credentials or campus info.
- [ ] Build Batches (Core Resource CRUD):
  - [ ] `POST /api/v1/batches` — Admin creates batch/class with name, fee, and status.
  - [ ] `GET /api/v1/batches` — List batches with pagination, search (`?q=`), and filtering (`?adminId=&status=`).
  - [ ] `GET /api/v1/batches/:id` — Retrieve single batch with linked routines and enrolled student roster.
  - [ ] `PATCH /api/v1/batches/:id` — Update batch information.
  - [ ] `DELETE /api/v1/batches/:id` — Soft-delete batch (`deletedAt`).
- [ ] Initialize Postman Collection (v2.1) with environment variables (`{{baseUrl}}`, `{{accessToken}}`) and test auth flows.

---

### 🟡 Day 3 — Business Logic, Academics, Validation & Advanced Queries

**Focus:** The heavy lifting day. Turning basic CRUD into full institutional business workflows.

- [ ] Build Batches (Classes) Endpoints:
  - [ ] `POST /api/v1/batches` — Admin creates a class batch with name, fee, and status.
  - [ ] `GET /api/v1/batches` — List batches with filtering (`?adminId=`, `?status=`) and search (`?q=`).
  - [ ] `GET /api/v1/batches/:id` — Retrieve batch details, routines, and enrolled student roster.
  - [ ] `PATCH /api/v1/batches/:id` — Update batch name, fee, or status.
  - [ ] `DELETE /api/v1/batches/:id` — Soft-delete batch (`deletedAt`).
- [ ] Build Weekly Class Routine & Timetable Management Endpoints (`ClassRoutine`):
  - [ ] `POST /api/v1/routines` — Admin adds a weekly routine slot (`batchId`, `dayOfWeek`, `startTime`, `endTime`, `subject`, `room`, `teacherId`).
  - [ ] `GET /api/v1/routines/batch/:batchId` — Retrieves the weekly class routine timetable for a batch (grouped by `dayOfWeek` for calendar UI).
  - [ ] `GET /api/v1/routines/my-routine` — Teacher or Student views their personalized weekly schedule.
  - [ ] `PATCH /api/v1/routines/:id` — Admin updates a routine slot.
  - [ ] `DELETE /api/v1/routines/:id` — Admin deletes a routine slot.
  - [ ] `GET /api/v1/routines/batch/:batchId/pdf` — Generates and downloads a clean, printable weekly class routine PDF via **`pdfkit`**.
- [ ] Implement Student Enrollment Workflows:
  - [ ] `POST /api/v1/batches/:id/enroll` — Student requests enrollment in a batch (`PENDING` state).
  - [ ] `PATCH /api/v1/enrollments/:id/approve` — Admin approves enrollment (`ENROLLED` state) and dispatches **Enrollment Confirmation Email** (via `nodemailer` + `ejs`).
  - [ ] `PATCH /api/v1/enrollments/:id/reject` — Admin rejects enrollment (`REJECTED` state).
  - [ ] `GET /api/v1/batches/my-enrollments` — Student views their enrolled classes and weekly routines.
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
  - [ ] `GET /api/v1/exams/batch/:batchId/results/pdf` — Generates and downloads a printable grade sheet / exam result PDF via **`pdfkit`**.
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
- [ ] Build Cryptographic Stripe Webhook Processing & Payment Confirmation:
  - [ ] `POST /api/v1/payments/webhook` — Webhook listener endpoint with raw body stream parsing.
  - [ ] Verify Stripe webhook cryptographic signature (`stripe.webhooks.constructEvent`) using `STRIPE_WEBHOOK_SECRET`.
  - [ ] Handle `checkout.session.completed` event:
    - [ ] Execute within **`prisma.$transaction`** for atomicity.
    - [ ] Update `PaymentTransaction` status to `COMPLETED` and record Stripe payment intent ID.
    - [ ] Update student `Enrollment` status to `ENROLLED`.
    - [ ] Generate immutable `Receipt` record with unique receipt number (`REC-YYYY-XXXXX`).
    - [ ] Generate official payment receipt PDF via **`pdfkit`**.
    - [ ] Dispatch **Payment Confirmation Email** (via `nodemailer` + `ejs`) with attached receipt PDF.
    - [ ] Log `AuditLog` entry for financial transaction.
  - [ ] Handle `payment_intent.payment_failed` event to mark transaction as `FAILED`.
  - [ ] Implement idempotency checks to prevent duplicate processing of replayed webhook events.
- [ ] Build Manual Payment Collection (Admin Front-Desk):
  - [ ] `POST /api/v1/payments/collect-cash` — Admin records cash/offline batch fee payment, marks transaction `COMPLETED`, generates receipt PDF, and sends confirmation email.
- [ ] Build Payment Verification & PDF Download Endpoints:
  - [ ] `GET /api/v1/payments/my-payments` — Student views personal payment history, receipts, and status.
  - [ ] `GET /api/v1/payments/:id` — Retrieve detailed transaction breakdown and receipt details.
  - [ ] `GET /api/v1/payments/:id/receipt` — Stream / download official printable payment receipt PDF generated via **`pdfkit`**.
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
