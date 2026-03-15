import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  details?: any;
}

export function errorHandler(
  error: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Interní chyba serveru';

  logger.error(`[${statusCode}] ${message}`, {
    error: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { details: error.details })
  });
}

export class ValidationError extends Error implements AppError {
  statusCode = 400;
  details?: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class NotFoundError extends Error implements AppError {
  statusCode = 404;

  constructor(message: string = 'Nenalezeno') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error implements AppError {
  statusCode = 401;

  constructor(message: string = 'Neautorizováno') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error implements AppError {
  statusCode = 403;

  constructor(message: string = 'Zakázáno') {
    super(message);
    this.name = 'ForbiddenError';
  }
}
