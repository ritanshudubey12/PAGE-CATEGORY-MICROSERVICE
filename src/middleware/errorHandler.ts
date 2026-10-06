import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { logger } from '../utils/logger';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(statusCode: number, code: string, message: string, details?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('Unhandled Error caught in middleware', {
    message: err?.message,
    code: err?.code,
    stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined,
  });

  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
    sendError(res, 400, 'INVALID_JSON', 'Malformed JSON payload in request body');
    return;
  }

  // Handle Multer limits or errors
  if (err.name === 'MulterError') {
    sendError(res, 400, 'FILE_UPLOAD_ERROR', err.message);
    return;
  }

  // Default internal server error (never leak raw DB/system error details)
  sendError(
    res,
    500,
    'INTERNAL_SERVER_ERROR',
    'An unexpected error occurred while processing the request'
  );
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 404, 'NOT_FOUND', `Endpoint ${req.method} ${req.originalUrl} not found`);
}
