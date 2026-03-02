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

// ============== Middleware ==============

// Security
app.use(helmet());

// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";
const corsOptions = {
  origin: corsOrigin,
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

// 404 handler
app.use((req: Request, res: Response): void => {
  res.status(404).json({ error: "Not Found" });
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
