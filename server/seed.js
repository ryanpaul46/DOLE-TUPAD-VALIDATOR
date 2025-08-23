import { pool } from "./db.js";  // use curly braces for named export
import bcrypt from "bcrypt";

const seedAdmin = async () => {
  try {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    const res = await pool.query(
      `INSERT INTO users (first_name, last_name, username, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (username) DO NOTHING`,
      ["Admin", "User", "admin", "admin@example.com", hashedPassword, "admin"]
    );
    console.log("Admin seeded successfully");
    pool.end();
  } catch (err) {
    console.error("❌ Error seeding admin user:", err);
  }
};

seedAdmin();
