import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';

const isProduction = process.env.NODE_ENV === 'production';

// Global rate limiter
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 150 : 500,
  message: 'Příliš mnoho požadavků z této IP adresy. Zkuste to prosím později.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req: Request) => {
    // Skip rate limiting for health checks and high-frequency agent pushes
    return req.path === '/health' || req.path === '/api/agent/push';
  },
  handler: (req: Request, res: Response) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Příliš mnoho požadavků, zkuste to prosím později'
    });
  }
});

// Auth endpoints rate limiter (stricter)
export const authRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX_REQUESTS || (isProduction ? '10' : '50')),
  message: 'Příliš mnoho pokusů o přihlášení. Zkuste to prosím později.',
  standardHeaders: false,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req: Request, res: Response) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Příliš mnoho pokusů o přihlášení, zkuste to prosím později'
    });
  }
});

// API rate limiter (moderate)
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isProduction ? 120 : 300,
  standardHeaders: false,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(`API rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Byl překročen limit API požadavků'
    });
  }
});
