// server/controllers/authController.js
import { pool } from "../db.js";  // ✅ make sure this matches your db connection file
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { findUserByUsernameOrEmail } from "../models/userModel.js";
import { generateCSRFToken } from "../middleware/csrfMiddleware.js";

// Login
export const login = async (request, reply) => {
  try {
    const { username, password } = request.body;
    if (!username || !password) {
      reply.code(400);
      return { message: "Username and password are required" };
    }

    const user = await findUserByUsernameOrEmail(username);
    if (!user) {
      reply.code(401);
      return { message: "Invalid credentials" };
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      reply.code(401);
      return { message: "Invalid credentials" };
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    const csrfToken = generateCSRFToken(user.id);

    return {
      token,
      csrfToken,
      user: {
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
      },
    };
  } catch (err) {
    console.error("Login error:", err.message);
    reply.code(500);
    return { message: "Server error during login" };
  }
};

// Get current logged-in user
export const me = async (request, reply) => {
  try {
    const { id } = request.user;
    const { rows } = await pool.query(
      `SELECT id, first_name, last_name, username, email, role, created_at 
       FROM users WHERE id=$1`,
      [id]
    );
    if (!rows.length) {
      reply.code(404);
      return { message: "User not found" };
    }

    return rows[0];
  } catch (err) {
    console.error("Me route error:", err.message);
    reply.code(500);
    return { message: "Server error fetching user info" };
  }
};
