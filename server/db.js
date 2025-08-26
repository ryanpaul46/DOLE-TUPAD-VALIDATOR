// db.js
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;

// Use DATABASE_URL for Render PostgreSQL with SSL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Test connection once at startup
pool.connect()
  .then(() => console.log("✅ Connected to Render PostgreSQL database"))
  .catch(err => console.error("❌ Database connection error:", err));

export { pool };
