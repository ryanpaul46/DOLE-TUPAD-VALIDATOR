// index.js
import express from "express";
import pg from "pg";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import usersRouter from "./routes/users.js";
import authRouter from "./routes/auth.js";
import uploadRoutes from "./routes/upload.js";

dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Configure CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "https://dole-tupad-validator-production.up.railway.app/",
    credentials: true,
  })
);

// Database pool
export const pool = new pg.Pool({
  user: process.env.PGUSER || process.env.DB_USER,
  host: process.env.PGHOST || process.env.DB_HOST,
  database: process.env.PGDATABASE || process.env.DB_NAME,
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
  port: process.env.PGPORT || process.env.DB_PORT,
});

pool.on("connect", () => console.log("Connected to PostgreSQL database"));

// API routes (⚡ put these BEFORE static serving)
app.use("/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/uploads", express.static("uploads"));
app.use("/api", uploadRoutes);

// Serve frontend build in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "/client/dist")));

  // Handle React routing
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "/client/dist/index.html"));
  });
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
