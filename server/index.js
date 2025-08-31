import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import session from "express-session";
import { generateCSRFToken } from "./middleware/csrfMiddleware.js";

// Sanitize input for logging
const sanitizeForLog = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/[\r\n\t]/g, '_').substring(0, 100);
};

import { pool } from "./db.js";
import usersRouter from "./routes/users.js";
import authRouter from "./routes/auth.js";
import uploadRoutes from "./routes/upload.js";
import seedRouter from "./routes/seed.js";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enhanced middleware for development
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Enhanced CORS configuration for development
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      process.env.CORS_ORIGIN || "http://localhost:5173"
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token']
  })
);

// Session middleware for CSRF protection
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Development logging middleware
if (process.env.NODE_ENV === 'development' && process.env.VERBOSE_LOGGING === 'true') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${sanitizeForLog(req.method)} ${sanitizeForLog(req.url)}`);
    next();
  });
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("✅ Created uploads directory");
}

// Test PostgreSQL connection with enhanced error handling
pool.connect()
  .then(() => {
    console.log("✅ Connected to PostgreSQL database");
    console.log(`📊 Database: ${process.env.PGDATABASE} on ${process.env.PGHOST}:${process.env.PGPORT}`);
  })
  .catch(err => {
    console.error("❌ Database connection error:", err.message);
    if (process.env.DEBUG === 'true') {
      console.error("Full error details:", err);
    }
  });

// Static file serving for uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// CSRF token endpoint
app.get('/api/csrf-token', (req, res) => {
  const token = generateCSRFToken();
  req.session.csrfToken = token;
  res.json({ csrfToken: token });
});

// API routes
app.use("/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api", uploadRoutes);
app.use("/seed", seedRouter);

// Enhanced health check endpoint
app.get("/health", async (req, res) => {
  try {
    // Test database connection
    const dbTest = await pool.query("SELECT NOW()");
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "connected",
      environment: process.env.NODE_ENV,
      uptime: process.uptime()
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      database: "disconnected",
      error: sanitizeForLog(err.message)
    });
  }
});

// Development routes
if (process.env.NODE_ENV === 'development') {
  app.get("/dev/info", (req, res) => {
    res.json({
      environment: process.env.NODE_ENV,
      port: process.env.PORT,
      database: {
        host: process.env.PGHOST,
        port: process.env.PGPORT,
        database: process.env.PGDATABASE,
        user: process.env.PGUSER
      },
      frontend_url: process.env.FRONTEND_URL,
      cors_origin: process.env.CORS_ORIGIN
    });
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  if (process.env.NODE_ENV === 'development') {
    res.status(err.status || 500).json({
      error: sanitizeForLog(err.message),
      stack: err.stack,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(err.status || 500).json({
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:5173"}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 Dev info available at: http://localhost:${PORT}/dev/info`);
    console.log(`❤️  Health check at: http://localhost:${PORT}/health`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
    pool.end();
  });
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
    pool.end();
  });
});
