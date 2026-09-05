import { Role } from '@prisma/client';
import { Router } from 'express';
import { checkAuth, validateRequest } from '../../middlewares';
import { routineController } from './routine.controller';
import {
  createRoutineSchema,
  getRoutinesQuerySchema,
  routineBatchIdParamSchema,
  routineIdParamSchema,
  teacherIdParamSchema,
  updateRoutineSchema,
} from './routine.validation';

const router = Router();

/**
 * Self-Service Schedule Views
 */
router.get('/my/student-schedule', checkAuth(Role.STUDENT), routineController.getMyStudentSchedule);

router.get('/my/teacher-schedule', checkAuth(Role.TEACHER), routineController.getMyTeacherSchedule);

/**
 * Targeted Timetables
 */
router.get(
  '/batch/:batchId',
  checkAuth(),
  validateRequest(routineBatchIdParamSchema),
  routineController.getBatchTimetable,
);

router.get(
  '/teacher/:teacherId',
  checkAuth(Role.ADMIN, Role.TEACHER),
  validateRequest(teacherIdParamSchema),
  routineController.getTeacherSchedule,
);

/**
 * Routine Slot CRUD
 */
router.post(
  '/',
  checkAuth(Role.ADMIN, Role.TEACHER),
  validateRequest(createRoutineSchema),
  routineController.createRoutine,
);

router.get(
  '/',
  checkAuth(),
  validateRequest(getRoutinesQuerySchema),
  routineController.getAllRoutines,
);

router.get(
  '/:id',
  checkAuth(),
  validateRequest(routineIdParamSchema),
  routineController.getRoutineById,
);

router.patch(
  '/:id',
  checkAuth(Role.ADMIN, Role.TEACHER),
  validateRequest(updateRoutineSchema),
  routineController.updateRoutine,
);

router.delete(
  '/:id',
  checkAuth(Role.ADMIN, Role.TEACHER),
  validateRequest(routineIdParamSchema),
  routineController.deleteRoutine,
);

export const routineRouter: Router = router;
