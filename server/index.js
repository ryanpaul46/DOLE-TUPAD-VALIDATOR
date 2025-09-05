import Fastify from "fastify";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { Server } from "socket.io";
import { generateCSRFToken } from "./middleware/csrfMiddleware.js";
import { pool } from "./db.js";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sanitize input for logging
const sanitizeForLog = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/[\r\n\t]/g, '_').substring(0, 100);
};

// Create Fastify instance
const fastify = Fastify({
  logger: process.env.NODE_ENV === 'development' && process.env.VERBOSE_LOGGING === 'true'
});

// Initialize Socket.IO
let io;
const initializeSocketIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL || "http://localhost:5173",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
      ],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    socket.on('request-statistics', async () => {
      try {
        const stats = await getAdminStatistics();
        socket.emit('statistics-update', stats);
      } catch (err) {
        console.error('Error fetching statistics for socket:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
    });
  });

  return io;
};

// Function to broadcast statistics updates
const broadcastStatistics = async () => {
  if (io) {
    try {
      const stats = await getAdminStatistics();
      io.emit('statistics-update', stats);
    } catch (err) {
      console.error('Error broadcasting statistics:', err);
    }
  }
};

// Admin statistics function
const getAdminStatistics = async () => {
  const queries = {
    totalBeneficiaries: 'SELECT COUNT(*) as count FROM uploaded_beneficiaries',
    totalUsers: 'SELECT COUNT(*) as count FROM users',
    provinces: `SELECT province, COUNT(*) as count FROM uploaded_beneficiaries 
                WHERE province IS NOT NULL AND province != '' 
                GROUP BY province ORDER BY count DESC`,
    projectSeries: `SELECT project_series, COUNT(*) as count FROM uploaded_beneficiaries 
                    WHERE project_series IS NOT NULL AND project_series != '' 
                    GROUP BY project_series ORDER BY count DESC`,
    genderDistribution: `SELECT sex, COUNT(*) as count FROM uploaded_beneficiaries 
                         WHERE sex IS NOT NULL AND sex != '' 
                         GROUP BY sex ORDER BY count DESC`,
    ageStats: `SELECT AVG(age) as avg_age, MIN(age) as min_age, MAX(age) as max_age 
               FROM uploaded_beneficiaries WHERE age IS NOT NULL AND age > 0`
  };

  const results = {};
  for (const [key, query] of Object.entries(queries)) {
    const result = await pool.query(query);
    results[key] = key === 'totalBeneficiaries' || key === 'totalUsers' 
      ? parseInt(result.rows[0]?.count || 0)
      : key === 'ageStats' 
        ? result.rows[0] 
        : result.rows;
  }

  results.totalProjectSeries = results.projectSeries?.length || 0;
  return results;
};

// Register plugins
await fastify.register(import('@fastify/cors'), {
  origin: [
    process.env.FRONTEND_URL || "http://localhost:5173",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    process.env.CORS_ORIGIN || "http://localhost:5173"
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token']
});

await fastify.register(import('@fastify/cookie'));

await fastify.register(import('@fastify/session'), {
  secret: process.env.SESSION_SECRET || 'dev-session-secret',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
});

await fastify.register(import('@fastify/multipart'), {
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("✅ Created uploads directory");
}

// Static file serving for uploads
await fastify.register(import('@fastify/static'), {
  root: uploadsDir,
  prefix: '/uploads/'
});

// Test PostgreSQL connection
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

// CSRF token endpoint
fastify.get('/api/csrf-token', async (request, reply) => {
  const token = generateCSRFToken();
  request.session.csrfToken = token;
  return { csrfToken: token };
});

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  try {
    await pool.query("SELECT NOW()");
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "connected",
      environment: process.env.NODE_ENV,
      uptime: process.uptime()
    };
  } catch (err) {
    reply.code(500);
    return {
      status: "error",
      timestamp: new Date().toISOString(),
      database: "disconnected",
      error: sanitizeForLog(err.message)
    };
  }
});

// Development routes
if (process.env.NODE_ENV === 'development') {
  fastify.get('/dev/info', async (request, reply) => {
    return {
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
    };
  });
}

// Register route modules
await fastify.register(import('./routes/auth.js'), { prefix: '/auth' });
await fastify.register(import('./routes/users.js'), { prefix: '/api/users' });

// Import and register upload routes with broadcast function
const uploadModule = await import('./routes/upload.js');
uploadModule.setBroadcastFunction(broadcastStatistics);
await fastify.register(uploadModule.default, { prefix: '/api' });

await fastify.register(import('./routes/seed.js'), { prefix: '/seed' });



// Global error handler
fastify.setErrorHandler((error, request, reply) => {
  console.error('Global error handler:', error);
  
  const statusCode = error.statusCode || 500;
  
  if (process.env.NODE_ENV === 'development') {
    reply.code(statusCode).send({
      error: sanitizeForLog(error.message),
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  } else {
    reply.code(statusCode).send({
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// 404 handler
fastify.setNotFoundHandler((request, reply) => {
  reply.code(404).send({
    error: 'Route not found',
    path: request.url,
    method: request.method,
    timestamp: new Date().toISOString()
  });
});

// Start server
const start = async () => {
  try {
    const PORT = process.env.PORT || 4000;
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    
    // Initialize Socket.IO after server starts
    initializeSocketIO(fastify.server);
    
    // Set up periodic statistics broadcast (every 30 seconds)
    setInterval(broadcastStatistics, 30000);
    
    console.log(`🚀 Backend running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:5173"}`);
    console.log(`📁 Uploads directory: ${uploadsDir}`);
    console.log(`🔌 WebSocket server initialized`);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 Dev info available at: http://localhost:${PORT}/dev/info`);
      console.log(`❤️  Health check at: http://localhost:${PORT}/health`);
    }
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`🔄 ${signal} received, shutting down gracefully`);
  try {
    if (io) {
      io.close();
      console.log('🔌 WebSocket server closed');
    }
    await fastify.close();
    await pool.end();
    console.log('✅ Process terminated');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};

// No need to export broadcastStatistics anymore

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

start();