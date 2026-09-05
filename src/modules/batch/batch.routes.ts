import { Role } from '@prisma/client';
import { Router } from 'express';
import { checkAuth, validateRequest } from '../../middlewares';
import { batchController } from './batch.controller';
import {
  adminDirectEnrollSchema,
  batchIdParamSchema,
  batchStudentParamsSchema,
  createBatchSchema,
  enrollmentIdParamSchema,
  getBatchesQuerySchema,
  getBatchStudentsQuerySchema,
  getPendingEnrollmentsQuerySchema,
  updateBatchSchema,
} from './batch.validation';

const router = Router();

/**
 * Student Self-Service
 */
router.get('/my/enrolled', checkAuth(Role.STUDENT), batchController.getMyEnrolledBatches);

/**
 * Enrollment Approval Pipeline (Admin Only)
 */
router.get(
  '/enrollments/pending',
  checkAuth(Role.ADMIN),
  validateRequest(getPendingEnrollmentsQuerySchema),
  batchController.getPendingEnrollments,
);

router.patch(
  '/enrollments/:enrollmentId/approve',
  checkAuth(Role.ADMIN),
  validateRequest(enrollmentIdParamSchema),
  batchController.approveEnrollment,
);

router.patch(
  '/enrollments/:enrollmentId/reject',
  checkAuth(Role.ADMIN),
  validateRequest(enrollmentIdParamSchema),
  batchController.rejectEnrollment,
);

/**
 * Batch CRUD Operations
 */
router.post(
  '/',
  checkAuth(Role.ADMIN),
  validateRequest(createBatchSchema),
  batchController.createBatch,
);

router.get('/', checkAuth(), validateRequest(getBatchesQuerySchema), batchController.getAllBatches);

router.get('/:id', checkAuth(), validateRequest(batchIdParamSchema), batchController.getBatchById);

router.patch(
  '/:id',
  checkAuth(Role.ADMIN),
  validateRequest(updateBatchSchema),
  batchController.updateBatch,
);

router.delete(
  '/:id',
  checkAuth(Role.ADMIN),
  validateRequest(batchIdParamSchema),
  batchController.deleteBatch,
);

/**
 * Enrollment & Roster Actions
 */
router.post(
  '/:id/enroll',
  checkAuth(Role.STUDENT),
  validateRequest(batchIdParamSchema),
  batchController.studentEnroll,
);

router.post(
  '/:id/students',
  checkAuth(Role.ADMIN),
  validateRequest(adminDirectEnrollSchema),
  batchController.adminEnrollStudent,
);

router.get(
  '/:id/students',
  checkAuth(Role.ADMIN, Role.TEACHER),
  validateRequest(getBatchStudentsQuerySchema),
  batchController.getBatchStudents,
);

router.delete(
  '/:id/students/:studentId',
  checkAuth(Role.ADMIN),
  validateRequest(batchStudentParamsSchema),
  batchController.removeStudentFromBatch,
);

export const batchRouter: Router = router;
