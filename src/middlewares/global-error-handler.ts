import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { config } from '../config';
import { ApiError, logger, sendResponse } from '../utils';

export const globalErrorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors: unknown;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation error';
    errors = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
  } else if (err instanceof SyntaxError && 'status' in err && err.status === 400) {
    statusCode = 400;
    message = 'Malformed JSON request body';
  } else if (err instanceof Error) {
    if (err.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Invalid token signature';
    } else if (err.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Token has expired';
    } else {
      message = config.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message;
    }
  }

  logger.error(`[Error ${statusCode}] ${message}`, err);

  sendResponse(res, {
    success: false,
    statusCode,
    message,
    ...(errors !== undefined && { errors }),
    ...(config.NODE_ENV !== 'production' && err instanceof Error && { stack: err.stack }),
  });
};
