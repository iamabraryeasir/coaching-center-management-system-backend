# AGENTS.md — Engineering & AI Agent Guidelines

> **Project**: Coaching Center Management System — Backend  
> **Target Audience**: AI Agents (Antigravity / Gemini / Claude / GPT) & Core Backend Engineers  
> **Status**: Production Foundation

---

## 1. Project Mission & Domain Context

This backend powers a multi-branch **Coaching Center Management System** designed for coaching institutions in Bangladesh. The system centralizes daily operational and administrative workflows:

- **Organization & Multi-Branch Governance**: Governed at top-level by `SUPER_ADMIN`; operated per-branch by assigned `ADMIN`s.
- **Academics & Scheduling**: Batches, classes, subjects, rooms, routines, and conflict-free timetable management.
- **Attendance & Leave Management**: Daily marking and reporting for students and teachers with audit trails for corrections.
- **Exams & Results**: Marks entry, grading policies, draft/published result pipelines.
- **Fee Management & Receipts**: Fee structures, student dues/invoicing, payment collection, receipts, and revenue reconciliation.
- **Communication & Notifications**: Replaceable providers for SMS, WhatsApp, and email alerts.
- **Audit Logging**: Immutable tracking of financial transactions, permission grants, attendance corrections, and account status changes.

---

## 2. Core Technology Stack

| Layer                  | Technology                 | Purpose & Implementation Details                                                              |
| :--------------------- | :------------------------- | :-------------------------------------------------------------------------------------------- |
| **Runtime**            | Node.js (v24+)             | Server runtime with native ES modules (`"type": "module"`).                                   |
| **Language**           | TypeScript (v7+)           | Strict type-safety throughout; configured with `moduleResolution: "bundler"`.                 |
| **Package Manager**    | `pnpm` (v11+)              | Strict package manager. Lockfile `pnpm-lock.yaml` must always remain committed.               |
| **Web Framework**      | Express.js (v5)            | HTTP pipeline, security middleware, modular routing.                                          |
| **Database & ORM**     | PostgreSQL + Prisma (v7+)  | Native driver adapter (`@prisma/adapter-pg` + `pg.Pool`), multi-file schema folder.           |
| **Validation**         | Zod (v4+)                  | Runtime schema validation for environment variables and API inputs.                           |
| **Linter & Formatter** | Biome (v2.5.9)             | Ultra-fast linter, code formatter, and import organizer (`biome.json`).                       |
| **Dev Runner**         | `tsx`                      | TypeScript execution with hot watch reloading (`tsx watch src/server.ts`).                    |
| **Production Bundler** | `tsup`                     | Ultra-fast esbuild-based bundle generator (`tsup src/server.ts`).                             |
| **Authentication**     | Custom Credential Auth     | Short-lived Access JWT (~15m) + secure rotating HttpOnly Refresh Token (~30d) + Google OAuth. |
| **Payment Gateway**    | Stripe                     | Real checkout sessions, webhook signature verification, and transaction tracking.             |
| **Security**           | express-rate-limit, helmet | Rate limiting, attack surface reduction, and secure HTTP headers.                             |
| **Documentation**      | Postman Collection (v2.1)  | Production API testing, automated environment tokens, and collection tests.                   |
| **File Storage**       | Storage Abstraction        | Wrapped behind `StorageService` interface with initial Cloudinary adapter.                    |
| **Date & Time**        | date-fns (v4+)             | Modern, immutable, timezone-safe date/time arithmetic and calendar formatting.               |
| **Email & Templating** | Nodemailer + EJS           | SMTP email dispatching with dynamic EJS HTML templates for notifications and receipts.        |
| **PDF Generation**     | PDFKit                     | Server-side programmatic PDF generation for printable receipts, routines, and grade sheets.   |

---

## 3. Directory Layout & Module Organization

