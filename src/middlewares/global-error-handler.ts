import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { config } from '../config';
import { ApiError, logger, sendResponse } from '../utils';

interface IFormattedError {
  statusCode: number;
  message: string;
  errors?: unknown;
}

/**
 * Formats Zod validation issues into clean field paths and messages
 */
const formatZodError = (err: ZodError): IFormattedError => ({
  statusCode: 400,
  message: err.issues[0]?.message || 'Validation error',
  errors: err.issues.map((issue) => {
    const filteredPath = issue.path.filter(
      (segment) => !['body', 'query', 'params', 'cookies', 'headers'].includes(String(segment)),
    );
    return {
      path: filteredPath.length > 0 ? filteredPath.join('.') : issue.path.join('.'),
      message: issue.message,
    };
  }),
});

/**
 * Formats general Node/Express errors
 */
const formatGeneralError = (err: Error): IFormattedError => {
  if (err.name === 'JsonWebTokenError') {
    return { statusCode: 401, message: 'Invalid token signature' };
  }
  if (err.name === 'TokenExpiredError') {
    return { statusCode: 401, message: 'Token has expired' };
  }
  return {
    statusCode: 500,
    message: config.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
  };
};

/**
 * Maps any caught error into a standardized error envelope
 */
const parseError = (err: unknown): IFormattedError => {
  if (err instanceof ApiError) {
    return { statusCode: err.statusCode, message: err.message, errors: err.errors };
  }
  if (err instanceof ZodError) {
    return formatZodError(err);
  }
  if (err instanceof SyntaxError && 'status' in err && err.status === 400) {
    return { statusCode: 400, message: 'Malformed JSON request body' };
  }
  if (err instanceof Error) {
    return formatGeneralError(err);
  }
  return { statusCode: 500, message: 'Internal Server Error' };
};

/**
 * Global HTTP error processing middleware.
 * Formats errors into a consistent JSON response envelope.
 * Includes stack trace only in development mode.
 */
export const globalErrorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const { statusCode, message, errors } = parseError(err);

  // Structured logging captures full diagnostic stack trace in server terminal
  logger.error(`[Error ${statusCode}] ${message}`, err);

  sendResponse(res, {
    success: false,
    statusCode,
    message,
    ...(errors !== undefined && { errors }),
    ...(config.NODE_ENV === 'development' && err instanceof Error && { stack: err.stack }),
  });
};
