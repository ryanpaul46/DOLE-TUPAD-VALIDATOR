// server/controllers/authController.js
import { pool } from "../db.js";  // ✅ make sure this matches your db connection file
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { findUserByUsernameOrEmail } from "../models/userModel.js";

// Login
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const user = await findUserByUsernameOrEmail(username);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password_hash); // ✅ using password_hash
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Server error during login" });
  }
};

// Get current logged-in user
export const me = async (req, res) => {
  try {
    const { id } = req.user;
    const { rows } = await pool.query(
      `SELECT id, first_name, last_name, username, email, role, created_at 
       FROM users WHERE id=$1`,
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Me route error:", err.message);
    res.status(500).json({ message: "Server error fetching user info" });
  }
};
