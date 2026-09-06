# Coaching Center Management System — Backend Timeline & Comprehensive API Breakdown

> **Version**: 2.5.0 (Production Verified)  
> **Architecture**: Single-Institution Coaching Center / Academy  
> **API Standard**: RESTful v1 with 89 Verified Endpoints across 14 Modules  
> **Postman Suite**: Comprehensive Collection (v2.1) + Local Environment

---

### 🗓️ High-Level Project Timeline Overview

|  Day  | Focus Area                                            |    Status     | Key Deliverables & Verified Output                                                                                                                                                      |
| :---: | :---------------------------------------------------- | :-----------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | **Planning, Architecture & Multi-File Prisma Schema** | **COMPLETED** | System specifications, ERD, modular multi-file Prisma 7 schema, PostgreSQL adapter pool, security pipeline, and startup seeder.                                                         |
| **2** | **Authentication, RBAC, User Profiles & Media**       | **COMPLETED** | Credential auth (RFC 6819 rotating refresh tokens), Google ID token GIS login, student onboarding gate, Cloudinary AI face-gravity avatar cropping, and user CRUD.                      |
| **3** | **Academic Operations, Routines & Attendance**        | **COMPLETED** | Academic batches, concurrency-safe enrollment transactions, multi-dimensional conflict-free routine engine, and daily student/teacher attendance tracking with audit trails.            |
| **4** | **Exams, Stripe Payments & Financial Ledger**         | **COMPLETED** | Exam assessments, bulk marks entry, auto-grading & GPA calculation, result publication, real Stripe checkout & cryptographic webhooks, manual fee collection, and receipts.             |
| **5** | **PDF Subsystem, Email Dispatch, Auditing & Polish**  | **COMPLETED** | Zero Cloud Storage in-memory PDF generators (Receipts, Routines, Report Cards), automated email dispatch with PDF attachments, centralized audit logging, and 90-request Postman suite. |

---

### 🟢 Day 1 — Planning, Architecture & Modular Database Foundation

**Status:** **100% Completed & Verified**

- [x] Finalize domain specifications and operational workflows for a single-institution coaching academy governed by system `ADMIN`.
- [x] Define system roles (`ADMIN`, `TEACHER`, `STUDENT`) and implement granular delegated operational permissions (`Permission` enum: `MANAGE_ATTENDANCE`, `MANAGE_EXAMS`, `MANAGE_ROUTINES`).
- [x] Design relational ERD with indices, unique constraints, and universal soft-delete columns (`deletedAt`).
- [x] Initialize Node.js (v24+), TypeScript (v7+), Express.js (v5), and Biome (v2.5+) project structure.
- [x] Configure PostgreSQL database connection pool via Prisma 7 (`@prisma/adapter-pg` + `pg.Pool`).
- [x] Build modular multi-file Prisma schema architecture (`prisma/*.prisma`):
  - [x] `prisma/schema.prisma` (minimal generator client & datasource db configuration)
  - [x] `prisma/enums.prisma` (`Role`, `UserStatus`, `DayOfWeek`, `Permission`, `AttendanceStatus`, `PaymentMethod`, `PaymentStatus`, `BatchStatus`, `EnrollmentStatus`, `ExamStatus`, `ResultStatus`)
  - [x] `prisma/user.prisma` (`User`, `AdminProfile`, `TeacherProfile`, `StudentProfile`, `TeacherPermission`, `Session`)
  - [x] `prisma/batch.prisma` (`Batch` — class/course entity with fee and status)
  - [x] `prisma/routine.prisma` (`ClassRoutine` — multi-dimensional weekly timetable slot)
  - [x] `prisma/enrollment.prisma` (`Enrollment` — student batch enrollment)
  - [x] `prisma/attendance.prisma` (`AttendanceRecord` — daily student batch attendance)
  - [x] `prisma/teacher-attendance.prisma` (`TeacherAttendanceRecord` — teacher daily attendance & check-in)
  - [x] `prisma/exam.prisma` (`Exam`, `ExamResult` — assessments, marks, grades, and GPA)
  - [x] `prisma/payment.prisma` (`PaymentTransaction`, `Receipt` — Stripe & manual ledger)
  - [x] `prisma/audit-log.prisma` (`AuditLog` — immutable administrative action trail)
