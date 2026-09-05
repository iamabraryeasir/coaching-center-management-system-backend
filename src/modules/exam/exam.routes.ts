import { Role } from '@prisma/client';
import { Router } from 'express';
import { checkAuth, validateRequest } from '../../middlewares';
import { examController } from './exam.controller';
import {
  bulkMarksEntrySchema,
  createExamSchema,
  examIdParamSchema,
  getExamsQuerySchema,
  getStudentReportsQuerySchema,
  updateExamSchema,
  updateStudentMarkSchema,
} from './exam.validation';

const router = Router();

/**
 * Student Self-Service Report Cards
 */
router.get(
  '/my/results',
  checkAuth(Role.STUDENT),
  validateRequest(getStudentReportsQuerySchema),
  examController.getMyExamResults,
);

router.get(
  '/my/results/:id',
  checkAuth(Role.STUDENT),
  validateRequest(examIdParamSchema),
  examController.getMySingleExamResult,
);

/**
 * General Exam Collection & Creation
 */
router.post(
  '/',
  checkAuth(Role.ADMIN, Role.TEACHER),
  validateRequest(createExamSchema),
  examController.createExam,
);

router.get(
  '/',
  checkAuth(Role.ADMIN, Role.TEACHER, Role.STUDENT),
  validateRequest(getExamsQuerySchema),
  examController.getExams,
);

/**
 * Single Exam Lifecycle Operations
 */
router.get(
  '/:id',
  checkAuth(Role.ADMIN, Role.TEACHER, Role.STUDENT),
  validateRequest(examIdParamSchema),
  examController.getExamById,
);

router.patch(
  '/:id',
  checkAuth(Role.ADMIN, Role.TEACHER),
  validateRequest(updateExamSchema),
  examController.updateExam,
);

router.delete(
  '/:id',
  checkAuth(Role.ADMIN, Role.TEACHER),
  validateRequest(examIdParamSchema),
  examController.deleteExam,
);

/**
 * Marks Entry & Correction
 */
router.post(
  '/:id/marks',
  checkAuth(Role.ADMIN, Role.TEACHER),
  validateRequest(bulkMarksEntrySchema),
  examController.bulkMarksEntry,
);

router.patch(
  '/:id/marks/:studentId',
  checkAuth(Role.ADMIN, Role.TEACHER),
  validateRequest(updateStudentMarkSchema),
  examController.updateStudentMark,
);

/**
 * Result Publication Lifecycle
 */
router.patch(
  '/:id/publish',
  checkAuth(Role.ADMIN, Role.TEACHER),
  validateRequest(examIdParamSchema),
  examController.publishExamResults,
);

router.patch(
  '/:id/unpublish',
  checkAuth(Role.ADMIN),
  validateRequest(examIdParamSchema),
  examController.unpublishExamResults,
);

/**
 * Batch Exam Results / Merit List
 */
router.get(
  '/:id/results',
  checkAuth(Role.ADMIN, Role.TEACHER, Role.STUDENT),
  validateRequest(examIdParamSchema),
  examController.getExamResults,
);

export const examRouter: Router = router;
