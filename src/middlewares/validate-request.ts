import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

export const validateRequest = (schema: ZodType) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = (await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        cookies: req.cookies,
        headers: req.headers,
      })) as {
        body?: Record<string, unknown>;
        query?: Record<string, unknown>;
        params?: Record<string, unknown>;
      };

      if (parsed.body) {
        req.body = parsed.body;
      }
      if (parsed.query) {
        req.query = parsed.query as unknown as Request['query'];
      }
      if (parsed.params) {
        req.params = parsed.params as unknown as Request['params'];
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