- [x] Configure security pipeline: `helmet`, `cors` (with credentials), `express-rate-limit`, and `cookie-parser`.
- [x] Build server startup root bootstrapper (`src/utils/seedData.ts`) for seamless production initialization.

---

### 🔵 Day 2 — Authentication, Social Login, RBAC & Media Storage

**Status:** **100% Completed & Verified**

- [x] Implement secure password hashing and verification with `bcryptjs`.
- [x] Build dual-token lifecycle: short-lived Access JWT (~15m) + secure rotating HttpOnly Refresh Token (~30d) following RFC 6819 standards.
- [x] Implement `checkAuth` middleware enforcing RBAC and verifying active user accounts.
- [x] Implement `validateRequest` middleware leveraging Zod schemas for request body, query, and params.
- [x] Build Google Identity Services (GIS) server verification via `google-auth-library` with strict `Role.STUDENT` restriction.
- [x] Implement Google student onboarding flow (`POST /api/v1/auth/google/onboard`) placing accounts in `PENDING_ACTIVATION`.
- [x] Implement Admin-exclusive student approval queue (`GET /api/v1/auth/pending-students`, `PATCH /approve`, `PATCH /reject`).
- [x] Implement Admin-exclusive direct registration for Students (`POST /api/v1/auth/register-student`) and Teachers (`POST /api/v1/auth/register-teacher`).
- [x] Implement User & Profile management (`GET /api/v1/users/me`, `PATCH /me`, `PATCH /change-password`, `GET /users`, `GET /users/:id`, `PATCH /users/:id/status`, `DELETE /users/:id`).
- [x] Implement Cloudinary media storage abstraction (`StorageService`) featuring AI face-gravity smart cropping ($500 \times 500$) for profile avatars.

---

### 🟡 Day 3 — Academic Batches, Routines & Attendance Tracking

**Status:** **100% Completed & Verified**

- [x] Implement Academic Batch Management (`POST /api/v1/batches`, `GET /batches`, `GET /batches/:id`, `PATCH /batches/:id`, `DELETE /batches/:id`).
- [x] Build Concurrency-Safe Student Enrollment engine with `prisma.$transaction` (`POST /batches/:id/enroll`, `GET /enrollments/pending`, `PATCH /approve`, `PATCH /reject`, `POST /batches/:id/students`, `GET /batches/:id/students`, `DELETE /batches/:id/students/:userId`, `GET /batches/my/enrolled`).
- [x] Build Multi-Dimensional Conflict-Free Timetable Routine Engine:
  - Validates Batch schedule overlap, Teacher time conflicts, and Room double-booking.
  - CRUD & schedule exploration endpoints (`POST /api/v1/routines`, `GET /routines`, `GET /routines/:id`, `GET /batch/:batchId`, `GET /teacher/:teacherId`, `GET /my/teacher-schedule`, `GET /my/student-schedule`, `PATCH /routines/:id`, `DELETE /routines/:id`).
- [x] Build Daily Student Batch Attendance Subsystem:
  - Bulk marking (`POST /api/v1/attendance/batches/:batchId`), date-sheet retrieval (`GET /attendance/batches/:batchId`), single correction with audit logging (`PATCH /attendance/:id`), student history (`GET /attendance/students/:studentId`), and student self-summary (`GET /attendance/my/summary`).
- [x] Build Daily Teacher Attendance Subsystem:
  - Teacher self check-in (`POST /api/v1/attendance/teachers/check-in`), personal summary (`GET /attendance/teachers/my/summary`), admin bulk teacher marking (`POST /attendance/teachers/bulk`), faculty date sheet (`GET /attendance/teachers`), specific teacher summary (`GET /attendance/teachers/:teacherId/summary`), and correction (`PATCH /attendance/teachers/:id`).
