import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';

// Global rate limiter
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs (increased for normal usage)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req: Request) => {
    // Skip rate limiting for health checks and high-frequency agent pushes
    return req.path === '/health' || req.path === '/api/agent/push';
  },
  handler: (req: Request, res: Response) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests, please try again later'
    });
  }
});

// Auth endpoints rate limiter (stricter)
export const authRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX_REQUESTS || '200'), // 200 attempts (enough for normal usage)
  message: 'Too many login attempts, please try again later.',
  standardHeaders: false,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req: Request, res: Response) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many login attempts, please try again later'
    });
  }
});

// API rate limiter (moderate)
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute (increased for dashboard polling)
  standardHeaders: false,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(`API rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'API rate limit exceeded'
    });
  }
});
