import express from "express";
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/usersController.js";
import {requireAuth} from "../middleware/authMiddleware.js"; // <-- make sure you have this

const router = express.Router();

// GET current logged-in user
router.get("/me", requireAuth, async (req, res) => {
  try {
    res.json({
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
    });
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