- [x] Universal adoption of `QueryBuilder` for search, multi-field filtering, sorting, and pagination across all collection endpoints.

---

### 🟠 Day 4 — Examination Pipeline, Stripe Payments & Financial Ledger

**Status:** **100% Completed & Verified**

- [x] Build Examination Assessment Lifecycle Subsystem:
  - Exam creation & update (`POST /api/v1/exams`, `GET /exams`, `GET /exams/:id`, `PATCH /exams/:id`, `DELETE /exams/:id`).
  - Bulk marks entry with auto-grade calculation (`A+` to `F`) & GPA point calculation (`POST /api/v1/exams/:id/marks`, `PATCH /exams/:id/students/:studentId/mark`).
  - Publication lifecycle (`PATCH /exams/:id/publish`, `PATCH /exams/:id/unpublish`).
  - Batch merit list report with statistical aggregates (highest, lowest, average, pass rate) (`GET /exams/:id/results`).
  - Student self-service report cards (`GET /exams/my/results`, `GET /exams/my/results/:id`).
- [x] Build Real Stripe Payment Integration & Cryptographic Webhooks:
  - Student Stripe Checkout Session creation with server-side price calculation (`POST /api/v1/payments/create-checkout-session`).
  - Raw unparsed request body handling and cryptographic signature verification (`POST /api/v1/payments/webhook`).
  - Atomic transaction fulfillment on `checkout.session.completed`: marks transaction `COMPLETED`, activates enrollment, generates unique receipt number (`REC-YYYY-XXXX`), emits audit log, and triggers receipt email.
- [x] Build Front-Desk Manual Payment Collection (`POST /api/v1/payments/manual-collect` supporting `CASH`, `BKASH`, `NAGAD`, `BANK_TRANSFER`).
- [x] Build Financial Ledger & Analytics (`GET /api/v1/payments/my`, `GET /api/v1/payments`, `GET /api/v1/payments/stats`, `GET /api/v1/payments/receipts/:id`, `GET /api/v1/payments/receipts/by-transaction/:id`).

---

### 🔴 Day 5 — In-Memory PDF Subsystem, Email Dispatch, Auditing & Final Polish

**Status:** **100% Completed & Verified**

- [x] Implement In-Memory PDF Generation Subsystem via `pdfkit` (Zero Cloud Storage Architecture):
  - Official Payment Receipts (`generateReceiptPdfBuffer`)
  - Weekly Batch Routines (`generateRoutinePdfBuffer`)
  - Student Academic Report Cards & Grade Sheets (`generateReportCardPdfBuffer`)
  - Dynamic HTTP Streaming helper (`streamPdf`) supporting inline preview (`download=false`) and file attachment download (`download=true`).
- [x] Build Automated Email Dispatching with PDF Attachments via `nodemailer` + `ejs`:
  - Payment Receipt Email with attached receipt PDF (`sendPaymentReceiptEmail`)
  - Published Exam Grade Sheet Email with attached report card PDF (`sendReportCardEmail`)
  - Password Reset Email (`sendPasswordResetEmail`)
- [x] Build Centralized Audit Logging Subsystem (`GET /api/v1/audit-logs`, `GET /audit-logs/stats`, `GET /audit-logs/:id`).
- [x] Build Comprehensive Idempotent Database Seeder (`prisma/seed.ts` via `npm run prisma:seed`) bootstrapping Admin, Faculty, Batches, Routines, Students, Attendance, Exams, Payments, and Audit Logs.
- [x] Complete Postman Collection (v2.1) covering **89 verified endpoints** (90 Postman requests with role personas) with automated token propagation and environment variables.
- [x] Full test pass:
  - `npm run check`: **0 errors, 0 warnings (182 files checked)**
  - `npm run typecheck`: **0 errors**
  - `npm run build`: **Production bundle generated (`dist/server.js`)**

