import { Role } from '@prisma/client';
import { Router } from 'express';
import { checkAuth, validateRequest } from '../../middlewares';
import { attendanceController } from './attendance.controller';
import {
  getBatchAttendanceQuerySchema,
  getStudentAttendanceQuerySchema,
  getTeacherAttendanceQuerySchema,
  getTeacherAttendanceSummaryQuerySchema,
  markBulkAttendanceSchema,
  markBulkTeacherAttendanceSchema,
  updateAttendanceSchema,
  updateTeacherAttendanceSchema,
} from './attendance.validation';

const router = Router();

/**
 * Student Self-Service Attendance History
 */
router.get(
  '/my/summary',
  checkAuth(Role.STUDENT),
  validateRequest(getStudentAttendanceQuerySchema),
  attendanceController.getMyAttendance,
);

/**
 * Teacher Self-Service Endpoints
 */
router.get(
  '/teachers/my/summary',
  checkAuth(Role.TEACHER),
  validateRequest(getTeacherAttendanceSummaryQuerySchema),
  attendanceController.getMyTeacherAttendance,
);

/**
 * Teacher Attendance Operations (Admin / Authorized Teacher)
 */
router.post(
  '/teachers/bulk',
  checkAuth(Role.ADMIN, Role.TEACHER),
  validateRequest(markBulkTeacherAttendanceSchema),
  attendanceController.markBulkTeacherAttendance,
);

router.get(
  '/teachers',
  checkAuth(Role.ADMIN, Role.TEACHER),
  validateRequest(getTeacherAttendanceQuerySchema),
  attendanceController.getTeacherAttendance,
);

router.get(
  '/teachers/:teacherId/summary',
  checkAuth(Role.ADMIN, Role.TEACHER),
  validateRequest(getTeacherAttendanceSummaryQuerySchema),
  attendanceController.getTeacherAttendanceSummary,
);

router.patch(
  '/teachers/:id',
  checkAuth(Role.ADMIN, Role.TEACHER),
  validateRequest(updateTeacherAttendanceSchema),
  attendanceController.updateTeacherAttendanceRecord,
);

/**
 * Student Attendance Inspection (Faculty / Admin)
 */
router.get(
  '/students/:studentId',
  checkAuth(Role.ADMIN, Role.TEACHER),
  validateRequest(getStudentAttendanceQuerySchema),
  attendanceController.getStudentAttendance,
);

/**
 * Batch Daily Attendance Operations
 */
router.post(
  '/batches/:batchId',
  checkAuth(Role.ADMIN, Role.TEACHER),
  validateRequest(markBulkAttendanceSchema),
  attendanceController.markBulkAttendance,
);

router.get(
  '/batches/:batchId',
  checkAuth(Role.ADMIN, Role.TEACHER),
  validateRequest(getBatchAttendanceQuerySchema),
  attendanceController.getBatchAttendance,
);

/**
 * Single Student Record Correction
 */
router.patch(
  '/:id',
  checkAuth(Role.ADMIN, Role.TEACHER),
  validateRequest(updateAttendanceSchema),
  attendanceController.updateAttendanceRecord,
);

export const attendanceRouter: Router = router;
