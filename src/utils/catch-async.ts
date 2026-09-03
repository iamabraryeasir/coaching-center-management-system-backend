import type { NextFunction, Request, RequestHandler, Response } from 'express';

export const catchAsync = (fn: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch((err: unknown) => next(err));
  };
};