---

## 📚 Master Catalog of All 89 API Endpoints

### 1. Health & Server Monitoring (2 Endpoints)

|  #  | Method | Route                     | Access | Description                                                      |
| :-: | :----- | :------------------------ | :----- | :--------------------------------------------------------------- |
|  1  | `GET`  | `/health`                 | Public | Basic server liveness check                                      |
|  2  | `GET`  | `/api/v1/health/detailed` | Public | Detailed system health check (uptime, PostgreSQL status, memory) |

### 2. Authentication & Sessions (7 Endpoints)

|  #  | Method | Route                          | Access        | Description                                                |
| :-: | :----- | :----------------------------- | :------------ | :--------------------------------------------------------- |
|  3  | `POST` | `/api/v1/auth/login`           | Public        | Unified credential login for all roles                     |
|  4  | `POST` | `/api/v1/auth/refresh-token`   | Public        | Rotate refresh token and issue fresh access JWT (RFC 6819) |
|  5  | `POST` | `/api/v1/auth/logout`          | Authenticated | Revoke active session and clear HttpOnly cookie            |
|  6  | `POST` | `/api/v1/auth/logout-all`      | Authenticated | Revoke all active sessions across all devices              |
|  7  | `GET`  | `/api/v1/auth/sessions`        | Authenticated | List all active login sessions for authenticated user      |
|  8  | `POST` | `/api/v1/auth/forgot-password` | Public        | Request password reset email                               |
|  9  | `POST` | `/api/v1/auth/reset-password`  | Public        | Reset password using verified reset token                  |

### 3. User Registration (Admin-Exclusive) (2 Endpoints)

|  #  | Method | Route                           | Access     | Description                                                |
| :-: | :----- | :------------------------------ | :--------- | :--------------------------------------------------------- |
| 10  | `POST` | `/api/v1/auth/register-student` | Admin Only | Admin registers student directly with profile              |
| 11  | `POST` | `/api/v1/auth/register-teacher` | Admin Only | Admin registers teacher with subject profile & permissions |

### 4. Google OAuth & Student Onboarding (2 Endpoints)

|  #  | Method | Route                         | Access           | Description                                          |
| :-: | :----- | :---------------------------- | :--------------- | :--------------------------------------------------- |
| 12  | `POST` | `/api/v1/auth/google`         | Public (Student) | Google ID token verification via GIS                 |
| 13  | `POST` | `/api/v1/auth/google/onboard` | Public (Student) | Student onboarding submission (`PENDING_ACTIVATION`) |

### 5. Student Approval Workflow (Admin-Exclusive) (3 Endpoints)

|  #  | Method  | Route                                       | Access     | Description                                                |
| :-: | :------ | :------------------------------------------ | :--------- | :--------------------------------------------------------- |
| 14  | `GET`   | `/api/v1/auth/pending-students`             | Admin Only | List pending student applications (`QueryBuilder`)         |
| 15  | `PATCH` | `/api/v1/auth/pending-students/:id/approve` | Admin Only | Approve student account (`ACTIVE`) & trigger welcome email |
| 16  | `PATCH` | `/api/v1/auth/pending-students/:id/reject`  | Admin Only | Reject student application (`BLOCKED`)                     |

### 6. Institution Governance (2 Endpoints)

|  #  | Method  | Route                 | Access     | Description                                        |
| :-: | :------ | :-------------------- | :--------- | :------------------------------------------------- |
| 17  | `GET`   | `/api/v1/institution` | Public     | Get institution profile, branding, and statistics  |
| 18  | `PATCH` | `/api/v1/institution` | Admin Only | Update academy branding, contact, and address info |

### 7. User & Profile Management (7 Endpoints)

