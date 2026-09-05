import { formatISO } from 'date-fns';
import type { Request, RequestHandler, Response } from 'express';
import morgan from 'morgan';
import { config } from '../config';

type LogLevel = 'INFO' | 'HTTP' | 'WARN' | 'ERROR' | 'DEBUG' | 'AUDIT';

/**
 * Formats a log line into standard ISO timestamped bracketed format
 */
const formatLog = (level: LogLevel, message: string, meta?: unknown): string => {
  const timestamp = formatISO(new Date());
  const metaString = meta ? ` | Meta: ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaString}`;
};

const writeStdout = (line: string): void => {
  process.stdout.write(`${line}\n`);
};

const writeStderr = (line: string): void => {
  process.stderr.write(`${line}\n`);
};

export const logger = {
  info(message: string, meta?: unknown): void {
    writeStdout(formatLog('INFO', message, meta));
  },
  http(message: string): void {
    writeStdout(formatLog('HTTP', message));
  },
  warn(message: string, meta?: unknown): void {
    writeStderr(formatLog('WARN', message, meta));
  },
  error(message: string, error?: unknown): void {
    const errorDetails =
      error instanceof Error ? { message: error.message, stack: error.stack } : error;
    writeStderr(formatLog('ERROR', message, errorDetails));
  },
  debug(message: string, meta?: unknown): void {
    if (config.NODE_ENV !== 'production') {
      writeStdout(formatLog('DEBUG', message, meta));
    }
  },
  audit(action: string, details: Record<string, unknown>): void {
    writeStdout(formatLog('AUDIT', `ACTION: ${action}`, details));
  },
};

/**
 * Morgan HTTP request logging middleware piped through the centralized logger
 */
export const httpLogger: RequestHandler = morgan(
  ':method :url :status :response-time ms - :res[content-length]',
  {
    stream: {
      write: (message: string): void => {
        const trimmed = message.trim();
        if (trimmed) {
          logger.http(trimmed);
        }
      },
    },
    skip: (req: Request, _res: Response) => req.url === '/health',
  },
);
