import { formatISO } from 'date-fns';
import { Router } from 'express';
import {
  attendanceRouter,
  auditLogRouter,
  authRouter,
  batchRouter,
  examRouter,
  institutionRouter,
  paymentRouter,
  routineRouter,
  uploadRouter,
  userRouter,
} from '../modules';
import { sendResponse } from '../utils';

const rootRouter: Router = Router();

rootRouter.get('/health', (_req, res) => {
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Coaching Management System API v1 is operating normally',
    data: {
      uptime: process.uptime(),
      timestamp: formatISO(new Date()),
    },
  });
});

rootRouter.use('/attendance', attendanceRouter);
rootRouter.use('/audit-logs', auditLogRouter);
rootRouter.use('/auth', authRouter);
rootRouter.use('/batches', batchRouter);
rootRouter.use('/exams', examRouter);
rootRouter.use('/institution', institutionRouter);
rootRouter.use('/payments', paymentRouter);
rootRouter.use('/routines', routineRouter);
rootRouter.use('/uploads', uploadRouter);
rootRouter.use('/users', userRouter);

export { rootRouter };