```text
backend/
├── .env                    # Local environment variables
├── .env.example            # Environment template and variable documentation
├── .gitignore              # Git ignore rules for node_modules, build, logs, env
├── .npmrc                  # pnpm package manager configuration
├── AGENT.md                # Agent instruction & engineering guidelines (this document)
├── PROJECT_PLAN.md         # High-level business and functional requirements
├── biome.json              # Biome linting, formatting & assist configuration
├── package.json            # Dependencies, scripts, and package metadata
├── prisma.config.ts        # Prisma 7 configuration (datasource and schema folder path)
├── tsconfig.json           # Modern TypeScript compiler options (bundler mode)
├── prisma/
│   ├── schema.prisma       # Minimal root schema (generator client & datasource db only)
│   ├── enums.prisma        # Centralized system enums (Role, UserStatus, Permission, etc.)
│   ├── [model].prisma      # Modular per-model schema files (e.g. branch.prisma, user.prisma)
│   └── seed.ts             # Idempotent database seeding script
├── src/
│   ├── app.ts              # Express application setup, middleware pipeline, health check
│   ├── server.ts           # Server lifecycle, startup banner, graceful shutdown handlers
│   ├── config/
│   │   ├── env.ts          # Zod-validated immutable environment configuration
│   │   ├── prisma.ts       # Prisma 7 client singleton, connection pooling & health checks
│   │   └── index.ts        # Central barrel re-export allowing imports directly from '../config'
│   ├── middlewares/
│   │   ├── index.ts        # Central re-exports for middlewares
│   │   ├── global-error-handler.ts # Global error processing (ApiError, Zod, JWT, syntax)
│   │   └── not-found-handler.ts    # 404 route catch-all handler
│   ├── routes/
│   │   └── index.ts        # Root router aggregating domain feature routers under /api/v1
│   ├── utils/
│   │   ├── index.ts        # Utility re-exports
│   │   ├── api-error.ts    # Custom ApiError class with HTTP status factory methods
│   │   ├── logger.ts       # Morgan HTTP middleware & structured logger (info/warn/error/audit)
│   │   └── send-response.ts # Universal API JSON response envelope dispatcher
│   ├── modules/            # Domain feature modules (auth, user, branch, attendance, fees, etc.)
│   │   └── [feature]/
│   │       ├── [feature].interface.ts   # TypeScript interfaces & domain types
│   │       ├── [feature].validation.ts  # Zod schemas for body, query, and params
│   │       ├── [feature].service.ts     # Pure business logic & database queries
│   │       ├── [feature].controller.ts  # Request extraction & response dispatching
│   │       └── [feature].routes.ts      # Express route definitions & middleware wiring
│   └── types/              # Ambient type declarations & Express Request extensions
```

---

## 4. Multi-File Prisma Schema Architecture

To maintain high maintainability and prevent massive monolithic schema files:

1. **`prisma/schema.prisma` is kept strictly minimal**:
    - Contains **ONLY** the `generator client` and `datasource db` blocks.
    - Do **NOT** place models or enums in `schema.prisma`.
2. **`prisma/enums.prisma` contains all enums**:
    - All domain enums (`Role`, `UserStatus`, `Gender`, `Permission`, `AttendanceStatus`, `PaymentMethod`, `PaymentStatus`, `ExamStatus`) reside in `prisma/enums.prisma`.
3. **Modular Per-Model Files (`prisma/*.prisma`)**:
    - Each domain model entity has its own dedicated `.prisma` file (e.g. `branch.prisma`, `user.prisma`, `student.prisma`, `attendance.prisma`, `fee.prisma`).
4. **`prisma.config.ts` Schema Discovery**:
    - `prisma.config.ts` is configured with `schema: 'prisma'`. Prisma automatically and recursively discovers all `.prisma` files in the folder.
