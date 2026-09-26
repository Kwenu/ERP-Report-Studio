import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const status = err.status ?? err.statusCode ?? 500;
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({
    error: err.message ?? 'Internal server error.',
    ...(env.nodeEnv !== 'production' && status >= 500 ? { stack: err.stack } : {})
  });
}
