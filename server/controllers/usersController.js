// server/controllers/usersController.js
import { pool } from "../db.js";
import bcrypt from "bcrypt";

// Sanitize input for logging
const sanitizeForLog = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/[\r\n\t]/g, '_').substring(0, 100);
};

// GET all users (don’t expose password_hash!)
export const getAllUsers = async (request, reply) => {
  try {
    const result = await pool.query(
      "SELECT id, username, first_name, last_name, email, role, created_at FROM users ORDER BY id ASC"
    );
    return result.rows;
  } catch (err) {
    console.error("Error fetching users:", sanitizeForLog(err.message));
    reply.code(500);
    return { message: "Failed to fetch users" };
  }
};

// CREATE new user
export const createUser = async (request, reply) => {
  const { username, password, first_name, last_name, email, role } = request.body;

  if (!username || !password || !first_name || !last_name || !email) {
    reply.code(400);
    return { message: "All fields are required" };
  }

  try {
    // check if username exists
    const checkUser = await pool.query("SELECT id FROM users WHERE username=$1", [username]);
    if (checkUser.rows.length > 0) {
      reply.code(400);
      return { message: "Username already exists" };
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // insert using password_hash column
    const result = await pool.query(
      `INSERT INTO users (username, password_hash, first_name, last_name, email, role) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, username, first_name, last_name, email, role, created_at`,
      [username, hashedPassword, first_name, last_name, email, role || "client"]
    );

    reply.code(201);
    return result.rows[0];
  } catch (err) {
    console.error("Error creating user:", sanitizeForLog(err.message));
    reply.code(500);
    return { message: "Failed to create user" };
  }
};

// UPDATE user (optionally update password)
export const updateUser = async (request, reply) => {
  const { id } = request.params;
  const { username, first_name, last_name, email, role, password } = request.body;

  try {
    // If password is provided, hash it
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2", [hashedPassword, id]);
    }

    // Update other fields
    const result = await pool.query(
      `UPDATE users 
       SET username=$1, first_name=$2, last_name=$3, email=$4, role=$5
       WHERE id=$6
       RETURNING id, username, first_name, last_name, email, role, created_at`,
      [username, first_name, last_name, email, role, id]
    );

    if (result.rows.length === 0) {
      reply.code(404);
      return { message: "User not found" };
    }

    return result.rows[0];
  } catch (err) {
    console.error("Error updating user:", sanitizeForLog(err.message));
    reply.code(500);
    return { message: "Failed to update user" };
  }
};

// DELETE user
export const deleteUser = async (request, reply) => {
  const { id } = request.params;

  try {
    const result = await pool.query("DELETE FROM users WHERE id=$1 RETURNING id", [id]);

    if (result.rows.length === 0) {
      reply.code(404);
      return { message: "User not found" };
    }

    return { message: "User deleted", id };
  } catch (err) {
    console.error("Error deleting user:", sanitizeForLog(err.message));
    reply.code(500);
    return { message: "Failed to delete user" };
  }
};
