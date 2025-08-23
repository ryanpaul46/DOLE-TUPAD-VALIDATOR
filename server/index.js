// index.js
import express from "express";
import pg from "pg";
import dotenv from "dotenv";
import cors from "cors";
import usersRouter from "./routes/users.js";
import authRouter from "./routes/auth.js";
import uploadRoutes from "./routes/upload.js";


dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

export const pool = new pg.Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

pool.on("connect", () => console.log("Connected to PostgreSQL database"));


app.use("/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/uploads", express.static("uploads"));
app.use("/api", uploadRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
