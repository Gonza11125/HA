import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { initializeDatabase } from "./config/database";
import { errorHandler } from "./middleware/errorHandler";
import { rateLimiter } from "./middleware/rateLimiter";
import { logger } from "./utils/logger";

// Import routes
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import siteRoutes from "./routes/sites";
import agentRoutes from "./routes/agent";
import adminRoutes from "./routes/admin";
import healthRoutes from "./routes/health";
import dataRoutes from "./routes/data";

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.BACKEND_PORT || 5000;

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

const getAllowedCorsOrigins = (): Set<string> => {
  const raw = process.env.CORS_ORIGIN || "";
  return new Set(
    raw
      .split(",")
      .map((origin) => trimTrailingSlash(origin.trim()))
      .filter(Boolean)
  );
};

const allowedCorsOrigins = getAllowedCorsOrigins();

// ============== Middleware ==============

// Security
app.use(helmet());

// CORS configuration - allow localhost and local network IPs
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    // Allow localhost for development
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    
    // Allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    const localNetworkPattern = /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/;
    if (localNetworkPattern.test(origin)) {
      return callback(null, true);
    }
    
    // Allow custom CORS_ORIGIN values from environment (comma-separated supported)
    if (allowedCorsOrigins.has(trimTrailingSlash(origin))) {
      return callback(null, true);
    }
    
    // Allow Home Assistant Cloud ingress (via X-Forwarded-Host header)
    // When behind a reverse proxy (nginx), compare X-Forwarded-Host with Origin
    if (process.env.NODE_ENV === 'production') {
      // Frontend will send Origin if proxied, backend should trust reverse proxy
      // This allows HA ingress: https://xxx.ui.nabu.casa/api/
      return callback(null, true);
    }
    
    // Reject all other origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Logging
app.use(morgan("dev"));

// Parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());

// Global rate limiter
app.use(rateLimiter);

// ============== Routes ==============
// Serve frontend static files (built React SPA)
const FRONTEND_DIR = "/app/frontend/dist";
app.use(express.static(FRONTEND_DIR));

// Health check
app.use("/health", healthRoutes);

// Public routes
app.use("/api/auth", authRoutes);

// Protected routes (require authentication)
app.use("/api/users", userRoutes);
app.use("/api/sites", siteRoutes);

// Agent routes (device token based)
app.use("/api/agent", agentRoutes);

// Data routes (real-time solar data)
app.use("/api/data", dataRoutes);

// Admin routes (admin role required)
app.use("/api/admin", adminRoutes);

// SPA Fallback: Serve index.html for non-API routes not matching files
app.use((req: Request, res: Response, next) => {
  // Skip API and other non-SPA routes
  if (req.path.startsWith('/api/') || req.path.startsWith('/health')) {
    return next();
  }
  // Check if request is for a file (has extension)
  if (/\.[a-z0-9]+$/i.test(req.path)) {
    return next();
  }
  // Serve index.html for SPA routes
  res.sendFile(`${FRONTEND_DIR}/index.html`);
});

// 404 handler
app.use((req: Request, res: Response): void => {
  res.status(404).json({ error: "Nenalezeno" });
});

// ============== Error Handling ==============
app.use(errorHandler);

// ============== Database & Server Initialization ==============
async function startServer() {
  try {
    // Initialize database
    logger.info("Initializing database...");
    await initializeDatabase();
    logger.info("Database initialized successfully");

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  logger.info("Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Shutting down gracefully...");
  process.exit(0);
});

// Start the server
startServer();

export default app;