5. **Prisma 7 Driver Adapter Pattern**:
    - Client is instantiated in [`src/config/prisma.ts`](file:///d:/01_coding/web-dev/radiant-way-coaching/backend/src/config/prisma.ts) using `PrismaPg` with a managed `pg.Pool` connection pool.

---

## 5. Fundamental Rules for AI Agents

Whenever implementing or modifying code in this codebase, you **MUST** adhere to the following non-negotiable engineering standards:

### 5.1 Strict TypeScript & Barrel Export Architecture

- **Zero untyped `any`**: Explicitly type all variables, function arguments, and return types. Use `unknown` with type guards or generics if dynamic typing is required.
- **Type-only imports**: Use `import type { ... } from '...'` for type definitions (enforced by Biome `useImportType`).
- **Barrel Re-Exports (`index.ts`) in Every Directory**:
    - Every core directory (`config`, `utils`, `middlewares`, `routes`, etc.) MUST define its functional implementations in dedicated modular files (e.g. `env.ts`, `prisma.ts`, `api-error.ts`, `send-response.ts`, `catch-async.ts`).
    - The directory's `index.ts` MUST re-export all members from these modular files.
- **Clean Extensionless Directory Imports**:
    - Consumers MUST import directly through the folder name without referencing inner filenames, `/index`, or `/index.js`.
    - **NEVER** use `.js` or `.ts` extensions in import paths.
    - **NEVER** append `/index` or `/index.js` when importing from a directory.
    - _Correct_: `import { config } from '../config';`
    - _Correct_: `import { ApiError, catchAsync, sendResponse } from '../utils';`
    - _Incorrect_: `import { config } from '../config/env';`
    - _Incorrect_: `import { config } from '../config/index.js';`

### 5.2 Universal Response Format (`sendResponse`)

**NEVER** call `res.json()`, `res.send()`, or `res.status().json()` directly in controllers, routes, or middlewares. Always use `sendResponse`:

```typescript
import type { Request, Response } from "express";
import { sendResponse } from "../utils/send-response";

export const getBranchById = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const branch = await branchService.getBranchById(req.params.id);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Branch retrieved successfully",
        data: branch,
    });
};
```

### 5.3 Error Handling & Throwing (`ApiError`)

- **NEVER** send manual error responses inside controllers or services.
- Always instantiate or throw `ApiError`:
    - `throw ApiError.badRequest('Invalid parameter supplied')` (400)
    - `throw ApiError.unauthorized('Token expired or invalid')` (401)
    - `throw ApiError.forbidden('You lack permissions for this branch')` (403)
    - `throw ApiError.notFound('Record not found')` (404)
    - `throw ApiError.conflict('Email or username already in use')` (409)
    - `throw ApiError.unprocessable('Validation constraint failed', details)` (422)
    - `throw ApiError.internal('Database query failed')` (500)
- The [`globalErrorHandler`](file:///d:/01_coding/web-dev/radiant-way-coaching/backend/src/middlewares/global-error-handler.ts) middleware intercepts all thrown exceptions, formats them through `sendResponse`, and logs detailed diagnostics.

### 5.4 Structured Logging (`logger`) & Zero `console.*` Usage

**NEVER** use `console.log()`, `console.error()`, or any `console.*` methods anywhere in the codebase. All logging and diagnostics must be channeled through the centralized `logger` (which uses standard Node streams `process.stdout.write` / `process.stderr.write`):

- `logger.info(message, meta?)`: Standard informational operational events.
- `logger.warn(message, meta?)`: Recoverable warnings or business exceptions.
- `logger.error(message, error | meta)`: Failures, exceptions, and stack traces.
- `logger.debug(message, meta?)`: Detailed diagnostic messages (suppressed in production).
- `logger.audit(action, details)`: High-value administrative actions (e.g. `PAYMENT_COLLECTED`, `MARKS_PUBLISHED`, `USER_BLOCKED`).

### 5.5 Security & Multi-Branch Isolation

1. **Strict Branch Scoping**: Every query accessing branch-owned records (students, teachers, classes, attendance, fees, exams) **MUST** filter by `branchId`. Admins and teachers must never access data belonging to another branch.
2. **Input Validation Before Execution**: Every route accepting `body`, `query`, or `params` must pass through a Zod validation middleware before reaching the controller.
3. **Transactional Integrity**: Multi-step state transitions, financial records, and balance calculations must execute inside Prisma interactive transactions (`prisma.$transaction`).
4. **Immutable Financial History**: Never delete or overwrite historical financial transactions or receipts. Corrections must be recorded as explicit adjustments or reversals with audit logs.

### 5.6 Stripe Payment Integration & Webhook Security

1. **Raw Body Parsing for Webhooks**: Stripe webhooks (`/api/v1/payments/webhook`) require raw unparsed request bodies to verify cryptographic signatures (`stripe.webhooks.constructEvent`). Never use `express.json()` on the webhook endpoint.
2. **Idempotent Webhook Processing**: Always check if a payment transaction has already been processed before activating enrollments or issuing receipts.
3. **No Fake Statuses**: Payment records must be created through real Stripe Checkout Sessions or Payment Intents, and updated exclusively via verified webhook events.

### 5.7 Soft Deletes & Audit Logging Standards

1. **Universal Soft Deletes**: Core resource deletion (e.g. `courses`, `batches`, `users`) must never execute `prisma.[model].delete()`. Always set `deletedAt = new Date()`.
2. **Read Queries Exclude Soft-Deleted Records**: All find queries must filter out records where `deletedAt: null`.
3. **Audit Logging**: Any state-changing administrative action (e.g. user status change, role promotion, fee adjustment) must record an `AuditLog` entry.

### 5.8 Google Authentication & Student Onboarding Gate

1. **Google ID Token Verification**: Social sign-in uses Google Identity Services client tokens verified server-side with `google-auth-library`. No server-redirect OAuth loops.
2. **Onboarding Gate for New Users**: Unregistered Google users must complete the onboarding flow (`POST /api/v1/auth/google/onboard`) providing branch, contact, and academic information.
3. **Mandatory Admin Approval**: Google-onboarded students are created in `PENDING_ACTIVATION` state. They cannot access protected student resources or receive session tokens until explicitly approved by an `ADMIN` via `PATCH /api/v1/admin/students/:id/approve`.
4. **Strict Student-Only Access**: Google Authentication is strictly restricted to `Role.STUDENT`. If any user with `ADMIN`, `TEACHER`, or `SUPER_ADMIN` attempts Google login, reject with `403 Forbidden`.

---


## 6. Developer & CLI Commands Reference

| Command                      | Purpose                                                                                  |
| :--------------------------- | :--------------------------------------------------------------------------------------- |
| `pnpm dev`                   | Starts development server with hot-reload via `tsx watch src/server.ts`.                 |
| `pnpm build`                 | Bundles the application using `tsup` into `dist/server.js`.                              |
| `pnpm start`                 | Runs the compiled production server (`node dist/server.js`).                             |
| `pnpm typecheck`             | Runs TypeScript type checking (`tsc --noEmit`) without generating files.                 |
| `pnpm check`                 | Runs Biome checks (linting, formatting, import sorting) in dry-run mode.                 |
| `pnpm check:fix`             | Automatically fixes all Biome linter warnings, formatting issues, and organizes imports. |
| `pnpm prisma:generate`       | Generates TypeScript client types from all `.prisma` files.                              |
| `pnpm prisma:migrate`        | Runs Prisma development migrations.                                                      |
| `pnpm prisma:migrate:deploy` | Applies pending migrations in production / CI environments.                              |
| `pnpm prisma:seed`           | Runs the idempotent seed script (`prisma/seed.ts`).                                      |
| `pnpm prisma:studio`         | Launches interactive Prisma Studio web UI.                                               |

---

## 7. Pre-Merge & Pre-Task Completion Checklist

Before finishing any task or submitting changes, every AI agent **MUST** run and pass:

1. `pnpm check` (must return **0 errors, 0 warnings**)
2. `pnpm typecheck` (must return **0 type errors**)
3. `pnpm build` (must successfully compile to `dist/server.js`)
