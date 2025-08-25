import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;

// Use DATABASE_URL if provided (Railway), otherwise use individual connection parameters
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    }
  : {
      user: process.env.PGUSER || process.env.DB_USER,
      host: process.env.PGHOST || process.env.DB_HOST,
      database: process.env.PGDATABASE || process.env.DB_NAME,
      password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
      port: process.env.PGPORT || process.env.DB_PORT,
    };

export const pool = new Pool(poolConfig);

// Test connection once at startup
pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL database"))
  .catch(err => console.error("❌ Database connection error:", err));
