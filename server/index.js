import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import { pool } from "./db.js";
import usersRouter from "./routes/users.js";
import authRouter from "./routes/auth.js";
import uploadRoutes from "./routes/upload.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// CORS configured for deployed frontend
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

// Test PostgreSQL connection at startup
pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL database"))
  .catch(err => console.error("❌ Database connection error:", err));

// API routes
app.use("/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api", uploadRoutes);

// ---------- Serve frontend in production ----------
if (process.env.NODE_ENV === "production") {
  // Correct path to the build folder
  const clientDist = path.join(__dirname, "client", "dist");

  // Serve static files
  app.use(express.static(clientDist));

  // Fallback: all GET requests return index.html
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
