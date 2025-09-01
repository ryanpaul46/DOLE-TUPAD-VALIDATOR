import express from "express";
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/usersController.js";
import {requireAuth} from "../middleware/authMiddleware.js";
import { pool } from "../db.js";

const router = express.Router();

// GET current logged-in user
router.get("/me", requireAuth, async (req, res) => {
  try {
    // Fetch complete user data from database
    const { rows } = await pool.query(
      'SELECT id, first_name, last_name, username, email, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error("Error in /me:", err);
    res.status(500).json({ message: "Failed to fetch user info" });
  }
});

// GET all users
router.get("/", requireAuth, getAllUsers);

// CREATE user
router.post("/", requireAuth, createUser);

// UPDATE user
router.put("/:id", requireAuth, updateUser);

// DELETE user
router.delete("/:id", requireAuth, deleteUser);

export default router;