|  #  | Method   | Route                           | Access        | Description                                                   |
| :-: | :------- | :------------------------------ | :------------ | :------------------------------------------------------------ |
| 19  | `GET`    | `/api/v1/users/me`              | Authenticated | Get current authenticated user profile & role                 |
| 20  | `PATCH`  | `/api/v1/users/me`              | Authenticated | Update personal profile information                           |
| 21  | `PATCH`  | `/api/v1/users/change-password` | Authenticated | Change account password with old password verification        |
| 22  | `GET`    | `/api/v1/users`                 | Admin Only    | List users with pagination, search & filters (`QueryBuilder`) |
| 23  | `GET`    | `/api/v1/users/:id`             | Admin Only    | Get detailed user profile by ID                               |
| 24  | `PATCH`  | `/api/v1/users/:id/status`      | Admin Only    | Update user account status (`ACTIVE`, `INACTIVE`, `BLOCKED`)  |
| 25  | `DELETE` | `/api/v1/users/:id`             | Admin Only    | Universal soft-delete user account (`deletedAt`)              |

### 8. Academic Batches & Enrollments (13 Endpoints)

|  #  | Method   | Route                                     | Access          | Description                                           |
| :-: | :------- | :---------------------------------------- | :-------------- | :---------------------------------------------------- |
| 26  | `POST`   | `/api/v1/batches`                         | Admin Only      | Create academic batch with name, fee, and status      |
| 27  | `GET`    | `/api/v1/batches`                         | Authenticated   | List batches with pagination, search, and fee filters |
| 28  | `GET`    | `/api/v1/batches/:id`                     | Authenticated   | Get single batch details and enrolled student count   |
| 29  | `PATCH`  | `/api/v1/batches/:id`                     | Admin Only      | Update batch name, fee, or status                     |
| 30  | `DELETE` | `/api/v1/batches/:id`                     | Admin Only      | Universal soft-delete batch (`deletedAt`)             |
| 31  | `POST`   | `/api/v1/batches/:id/enroll`              | Student Only    | Student self-enrollment request (`PENDING`)           |
| 32  | `GET`    | `/api/v1/batches/enrollments/pending`     | Admin Only      | List pending enrollment requests (`QueryBuilder`)     |
| 33  | `PATCH`  | `/api/v1/batches/enrollments/:id/approve` | Admin Only      | Approve student batch enrollment (`ENROLLED`)         |
| 34  | `PATCH`  | `/api/v1/batches/enrollments/:id/reject`  | Admin Only      | Reject student batch enrollment (`REJECTED`)          |
| 35  | `POST`   | `/api/v1/batches/:id/students`            | Admin Only      | Direct admin student enrollment into batch            |
| 36  | `GET`    | `/api/v1/batches/:id/students`            | Admin / Teacher | Get batch student roster (`QueryBuilder`)             |
| 37  | `DELETE` | `/api/v1/batches/:id/students/:userId`    | Admin Only      | Remove student from batch enrollment                  |
| 38  | `GET`    | `/api/v1/batches/my/enrolled`             | Student Only    | Get student personal enrolled batches list            |

### 9. Class Routines, Timetables & Routine PDF (10 Endpoints)

|  #  | Method   | Route                                   | Access          | Description                                     |
| :-: | :------- | :-------------------------------------- | :-------------- | :---------------------------------------------- |
| 39  | `POST`   | `/api/v1/routines`                      | Admin / Teacher | Create conflict-free routine slot               |
| 40  | `GET`    | `/api/v1/routines`                      | Authenticated   | List routine slots (`QueryBuilder`)             |
| 41  | `GET`    | `/api/v1/routines/:id`                  | Authenticated   | Get routine slot details by ID                  |
| 42  | `GET`    | `/api/v1/routines/batch/:batchId`       | Authenticated   | Get weekly timetable grouped by day of week     |
| 43  | `GET`    | `/api/v1/routines/teacher/:teacherId`   | Admin / Teacher | Get teaching schedule for specific teacher      |
| 44  | `GET`    | `/api/v1/routines/my/teacher-schedule`  | Teacher Only    | Get authenticated teacher personal schedule     |
| 45  | `GET`    | `/api/v1/routines/my/student-schedule`  | Student Only    | Get authenticated student personal timetable    |
| 46  | `PATCH`  | `/api/v1/routines/:id`                  | Admin / Teacher | Update routine slot with conflict check         |
| 47  | `DELETE` | `/api/v1/routines/:id`                  | Admin / Teacher | Delete routine slot                             |
| 48  | `GET`    | `/api/v1/routines/batches/:batchId/pdf` | All Roles       | **Download/Preview Batch Weekly Timetable PDF** |

