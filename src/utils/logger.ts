/** biome-ignore-all lint/suspicious/noConsole: <Logger file needs it for printing> */
import type { Request, RequestHandler, Response } from 'express';
import morgan from 'morgan';
import { config } from '../config';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'AUDIT';

const formatLog = (level: LogLevel, message: string, meta?: unknown): string => {
  const timestamp = new Date().toISOString();
  const metaString = meta ? ` | Meta: ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaString}`;
};

export const logger = {
  info(message: string, meta?: unknown): void {
    console.info(formatLog('INFO', message, meta));
  },
  warn(message: string, meta?: unknown): void {
    console.warn(formatLog('WARN', message, meta));
  },
  error(message: string, error?: unknown): void {
    const errorDetails =
      error instanceof Error ? { message: error.message, stack: error.stack } : error;
    console.error(formatLog('ERROR', message, errorDetails));
  },
  debug(message: string, meta?: unknown): void {
    if (config.NODE_ENV !== 'production') {
      console.debug(formatLog('DEBUG', message, meta));
    }
  },
  audit(action: string, details: Record<string, unknown>): void {
    console.log(formatLog('AUDIT', `ACTION: ${action}`, details));
  },
};

export const httpLogger: RequestHandler = morgan(
  config.NODE_ENV === 'production' ? 'combined' : 'dev',
  {
    skip: (req: Request, _res: Response) => req.url === '/health',
  },
) as unknown as RequestHandler;
