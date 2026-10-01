# 🎓 Coaching Center Management System — Backend API Engine

[![Live Deployment](https://img.shields.io/badge/Render-Live%20API-46E3B7?style=flat-square&logo=render&logoColor=white)](https://coaching-system-backend.onrender.com)
[![Health Check](https://img.shields.io/badge/Health%20Check-Passing-success?style=flat-square)](https://coaching-system-backend.onrender.com/health)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D24.0.0-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![TypeScript Version](https://img.shields.io/badge/typescript-v7%2B-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Express Version](https://img.shields.io/badge/express-v5.0-000000?style=flat-square&logo=express)](https://expressjs.com)
[![Prisma Version](https://img.shields.io/badge/prisma-v7.10-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/postgresql-v16%2B-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org)
[![Stripe API](https://img.shields.io/badge/stripe-integrated-635BFF?style=flat-square&logo=stripe)](https://stripe.com)
[![Biome Code Quality](https://img.shields.io/badge/biome-v2.5-60A5FA?style=flat-square&logo=biome)](https://biomejs.dev)
[![Status](https://img.shields.io/badge/status-production--ready-success?style=flat-square)]()

> **Live Backend API Base URL**: [`https://coaching-system-backend.onrender.com`](https://coaching-system-backend.onrender.com)  
> **Live API Health Check**: [`https://coaching-system-backend.onrender.com/health`](https://coaching-system-backend.onrender.com/health)

An enterprise-grade, high-performance, single-institution backend system for **Coaching Centers, Academies, and Educational Institutes**. Built from the ground up using **Node.js (v24+)**, **Express.js (v5)**, **TypeScript (v7+ in strict mode)**, and **Prisma ORM (v7+)** with a native PostgreSQL driver adapter (`@prisma/adapter-pg` + `pg.Pool`).

---

## 📑 Table of Contents

1. [Architectural Highlights & Innovations](#-architectural-highlights--innovations)
2. [Complete Entity Relationship Diagram (ERD)](#-complete-entity-relationship-diagram-erd)
3. [Technology Stack Matrix](#-technology-stack-matrix)
4. [Role-Based Access Control & Permission Matrix](#-role-based-access-control--permission-matrix)
5. [Authentication & Student Onboarding State Machine](#-authentication--student-onboarding-state-machine)
6. [Zero Cloud Storage In-Memory PDF Subsystem](#-zero-cloud-storage-in-memory-pdf-subsystem)
7. [Master API Catalog (93 Verified Endpoints)](#-master-api-catalog-93-verified-endpoints)
8. [Directory Structure & File Architecture](#-directory-structure--file-architecture)
9. [Pre-Seeded Demo Credentials](#-pre-seeded-demo-credentials)
10. [Environment Variables Reference](#-environment-variables-reference)
11. [Installation & Getting Started](#-installation--getting-started)
12. [Postman Collection & Verification](#-postman-collection--verification)

---

## 🌟 Architectural Highlights & Innovations

1. **Single-Institution Academy Scoping**:
   - The system is architected around a unified coaching academy governed by the system `ADMIN`. All entities (students, teachers, batches, routines, attendance, exams, payments) directly attach to the institution without multi-tenant fragmentation.
2. **Action-Based Service Decomposition**:
   - Every domain module decomposes business logic into pure, single-responsibility service files (`services/[action].service.ts`) bundled and frozen via `Object.freeze`, eliminating monolithic files.
3. **Multi-File Modular Prisma 7 Schema Architecture**:
   - Model definitions reside in separate, focused schema files (`prisma/*.prisma`) automatically discovered by Prisma 7 via `prisma.config.ts`, connected through PostgreSQL connection pooling (`@prisma/adapter-pg` + `pg.Pool`).
4. **Zero Cloud Storage Dynamic PDF Engine**:
   - Generates official Invoices, Weekly Timetables, and Student Grade Sheets on-the-fly via `PDFKit` (~15ms per document). Streamed directly over HTTP (`inline` preview vs `attachment` download) or attached directly to Nodemailer emails, keeping Cloudinary storage exclusively for user avatars.
5. **Real Stripe Payment Gateway & Cryptographic Webhooks**:
   - Hosted Stripe Checkout Sessions (`create-checkout-session`) with server-side price calculation and raw unparsed request body webhook verification (`constructEvent`), generating immutable receipts (`REC-YYYY-XXXX`).
6. **Multi-Channel Front-Desk Fee Collection**:
   - Manual payment recording for `CASH`, `BKASH`, `NAGAD`, and `BANK_TRANSFER` with immediate receipt generation and email notifications.
7. **Multi-Dimensional Conflict-Free Timetable Routine Engine**:
   - Pre-computation validation detecting Batch schedule overlaps, Teacher time clashes, and Room double-booking across the 7-day academic week.
8. **Universal QueryBuilder Standard**:
   - Standardized `QueryBuilder` utility powering multi-field case-insensitive search (`?search=`), range and exact filters (`_gte`, `_lte`, `in`), sorting, and pagination across all 14 domain modules.
9. **Universal Soft Deletes & Immutable Audit Logging**:
   - Core resources preserve historical data via `deletedAt = new Date()`. Critical state transitions, financial transactions, permission grants, and attendance corrections emit structured `AuditLog` records.

---

## 📊 Complete Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    %% Identity & User Profiles
    User ||--o| AdminProfile : "has (ADMIN)"
    User ||--o| StudentProfile : "has (STUDENT)"
    User ||--o| TeacherProfile : "has (TEACHER)"
    User ||--o{ TeacherPermission : "delegated"
    User ||--o{ Session : "authenticates"
    User ||--o{ AuditLog : "emits"

    %% Academics & Scheduling
    Batch ||--o{ ClassRoutine : "schedules (weekly slots)"
    Batch ||--o{ Enrollment : "contains"
    Batch ||--o{ AttendanceRecord : "tracks"
    Batch ||--o{ Exam : "schedules"
    Batch ||--o{ MonthlyFeeBill : "bills"
    Batch ||--o{ PaymentTransaction : "receives"

    %% Faculty & Routines
    User ||--o{ ClassRoutine : "teaches (teacherId)"

    %% Student Relations
    User ||--o{ Enrollment : "enrolls (studentId)"
    User ||--o{ AttendanceRecord : "student attendance"
    User ||--o{ TeacherAttendanceRecord : "faculty attendance"
    User ||--o{ ExamResult : "receives marks"
    Enrollment ||--o{ MonthlyFeeBill : "generates"
    User ||--o{ MonthlyFeeBill : "billed (studentId)"
    User ||--o{ PaymentTransaction : "pays (studentId)"
    MonthlyFeeBill ||--o{ PaymentTransaction : "settles"

    %% Examinations & Grading
    Exam ||--o{ ExamResult : "evaluates"

    User {
        string id PK "UUID"
        string email UK
        string password "Nullable (null for Google OAuth)"
        string name
        string phone UK
        string avatarUrl "Nullable (Cloudinary AI Crop)"
        Role role "ADMIN | TEACHER | STUDENT"
        UserStatus status "ACTIVE | INACTIVE | BLOCKED | PENDING_ACTIVATION"
        string googleId UK "Nullable"
        datetime createdAt
        datetime updatedAt
        datetime deletedAt "Nullable (Soft Delete)"
    }

    AdminProfile {
        string id PK "UUID"
        string userId FK, UK
        string institutionName
        string institutionAddress
        string institutionPhone "Nullable"
        string institutionEmail "Nullable"
    }

    StudentProfile {
        string id PK "UUID"
        string userId FK, UK
        string guardianName
        string guardianPhone
        string institutionName "Nullable"
        string classLevel "e.g. Class 10, HSC"
        string rollNumber "Nullable"
    }

    TeacherProfile {
        string id PK "UUID"
        string userId FK, UK
        string designation "e.g. Senior Teacher"
        string qualification "e.g. M.Sc in Mathematics"
        string specialization "e.g. Higher Math"
        datetime joiningDate "Nullable"
    }

    TeacherPermission {
        string id PK "UUID"
        string teacherId FK
        Permission permission "MANAGE_ATTENDANCE | MANAGE_EXAMS | MANAGE_ROUTINES"
    }

    Session {
        string id PK "UUID"
        string userId FK
        string refreshTokenHash
        string ipAddress "Nullable"
        string userAgent "Nullable"
        datetime expiresAt
        datetime revokedAt "Nullable"
    }

    Batch {
        string id PK "UUID"
        string name "e.g. HSC 2026"
        decimal fee "10,2"
        BatchStatus status "UPCOMING | ONGOING | COMPLETED | CANCELLED"
        datetime deletedAt "Nullable"
    }

    ClassRoutine {
        string id PK "UUID"
        string batchId FK
        DayOfWeek dayOfWeek "SATURDAY - FRIDAY"
        string startTime "HH:mm"
        string endTime "HH:mm"
        string subject "Nullable"
        string room "Nullable"
        string teacherId FK "Nullable"
    }

    Enrollment {
        string id PK "UUID"
        string studentId FK
        string batchId FK
        EnrollmentStatus status "PENDING | ENROLLED | REJECTED"
        datetime enrolledAt
        datetime approvedAt "Nullable"
    }

    AttendanceRecord {
        string id PK "UUID"
        string batchId FK
        string studentId FK
        string markedById FK
        date date "PostgreSQL DATE"
        AttendanceStatus status "PRESENT | ABSENT | LATE | EXCUSED | LEAVE"
        string remarks "Nullable"
    }

    TeacherAttendanceRecord {
        string id PK "UUID"
        string teacherId FK
        string markedById FK
        date date "PostgreSQL DATE"
        AttendanceStatus status "PRESENT | ABSENT | LATE | EXCUSED | LEAVE"
        datetime checkInTime "Nullable"
        string remarks "Nullable"
    }

    Exam {
        string id PK "UUID"
        string batchId FK
        string title
        string description "Nullable"
        decimal totalMarks "5,2"
        decimal passMarks "5,2"
        date examDate "PostgreSQL DATE"
        ExamStatus status "UPCOMING | ONGOING | COMPLETED | CANCELLED"
        ResultStatus resultStatus "DRAFT | PUBLISHED"
    }

    ExamResult {
        string id PK "UUID"
        string examId FK
        string studentId FK
        decimal marksObtained "5,2"
        string grade "Nullable (A+, A, B, F)"
        string remarks "Nullable"
    }

    MonthlyFeeBill {
        string id PK "UUID"
        string studentId FK
        string batchId FK
        string enrollmentId FK
        int billingMonth "1-12 (BST)"
        int billingYear "e.g. 2026"
        decimal monthlyFee "10,2"
        decimal previousDue "10,2"
        decimal totalPayable "10,2"
        decimal paidAmount "10,2"
        decimal dueAmount "10,2"
        PaymentBillStatus status "UNPAID | PARTIAL | PAID"
        datetime createdAt
        datetime updatedAt
    }

    PaymentTransaction {
        string id PK "UUID"
        string studentId FK
        string batchId FK
        string monthlyFeeBillId FK "Nullable"
        decimal amount "10,2"
        string currency "bdt"
        PaymentMethod paymentMethod "STRIPE | CASH | BKASH | NAGAD | BANK_TRANSFER"
        PaymentStatus status "PENDING | COMPLETED | FAILED | REFUNDED"
        string receiptNumber UK "REC-YYYYMM-XXXX"
        string notes "Nullable"
        string stripeSessionId UK "Nullable"
        string stripePaymentIntentId "Nullable"
        datetime paidAt "Nullable"
        string collectedById FK "Nullable"
    }

    AuditLog {
        string id PK "UUID"
        string userId FK "Nullable"
        string action "e.g. PAYMENT_COLLECTED, MARKS_PUBLISHED"
        string entity "e.g. User, Batch, Payment"
        string entityId
        string details "Nullable (JSON String)"
        string ipAddress "Nullable"
        string userAgent "Nullable"
        datetime createdAt
    }
```

---

## 🛠️ Technology Stack Matrix

| Layer                  | Technology              | Key Implementation Details                                                                                     |
| :--------------------- | :---------------------- | :------------------------------------------------------------------------------------------------------------- |
| **Runtime**            | **Node.js (v24+)**      | High-performance server environment running native ES modules (`"type": "module"`).                            |
| **Language**           | **TypeScript (v7+)**    | 100% strict type safety, zero untyped `any`, bundler module resolution (`moduleResolution: "bundler"`).        |
| **Web Framework**      | **Express.js (v5)**     | Modern routing, error-propagating asynchronous middleware pipeline.                                            |
| **Database & Driver**  | **PostgreSQL (v16+)**   | Managed connection pooling with `@prisma/adapter-pg` and native driver adapter.                                |
| **ORM**                | **Prisma (v7.10)**      | Multi-file schema folder (`prisma/*.prisma`), type generation, migrations, and transactions.                   |
| **Validation**         | **Zod (v4+)**           | Deep runtime schema parsing for request `body`, `query`, `params`, and environment variables.                  |
| **Authentication**     | **JWT + Google GIS**    | 15m Access JWT + 30d rotating HttpOnly Refresh Token (RFC 6819) + Google Identity Services token verification. |
| **Payment Gateway**    | **Stripe (v22+)**       | Hosted checkout sessions, signature verification, and automated webhook event handling.                        |
| **Document Engine**    | **PDFKit**              | Zero cloud storage in-memory PDF generation for receipts, routines, and grade sheets.                          |
| **Email & Templating** | **Nodemailer + EJS**    | Transactional email dispatching with dynamic HTML templates and PDF attachments.                               |
| **Media Storage**      | **Cloudinary**          | AI face-gravity smart cropped avatars ($500 \times 500$) behind `StorageService` abstraction.                  |
| **Date & Time**        | **date-fns (v4+)**      | Timezone-safe immutable date calculations and calendar routine formatting.                                     |
| **Security Suite**     | **Helmet + Rate Limit** | Attack surface reduction headers, CORS with credentials, and IP rate limiting.                                 |
| **Linter & Formatter** | **Biome (v2.5+)**       | High-performance linting, formatting, and import organizer (`biome.json`).                                     |
| **Dev & Bundler**      | **tsx + tsup**          | Hot-reload dev server (`tsx watch`) and esbuild-powered production bundler (`tsup`).                           |

---

## 🔐 Role-Based Access Control & Permission Matrix

| Capability / Operational Action                          |      `ADMIN`       |            `TEACHER`            |      `STUDENT`      |
| :------------------------------------------------------- | :----------------: | :-----------------------------: | :-----------------: |
| **Academy Profile & Global Settings**                    |    Full Control    |            Read Only            |      Read Only      |
| **User & Account Management (Status, Soft Deletes)**     |    Full Control    |            No Access            |      No Access      |
| **Teacher & Student Direct Registration**                |     Admin Only     |            No Access            |      No Access      |
| **Student Google Onboarding Approval Queue**             |     Admin Only     |            No Access            |      No Access      |
| **Academic Batch CRUD & Seat Quota Configuration**       |    Full Control    |            No Access            | Self-Enroll Request |
| **Conflict-Free Timetable Routine Management**           |    Full Control    |  Delegated (`MANAGE_ROUTINES`)  |  Personal Schedule  |
| **Download/Preview Batch Timetable PDF**                 | Download / Preview |       Download / Preview        | Download / Preview  |
| **Student Batch Attendance Marking & Corrections**       |    Full Control    | Delegated (`MANAGE_ATTENDANCE`) |  Personal Summary   |
| **Teacher Attendance Marking & Summaries**               |    Full Control    | Delegated (`MANAGE_ATTENDANCE`) |      No Access      |
| **Exam Creation & Schedule Configuration**               |    Full Control    |   Delegated (`MANAGE_EXAMS`)    |      Read Only      |
| **Bulk Student Marks Entry & Result Publication**        |    Full Control    |   Delegated (`MANAGE_EXAMS`)    |  Published Results  |
| **Download/Preview Grade Sheet Report Card PDF**         | Download / Preview |       Download / Preview        | Download / Preview  |
| **Dispatch Student Report Card PDF via Email**           |  Trigger Dispatch  |        Trigger Dispatch         |      No Access      |
| **Stripe Online Fee Payment Checkout**                   |     No Access      |            No Access            |  Initiate Checkout  |
| **Front-Desk Manual Fee Collection (Cash, bKash, etc.)** |    Full Control    |            No Access            |      No Access      |
| **Download/Preview Payment Invoice Receipt PDF**         | Download / Preview |            No Access            | Download / Preview  |
| **System-Wide Immutable Audit Log Explorer**             |    Full Control    |            No Access            |      No Access      |

---

## 🔄 Authentication & Student Onboarding State Machine

The coaching center employs a secure, non-redirecting Google Identity Services (GIS) flow with an administrative approval gate for new student registrations:

```mermaid
stateDiagram-v2
    [*] --> GoogleAuth: Student submits Google ID Token
    GoogleAuth --> VerifyToken: Backend validates token via google-auth-library

    VerifyToken --> CheckExisting: Lookup User by googleId or email

    CheckExisting --> ActiveStudent: User exists & status == ACTIVE
    ActiveStudent --> IssueTokens: Issue 15m Access JWT & 30d Refresh Cookie (200 OK)

    CheckExisting --> PendingApproval: User exists & status == PENDING_ACTIVATION
    PendingApproval --> DenyAccess: Return 403 "Awaiting Administrator approval"

    CheckExisting --> BlockedStudent: User exists & status == BLOCKED
    BlockedStudent --> DenySuspended: Return 403 "Account suspended"

    CheckExisting --> NewStudent: User does not exist in database
    NewStudent --> PromptOnboarding: Return 200 { isNewUser: true, email, name, googleId }

    PromptOnboarding --> SubmitOnboarding: Student submits POST /api/v1/auth/google/onboard
    SubmitOnboarding --> SavePending: Create User + StudentProfile (status: PENDING_ACTIVATION)
    SavePending --> AdminQueue: Appears in GET /api/v1/auth/pending-students

    AdminQueue --> AdminReview: Admin inspects academic details
    AdminReview --> AdminApproves: PATCH /api/v1/auth/pending-students/:id/approve
    AdminApproves --> ActivateAccount: Status -> ACTIVE & emit AuditLog & send Welcome Email
    ActivateAccount --> IssueTokens
```

---

## 📄 Zero Cloud Storage In-Memory PDF Subsystem

To protect cloud storage quotas and guarantee 100% real-time data accuracy, documents are dynamically rendered in memory using `PDFKit` (~15ms rendering time):

| Document Type            | Generator Function            | Trigger / Delivery Method                                                                          | Features                                                                                                                                      |
| :----------------------- | :---------------------------- | :------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| **Payment Receipt**      | `generateReceiptPdfBuffer`    | `GET /api/v1/payments/receipts/:id/pdf`<br>Automated Stripe & Cash confirmation emails             | Unique receipt number (`REC-YYYY-XXXX`), transaction metadata, itemized tuition fees, payment method badges, and institutional branding.      |
| **Weekly Routine**       | `generateRoutinePdfBuffer`    | `GET /api/v1/routines/batches/:id/pdf`                                                             | Formatted weekly timetable grouped by day (`SATURDAY` to `FRIDAY`), time slots, assigned subjects, room allocations, and faculty names.       |
| **Academic Grade Sheet** | `generateReportCardPdfBuffer` | `GET /api/v1/exams/:id/students/:studentId/report-card/pdf`<br>`POST .../send-report-card` (Email) | Score breakdown, grade badge (`A+`, `A`, `B`, `F`), calculated GPA point ($5.00$ scale), class rank, remarks, and instructor signature lines. |

---

## 📚 Master API Catalog (93 Verified Endpoints)

All endpoints are versioned under `/api/v1` and follow the standardized `sendResponse` JSON envelope.

### 1. Health Checks & Telemetry (2 APIs)

- `GET /health` — Public basic liveness check.
- `GET /api/v1/health/detailed` — Detailed system health (uptime, PostgreSQL status, memory).

### 2. Authentication & Sessions (7 APIs)

- `POST /api/v1/auth/login` — Unified credential login for all roles.
- `POST /api/v1/auth/refresh-token` — Rotate refresh token and issue fresh access JWT (RFC 6819).
- `POST /api/v1/auth/logout` — Revoke active session and clear HttpOnly cookie.
- `POST /api/v1/auth/logout-all` — Revoke all active login sessions across all devices.
- `GET /api/v1/auth/sessions` — List active login sessions with IP, user agent, and expiration info.
- `POST /api/v1/auth/forgot-password` — Request password reset link dispatched via email.
- `POST /api/v1/auth/reset-password` — Reset password using cryptographically verified reset token.

### 3. User Registration (Admin-Exclusive Authority) (2 APIs)

- `POST /api/v1/auth/register-student` — Admin directly registers student with profile.
- `POST /api/v1/auth/register-teacher` — Admin directly registers teacher with subject profile & permissions.

### 4. Google Social Login & Student Onboarding (2 APIs)

- `POST /api/v1/auth/google` — Google ID token GIS verification (Student only).
- `POST /api/v1/auth/google/onboard` — Public student onboarding submission creating account in `PENDING_ACTIVATION`.

### 5. Student Approval Workflow (Admin-Exclusive Authority) (3 APIs)

- `GET /api/v1/auth/pending-students` — List onboarding students awaiting verification (`QueryBuilder`).
- `PATCH /api/v1/auth/pending-students/:id/approve` — Approve student (`ACTIVE`), emit audit log, and send activation email.
- `PATCH /api/v1/auth/pending-students/:id/reject` — Reject student application (`BLOCKED`).

### 6. Institution Governance & Branding (2 APIs)

- `GET /api/v1/institution` — Retrieve public academy profile, branding, address, and live operational stats.
- `PATCH /api/v1/institution` — Admin updates academy branding, contact, and address information.

### 7. User & Profile Management (8 APIs)

- `GET /api/v1/users/me` — Retrieve authenticated user profile, permissions, and session info.
- `PATCH /api/v1/users/me` — Update personal profile details (phone, name).
- `PATCH /api/v1/users/change-password` — Secure password change verifying old credentials.
- `GET /api/v1/users` — Admin list users with pagination, search & filters (`QueryBuilder`).
- `GET /api/v1/users/:id` — Admin retrieve detailed user profile by ID.
- `PATCH /api/v1/users/teachers/:id/permissions` — Admin update and delegate teacher operational permissions.
- `PATCH /api/v1/users/:id/status` — Admin toggle user account status (`ACTIVE`, `INACTIVE`, `BLOCKED`).
- `DELETE /api/v1/users/:id` — Admin universal soft-delete user account (`deletedAt`).

### 8. Academic Batches & Enrollments (13 APIs)

- `POST /api/v1/batches` — Admin creates an academic batch with name, fee, and status.
- `GET /api/v1/batches` — List batches with pagination, search, and fee range filters (`QueryBuilder`).
- `GET /api/v1/batches/:id` — Retrieve batch details, timetable summary, and enrolled student count.
- `PATCH /api/v1/batches/:id` — Admin updates batch metadata or fee structure.
- `DELETE /api/v1/batches/:id` — Admin soft-deletes batch (`deletedAt`).
- `POST /api/v1/batches/:id/enroll` — Student self-enrollment request (`PENDING`).
- `GET /api/v1/batches/enrollments/pending` — Admin list pending enrollment applications (`QueryBuilder`).
- `PATCH /api/v1/batches/enrollments/:id/approve` — Admin approves student enrollment (`ENROLLED`).
- `PATCH /api/v1/batches/enrollments/:id/reject` — Admin rejects student enrollment (`REJECTED`).
- `POST /api/v1/batches/:id/students` — Admin direct student enrollment into batch.
- `GET /api/v1/batches/:id/students` — Admin & Teacher view batch student roster (`QueryBuilder`).
- `DELETE /api/v1/batches/:id/students/:userId` — Admin removes student from batch enrollment.
- `GET /api/v1/batches/my/enrolled` — Student views personal enrolled batch list.

### 9. Class Routines, Timetable Scheduling & Routine PDF (10 APIs)

- `POST /api/v1/routines` — Admin or authorized Teacher schedules a conflict-free routine slot.
- `GET /api/v1/routines` — List routine slots with filters (`QueryBuilder`).
- `GET /api/v1/routines/:id` — Retrieve single routine slot details.
- `GET /api/v1/routines/batch/:batchId` — Retrieve weekly batch timetable grouped by day of the week.
- `GET /api/v1/routines/teacher/:teacherId` — Retrieve teaching schedule for a specific teacher.
- `GET /api/v1/routines/my/teacher-schedule` — Teacher views personal weekly teaching schedule.
- `GET /api/v1/routines/my/student-schedule` — Student views personal weekly class timetable.
- `PATCH /api/v1/routines/:id` — Admin or authorized Teacher updates routine slot with conflict checks.
- `DELETE /api/v1/routines/:id` — Admin or authorized Teacher deletes routine slot.
- `GET /api/v1/routines/batches/:batchId/pdf` — **Download/Preview Batch Weekly Timetable PDF via PDFKit**.

### 10. Daily Student & Teacher Attendance Tracking (10 APIs)

- `POST /api/v1/attendance/batches/:batchId` — Record bulk student attendance for a batch.
- `GET /api/v1/attendance/batches/:batchId` — Retrieve batch attendance sheet filtered by date.
- `PATCH /api/v1/attendance/:id` — Correct single attendance record with audit trail.
- `GET /api/v1/attendance/students/:studentId` — Retrieve attendance history for a specific student.
- `GET /api/v1/attendance/my/summary` — Student views personal monthly attendance statistics & percentage.
- `GET /api/v1/attendance/teachers/my/summary` — Teacher views personal attendance summary & percentage.
- `POST /api/v1/attendance/teachers/bulk` — Admin or authorized Teacher records bulk faculty attendance.
- `GET /api/v1/attendance/teachers` — Retrieve faculty attendance sheet filtered by date.
- `GET /api/v1/attendance/teachers/:teacherId/summary` — Retrieve attendance statistics for specific teacher.
- `PATCH /api/v1/attendance/teachers/:id` — Correct single teacher attendance record.

### 11. Exams, Marks, Results Pipeline & Report Card PDF (14 APIs)

- `POST /api/v1/exams` — Create exam assessment with total marks and pass marks.
- `GET /api/v1/exams` — List exams with filters (`QueryBuilder`).
- `GET /api/v1/exams/:id` — Retrieve exam assessment details by ID.
- `PATCH /api/v1/exams/:id` — Update exam assessment metadata.
- `DELETE /api/v1/exams/:id` — Admin deletes exam assessment and cascaded marks.
- `POST /api/v1/exams/:id/marks` — Bulk enter student marks with auto-grading & GPA calculation.
- `PATCH /api/v1/exams/:id/students/:studentId/mark` — Update mark for single student with audit log.
- `PATCH /api/v1/exams/:id/publish` — Publish exam results (`DRAFT` $\to$ `PUBLISHED`).
- `PATCH /api/v1/exams/:id/unpublish` — Unpublish exam results back to `DRAFT`.
- `GET /api/v1/exams/:id/results` — Retrieve batch merit list report with statistical aggregates.
- `GET /api/v1/exams/my/results` — Student views personal academic report cards summary.
- `GET /api/v1/exams/my/results/:id` — Student views single exam result.
- `GET /api/v1/exams/:id/students/:studentId/report-card/pdf` — **Download/Preview Student Grade Sheet Report Card PDF via PDFKit**.
- `POST /api/v1/exams/:id/students/:studentId/send-report-card` — **Dispatch Report Card PDF via Email to Student**.

### 12. Profile Picture & Media Storage (3 APIs)

- `PATCH /api/v1/users/me/avatar` — Upload personal avatar with AI face-crop ($500 \times 500$) to Cloudinary.
- `DELETE /api/v1/users/me/avatar` — Delete personal avatar from Cloudinary.
- `POST /api/v1/uploads/users/:id/avatar` — Admin uploads avatar for specific user by ID.

### 13. Monthly Fee Payments, Ledger, Webhooks & Receipt PDF (10 APIs)

- `GET /api/v1/payments/monthly-sheet` — Admin views roster of enrolled students with batch fees, past dues, paid amounts, remaining dues, and status (`PAID`/`PARTIAL`/`UNPAID`) with search, batch filter, and pagination (`QueryBuilder`).
- `GET /api/v1/payments/stats` — Admin retrieves monthly revenue dashboard telemetry (Expected Revenue, Collected Amount, Total Due, Collection Rate %).
- `GET /api/v1/payments/revenue-trend` — Admin retrieves month-by-month payment collection trend for charting (past N months).
- `PATCH /api/v1/payments/bills/:billId/previous-due` — Admin manually adjusts previous due (arrear balance) of a student's bill.
- `POST /api/v1/payments/manual-collect` — Admin records offline monthly fee collection (Cash, bKash, Nagad, Bank) supporting partial or full payments with instant receipt generation.
- `GET /api/v1/payments/my/bill` — Student views current month billing breakdown, previous dues, and net total balance across active batches.
- `POST /api/v1/payments/create-checkout-session` — Student creates hosted Stripe Checkout Session for full remaining balance settlement.
- `POST /api/v1/payments/webhook` — Cryptographically verified Stripe webhook listener that settles transactions and updates bills to `PAID`.
- `GET /api/v1/payments/transactions` — Admin & Student view paginated payment transaction ledger (`QueryBuilder`).
- `GET /api/v1/payments/transactions/:id/pdf` — **Download/Preview Payment Invoice Receipt PDF by Transaction ID**.


### 14. Dashboard & Operational Analytics (4 APIs)

- `GET /api/v1/dashboard/today` — Admin real-time daily operational snapshot (today's payment collection, student and teacher attendance rates, pending actions, recent 5 transactions).
- `GET /api/v1/dashboard/monthly-summary` — Admin complete financial, academic, and batch enrollment snapshot for a calendar month.
- `GET /api/v1/dashboard/student` — Student (or Admin with `?studentId=`) personalized dashboard snapshot (KPIs, today's schedule, billing alert, recent exams, and enrolled batches).
- `GET /api/v1/dashboard/teacher` — Teacher (or Admin with `?teacherId=`) personalized dashboard snapshot (KPIs, today's classes with attendance status, assigned batches, pending draft exams, personal attendance, and permissions).

### 15. Centralized Audit Logging & Security Explorer (3 APIs)



- `GET /api/v1/audit-logs` — Admin system-wide audit log explorer (`QueryBuilder`).
- `GET /api/v1/audit-logs/stats` — Admin audit activity telemetry & operational action breakdown.
- `GET /api/v1/audit-logs/:id` — Admin retrieve single audit log record details by ID.

---

## 🗂️ Directory Structure & File Architecture

```text
backend/
├── .env.example                 # Local environment template & documentation
├── AGENTS.md                    # Engineering guidelines & non-negotiable coding standards
├── PROJECT_PLAN.md              # High-level architecture, milestones, and system blueprint
├── biome.json                   # Biome linter, code formatter, and import organizer config
├── package.json                 # Core dependencies, development scripts, and package metadata
├── prisma.config.ts             # Prisma 7 multi-file schema folder configuration
├── tsconfig.json                # Modern TypeScript compiler configuration (bundler resolution)
├── postman/
│   └── Coaching Center Management System API.postman_collection.json # Production Postman v2.1 collection
├── prisma/
│   ├── schema.prisma            # Minimal root schema (generator client & datasource db blocks only)
│   ├── enums.prisma             # Centralized system enums (Role, UserStatus, Gender, Permission, etc.)
│   ├── user.prisma              # User, Session, Admin/Teacher/Student profiles & permissions
│   ├── batch.prisma             # Academic batch entity (name, subject, classLevel, monthlyFee)
│   ├── routine.prisma           # ClassRoutine weekly timetable entity (dayOfWeek, roomNumber, times)
│   ├── enrollment.prisma        # Student enrollment entity (billing period, approval timestamp)
│   ├── attendance.prisma        # Student daily attendance record entity
│   ├── teacher-attendance.prisma# Teacher daily attendance & check-in record entity
│   ├── exam.prisma              # Exam assessments & student graded exam results
│   ├── payment.prisma           # Monthly fee payment ledger, Stripe transactions & receipts
│   ├── audit-log.prisma         # Immutable audit trail entity (financial, status, permission logs)
│   └── seed.ts                  # Idempotent development & testing database ecosystem seeder
└── src/
    ├── app.ts                   # Express application setup, security middleware pipeline & routes
    ├── server.ts                # Server startup banner, lifecycle, database ping & graceful shutdown
    ├── config/                  # Central configuration singletons & environment variables
    │   ├── env.ts               # Immutable Zod-validated environment configuration
    │   ├── prisma.ts            # Prisma 7 client singleton with managed pg.Pool connection pooling
    │   ├── redis.ts             # Redis client singleton for token blacklisting & caching
    │   └── index.ts             # Central configuration barrel re-export
    ├── middlewares/             # Security, authentication & request processing middlewares
    │   ├── auth-limiter.ts      # Express rate limiting for sensitive authentication endpoints
    │   ├── check-auth.ts        # Cookie & Bearer JWT auth guard, RBAC & delegated permission check
    │   ├── global-error-handler.ts # Centralized error processing (ApiError, Zod, JWT, syntax errors)
    │   ├── not-found-handler.ts # 404 route catch-all handler for undefined endpoints
    │   ├── upload.ts            # Multer in-memory file upload middleware for image/document ingestion
    │   ├── validate-request.ts  # Universal Zod schema validator (body, query, params, cookies)
    │   └── index.ts             # Central middlewares barrel re-export
    ├── routes/                  # Modular routing pipeline
    │   └── index.ts             # Root API router aggregating all domain feature routers under /api/v1
    ├── templates/               # Dynamic HTML email rendering templates
    │   └── emails/
    │       ├── password-reset.ejs       # Password reset email with secure OTP / reset link
    │       ├── payment-receipt.ejs      # Monthly fee collection receipt with attached PDF
    │       └── student-report-card.ejs  # Exam result publication alert with attached grade sheet PDF
    ├── types/                   # Ambient TypeScript definitions
    │   └── express.d.ts         # Express Request extension for authenticated user context
    ├── utils/                   # Shared system utilities & business helpers
    │   ├── api-error.ts         # Custom ApiError class with HTTP status factory methods
    │   ├── catch-async.ts       # Async controller wrapper eliminating manual try/catch blocks
    │   ├── jwt.ts               # Short-lived Access & rotating Refresh JWT issuance and verification
    │   ├── logger.ts            # Morgan HTTP logger & structured console stream logger with audit trails
    │   ├── mail.ts              # Nodemailer SMTP email dispatcher with PDF attachment streaming
    │   ├── pdf.ts               # PDFKit in-memory programmatic PDF generators (Receipts, Routines, Report Cards)
    │   ├── query-builder.ts     # Universal search, dynamic filter, relational filter, sort & pagination builder
    │   ├── seedData.ts          # Server startup root Admin account bootstrapper
    │   ├── send-response.ts     # Universal standardized API JSON response envelope dispatcher
    │   ├── storage.ts           # Cloudinary media storage service with AI face-gravity smart cropping
    │   ├── stripe.ts            # Stripe payment gateway client singleton
    │   └── index.ts             # Central utils barrel re-export
    └── modules/                 # Action-decomposed domain feature modules
        ├── attendance/          # Daily student & teacher attendance tracking, check-ins & summaries
        ├── audit-log/           # Centralized administrative audit logging explorer & metrics
        ├── auth/                # Dual-token auth, Google GIS onboarding, password reset & approvals
        ├── batch/               # Academic batches, batch enrollments & student promotion
        ├── dashboard/           # Admin real-time daily snapshot & monthly health summary
        ├── exam/                # Assessments, bulk marks entry, auto-grading & PDF grade sheets
        ├── institution/         # Single-institution academy governance & administrative profile
        ├── payment/             # Monthly billing, Stripe checkout, manual collection, receipts & PDF
        ├── routine/             # Conflict-free weekly class routine engine & schedule PDF
        ├── upload/              # Media upload dispatcher (profile avatars & receipts)
        ├── user/                # User CRUD, profile management, password updates & teacher permissions
        └── index.ts             # Feature modules barrel re-export
```

### 📦 Domain Feature Modules Breakdown

Each domain feature module in `src/modules/` adheres to a strict, action-decomposed architecture:

- `[feature].interface.ts` — TypeScript domain types, DTOs, and hydrated entity interfaces.
- `[feature].validation.ts` — Comprehensive Zod validation schemas for request bodies, query strings, and path parameters.
- `[feature].utils.ts` — Specialized business formatters, formula calculators, and data sanitizers.
- `[feature].controller.ts` — Pure request extraction, service orchestration, and standardized `sendResponse` dispatching.
- `[feature].routes.ts` — Express route definitions with layered middleware (Rate Limiting, Auth Guard, RBAC, Zod Validation).
- `services/` — Granular, single-responsibility business service functions aggregated in `services/index.ts`.

---

## 👥 Pre-Seeded Demo Credentials

| Role                  | Name         | Email                 | Password         | Assigned Permissions / Meta                            |
| :-------------------- | :----------- | :-------------------- | :--------------- | :----------------------------------------------------- |
| **System Admin**      | Abrar Yeasir | `admin@gmail.com`     | `Admin@123456`   | Full System Governance                                 |
| **Teacher (Lead)**    | Sarah Khan   | `teacher1@gmail.com`  | `Teacher@123456` | `MANAGE_ATTENDANCE`, `MANAGE_EXAMS`, `MANAGE_ROUTINES` |
| **Teacher**           | Tanvir Ahmed | `teacher2@gmail.com`  | `Teacher@123456` | `MANAGE_ATTENDANCE`, `MANAGE_EXAMS` (Physics)          |
| **Teacher**           | Ayesha Rahman| `teacher3@gmail.com`  | `Teacher@123456` | `MANAGE_ATTENDANCE` (Chemistry)                        |
| **Teacher**           | Kamal Hossain| `teacher4@gmail.com`  | `Teacher@123456` | `MANAGE_EXAMS` (English)                               |
| **Student**           | Rahim Ali    | `student1@gmail.com`  | `Student@123456` | HSC (Active, Enrolled in `HSC 2026`)                   |
| **Student**           | Nusrat Jahan | `student2@gmail.com`  | `Student@123456` | HSC (Active, Enrolled in `HSC 2026`)                   |
| **Student**           | Tanvir Hasan | `student3@gmail.com`  | `Student@123456` | Class 10 (Active, Enrolled in `SSC 2026`)              |
| **Student**           | Sabbir Ahmed | `student4@gmail.com`  | `Student@123456` | HSC (Active, Enrolled in `SSC 2026`)                   |
| **Student**           | Mehedi Hasan | `student5@gmail.com`  | `Student@123456` | Class 9 (Active, Enrolled in `Class 10`)               |
| **Student (Pending)** | Sadia Afrin  | `student6@gmail.com`  | `Student@123456` | Awaiting Admin Approval (`PENDING_ACTIVATION`)         |

---

## ⚙️ Environment Variables Reference

Create a `.env` file in the root directory based on `.env.example`:

```ini
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Connection (PostgreSQL with Pool)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/coaching_management_db?schema=public"

# JWT Authentication
JWT_ACCESS_SECRET="your-super-secret-access-key-minimum-32-chars-long"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-minimum-32-chars-long"
JWT_REFRESH_EXPIRES_IN="30d"
BCRYPT_SALT_ROUNDS=12

# Root Admin Startup Bootstrapper (Pre-configured demo credentials)
ADMIN_NAME="Abrar Yeasir"
ADMIN_EMAIL="admin@gmail.com"
ADMIN_PASSWORD="Admin@123456"
ADMIN_PHONE="+8801700000001"
ADMIN_INSTITUTION_NAME="Radiant Coaching Center"
ADMIN_INSTITUTION_ADDRESS="Dhanmondi, Dhaka"
ADMIN_INSTITUTION_PHONE="+8801700000001"
ADMIN_INSTITUTION_EMAIL="admin@gmail.com"

# Google Identity Services (GIS) OAuth
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"

# Stripe Payment Gateway
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
STRIPE_WEBHOOK_SECRET="whsec_your_stripe_webhook_secret"
STRIPE_SUCCESS_URL="http://localhost:3000/payment/success?session_id={CHECKOUT_SESSION_ID}"
STRIPE_CANCEL_URL="http://localhost:3000/payment/cancel"

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# SMTP Email Dispatcher (Optional in Dev - logs to console fallback)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
EMAIL_FROM="Apex Academy <no-reply@apexacademy.edu>"

# Security & CORS
CORS_ORIGIN="http://localhost:3000,http://localhost:5173"
```

---

## 🚀 Installation & Getting Started

### 1. Prerequisites

- **Node.js**: `>= 24.0.0`
- **PostgreSQL**: `>= 16.0`
- **npm** or **pnpm**

### 2. Clone & Install

```bash
git clone https://github.com/iamabraryeasir/coaching-center-management-system-backend.git
cd coaching-management-system
npm install
```

### 3. Database Migration & Ecosystem Seeding

```bash
# Run Prisma migrations to initialize PostgreSQL schema
npm run prisma:migrate

# Seed the complete test ecosystem (Admin, Faculty, Batches, Students, Results, Receipts)
npm run prisma:seed
```

### 4. Run Development Server

```bash
npm run dev
```

The server will boot with a stylized lifecycle banner at `http://localhost:5000`.

### 5. Production Build & Execution

```bash
# Type check and build bundle
npm run typecheck
npm run build

# Start compiled server
npm start
```

---

## 📬 Postman Collection & Verification

A complete, self-contained Postman testing suite (95 runnable requests across 14 modules) is located in the `postman/` directory:

1. Import `postman/Coaching Center Management System API.postman_collection.json` directly into Postman.
2. **Base URL Configuration**: `baseUrl` is defined in the collection variables (`https://coaching-system-backend.onrender.com` by default, or switch to `http://localhost:5000` for local development).
3. **Cookie-Based Authentication**: The API natively uses secure HttpOnly cookies for session management (`accessToken` and `refreshToken`). Simply run any login endpoint (`✅ Login — Administrator`, `✅ Login — Teacher`, or `✅ Login — Student`), and Postman's native cookie manager automatically authenticates all subsequent protected requests without requiring manual Bearer tokens or background sync scripts.
4. **Self-Contained Payloads & Sample IDs**: All requests come pre-configured with realistic sample JSON bodies, parameters, and comprehensive descriptions for effortless testing.

---

## 🛡️ License & Acknowledgements

Developed with precision and modern engineering principles for educational institutions. Licensed under the [ISC License](LICENSE).