### 10. Daily Student & Teacher Attendance Tracking (11 Endpoints)

|  #  | Method  | Route                                            | Access          | Description                                      |
| :-: | :------ | :----------------------------------------------- | :-------------- | :----------------------------------------------- |
| 49  | `POST`  | `/api/v1/attendance/batches/:batchId`            | Admin / Teacher | Record bulk student attendance for batch         |
| 50  | `GET`   | `/api/v1/attendance/batches/:batchId`            | Admin / Teacher | Get batch attendance sheet by date               |
| 51  | `PATCH` | `/api/v1/attendance/:id`                         | Admin / Teacher | Correct single attendance record with audit log  |
| 52  | `GET`   | `/api/v1/attendance/students/:studentId`         | Admin / Teacher | Get attendance history for specific student      |
| 53  | `GET`   | `/api/v1/attendance/my/summary`                  | Student Only    | Student personal attendance summary & percentage |
| 54  | `POST`  | `/api/v1/attendance/teachers/check-in`           | Teacher Only    | Teacher daily self check-in                      |
| 55  | `GET`   | `/api/v1/attendance/teachers/my/summary`         | Teacher Only    | Teacher personal attendance summary & percentage |
| 56  | `POST`  | `/api/v1/attendance/teachers/bulk`               | Admin / Teacher | Record bulk teacher attendance                   |
| 57  | `GET`   | `/api/v1/attendance/teachers`                    | Admin / Teacher | Get teacher attendance sheet by date             |
| 58  | `GET`   | `/api/v1/attendance/teachers/:teacherId/summary` | Admin / Teacher | Get specific teacher attendance summary          |
| 59  | `PATCH` | `/api/v1/attendance/teachers/:id`                | Admin / Teacher | Correct single teacher attendance record         |

### 11. Exams, Marks, Results Pipeline & Report Card PDF (14 Endpoints)

|  #  | Method   | Route                                                    | Access          | Description                                              |
| :-: | :------- | :------------------------------------------------------- | :-------------- | :------------------------------------------------------- |
| 60  | `POST`   | `/api/v1/exams`                                          | Admin / Teacher | Create exam assessment with marks structure              |
| 61  | `GET`    | `/api/v1/exams`                                          | All Roles       | List exams (`QueryBuilder`)                              |
| 62  | `GET`    | `/api/v1/exams/:id`                                      | All Roles       | Get exam assessment details by ID                        |
| 63  | `PATCH`  | `/api/v1/exams/:id`                                      | Admin / Teacher | Update exam metadata                                     |
| 64  | `DELETE` | `/api/v1/exams/:id`                                      | Admin Only      | Delete exam assessment and cascaded marks                |
| 65  | `POST`   | `/api/v1/exams/:id/marks`                                | Admin / Teacher | Bulk enter student marks with auto-grading               |
| 66  | `PATCH`  | `/api/v1/exams/:id/students/:studentId/mark`             | Admin / Teacher | Update mark for single student with audit log            |
| 67  | `PATCH`  | `/api/v1/exams/:id/publish`                              | Admin / Teacher | Publish exam results (`PUBLISHED`)                       |
| 68  | `PATCH`  | `/api/v1/exams/:id/unpublish`                            | Admin Only      | Unpublish exam results back to `DRAFT`                   |
| 69  | `GET`    | `/api/v1/exams/:id/results`                              | All Roles       | Get batch merit list report with statistical aggregates  |
| 70  | `GET`    | `/api/v1/exams/my/results`                               | Student Only    | Get student all personal report cards summary            |
| 71  | `GET`    | `/api/v1/exams/my/results/:id`                           | Student Only    | Get student single exam result                           |
| 72  | `GET`    | `/api/v1/exams/:id/students/:studentId/report-card/pdf`  | All Roles       | **Download/Preview Student Grade Sheet Report Card PDF** |
| 73  | `POST`   | `/api/v1/exams/:id/students/:studentId/send-report-card` | Admin / Teacher | **Dispatch Report Card PDF via Email to Student**        |

