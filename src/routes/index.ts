import { formatISO } from 'date-fns';
import { Router } from 'express';
import {
  attendanceRouter,
  authRouter,
  batchRouter,
  institutionRouter,
  routineRouter,
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
rootRouter.use('/auth', authRouter);
rootRouter.use('/batches', batchRouter);
rootRouter.use('/institution', institutionRouter);
rootRouter.use('/routines', routineRouter);
rootRouter.use('/users', userRouter);

export { rootRouter };
