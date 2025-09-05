import { pool } from "../db.js";
import bcrypt from "bcrypt";

export default async function seedRoutes(fastify, options) {
  fastify.get('/seed-admin', async (request, reply) => {
    try {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || "admin123", 10);
      const result = await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (username) DO NOTHING`,
        ["Admin", "User", "admin", "admin@example.com", hashedPassword, "admin"]
      );

      if (result.rowCount === 0) {
        return "Admin already exists, skipping insert";
      }

      return "✅ Admin seeded successfully";
    } catch (err) {
      console.error(err);
      reply.code(500);
      return "❌ Error seeding admin";
    }
  });
}