### 12. Profile Picture & Media Storage (3 Endpoints)

|  #  | Method   | Route                              | Access        | Description                                                 |
| :-: | :------- | :--------------------------------- | :------------ | :---------------------------------------------------------- |
| 74  | `PATCH`  | `/api/v1/users/me/avatar`          | Authenticated | Upload personal avatar with AI face crop ($500 \times 500$) |
| 75  | `DELETE` | `/api/v1/users/me/avatar`          | Authenticated | Delete personal avatar from Cloudinary                      |
| 76  | `POST`   | `/api/v1/uploads/users/:id/avatar` | Admin Only    | Upload avatar for specific user by ID                       |

### 13. Payments, Fee Collection, Webhooks & Receipt PDF (10 Endpoints)

|  #  | Method | Route                                                         | Access          | Description                                                        |
| :-: | :----- | :------------------------------------------------------------ | :-------------- | :----------------------------------------------------------------- |
| 77  | `POST` | `/api/v1/payments/create-checkout-session`                    | Student Only    | Create Stripe Checkout session for batch fee                       |
| 78  | `POST` | `/api/v1/payments/webhook`                                    | Stripe Webhook  | Cryptographically verified webhook listener                        |
| 79  | `POST` | `/api/v1/payments/manual-collect`                             | Admin Only      | Collect offline payment (Cash, bKash, Nagad, Bank)                 |
| 80  | `GET`  | `/api/v1/payments/my`                                         | Student Only    | Student personal payment history & receipts                        |
| 81  | `GET`  | `/api/v1/payments`                                            | Admin Only      | System-wide payment transaction ledger (`QueryBuilder`)            |
| 82  | `GET`  | `/api/v1/payments/stats`                                      | Admin Only      | Executive financial revenue dashboard & stats                      |
| 83  | `GET`  | `/api/v1/payments/receipts/:receiptId`                        | Admin / Student | Get payment receipt metadata by receipt ID                         |
| 84  | `GET`  | `/api/v1/payments/receipts/by-transaction/:transactionId`     | Admin / Student | Get payment receipt metadata by transaction ID                     |
| 85  | `GET`  | `/api/v1/payments/receipts/:receiptId/pdf`                    | Admin / Student | **Download/Preview Payment Invoice Receipt PDF by Receipt ID**     |
| 86  | `GET`  | `/api/v1/payments/receipts/by-transaction/:transactionId/pdf` | Admin / Student | **Download/Preview Payment Invoice Receipt PDF by Transaction ID** |

### 14. Centralized Audit Logging & Security Explorer (3 Endpoints)

|  #  | Method | Route                      | Access     | Description                                       |
| :-: | :----- | :------------------------- | :--------- | :------------------------------------------------ |
| 87  | `GET`  | `/api/v1/audit-logs`       | Admin Only | System-wide audit log explorer (`QueryBuilder`)   |
| 88  | `GET`  | `/api/v1/audit-logs/stats` | Admin Only | Audit activity statistics & operational breakdown |
| 89  | `GET`  | `/api/v1/audit-logs/:id`   | Admin Only | Get single audit log record details by ID         |
