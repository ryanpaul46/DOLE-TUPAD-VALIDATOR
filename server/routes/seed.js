// routes/seed.js
import express from "express";
import { pool } from "../db.js";
import bcrypt from "bcrypt";

const router = express.Router();

router.get("/seed-admin", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, username, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (username) DO NOTHING`,
      ["Admin", "User", "admin", "admin@example.com", hashedPassword, "admin"]
    );

    if (result.rowCount === 0) {
      return res.send("Admin already exists, skipping insert");
    }

    res.send("✅ Admin seeded successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error seeding admin");
  }
});

export default router;
