// db.js
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;

// Enhanced PostgreSQL configuration for local development
const getDatabaseConfig = () => {
  if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    };
  }
  
  // Development configuration
  return {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT) || 5432,
    database: process.env.PGDATABASE || 'tupad_validator',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    
    // Connection pool settings for development
    min: parseInt(process.env.DB_POOL_MIN) || 2,
    max: parseInt(process.env.DB_POOL_MAX) || 10,
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT) || 30000,
    connectionTimeoutMillis: 5000,
    
    // Development specific settings
    ssl: false, // Disable SSL for local development
    
    // Enhanced logging for development
    ...(process.env.DEBUG === 'true' && {
      log: (msg) => console.log('📊 Database:', msg)
    })
  };
};

const pool = new Pool(getDatabaseConfig());

// Enhanced connection handling with better error reporting
pool.on('connect', () => {
  if (process.env.VERBOSE_LOGGING === 'true') {
    console.log('🔗 New database connection established');
  }
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err.message);
  if (process.env.DEBUG === 'true') {
    console.error('Full error details:', err);
  }
});

pool.on('remove', () => {
  if (process.env.VERBOSE_LOGGING === 'true') {
    console.log('🔌 Database connection removed from pool');
  }
});

// Initialize database tables for development
const initializeDatabase = async () => {
  try {
    // Create users table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'client',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create uploaded_beneficiaries table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS uploaded_beneficiaries (
        id SERIAL PRIMARY KEY,
        project_series TEXT,
        id_number TEXT,
        name TEXT,
        first_name TEXT,
        middle_name TEXT,
        last_name TEXT,
        ext_name TEXT,
        birthdate DATE,
        barangay TEXT,
        city_municipality TEXT,
        province TEXT,
        district TEXT,
        type_of_id TEXT,
        id_no TEXT,
        contact_no TEXT,
        type_of_beneficiary TEXT,
        occupation TEXT,
        sex TEXT,
        civil_status TEXT,
        age INTEGER,
        dependent TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create indexes for better performance (with error handling)
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_beneficiaries_name ON uploaded_beneficiaries(name)',
      'CREATE INDEX IF NOT EXISTS idx_beneficiaries_project_series ON uploaded_beneficiaries(project_series)',
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)'
    ];

    for (const indexQuery of indexes) {
      try {
        await pool.query(indexQuery);
      } catch (err) {
        // Ignore duplicate key errors for indexes
        if (err.code !== '23505') {
          console.warn(`⚠️ Index creation warning: ${err.message}`);
        }
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Database tables initialized successfully');
    }
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
    if (process.env.DEBUG === 'true') {
      console.error('Full initialization error:', err);
    }
  }
};

// Test connection and initialize database
pool.connect()
  .then(async (client) => {
    const result = await client.query('SELECT NOW()');
    console.log(`✅ Connected to ${process.env.NODE_ENV === 'production' ? 'production' : 'local PostgreSQL'} database`);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`📅 Database time: ${result.rows[0].now}`);
      await initializeDatabase();
    }
    
    client.release();
  })
  .catch(err => {
    console.error("❌ Database connection error:", err.message);
    if (process.env.DEBUG === 'true') {
      console.error("Connection details:", {
        host: process.env.PGHOST,
        port: process.env.PGPORT,
        database: process.env.PGDATABASE,
        user: process.env.PGUSER
      });
    }
  });

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('🔄 Closing database connections...');
  pool.end(() => {
    console.log('✅ Database connections closed.');
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export { pool };
