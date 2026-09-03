import type { Response } from 'express';

export interface IApiResponse<T = unknown> {
  statusCode: number;
  success: boolean;
  message: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPage?: number;
  };
  data?: T;
  errors?: unknown;
  stack?: string;
}

export const sendResponse = <T>(res: Response, payload: IApiResponse<T>): void => {
  res.status(payload.statusCode).json({
    success: payload.success,
    statusCode: payload.statusCode,
    message: payload.message,
    ...(payload.meta !== undefined && { meta: payload.meta }),
    ...(payload.data !== undefined && { data: payload.data }),
    ...(payload.errors !== undefined && { errors: payload.errors }),
    ...(payload.stack !== undefined && { stack: payload.stack }),
  });
};
