import 'node:http';
import type { IJwtPayload } from '../utils/jwt';

declare module 'node:http' {
  interface IncomingMessage {
    rawBody?: Buffer;
  }
}

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
      user?: IJwtPayload;
    }
  }
}
