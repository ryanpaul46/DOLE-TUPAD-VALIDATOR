import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Example client route
router.get("/dashboard", requireAuth, (req, res) => {
  if (req.user.role !== "client") return res.status(403).json({ message: "Client access required" });
  res.json({ message: `Welcome client ${req.user.username}` });
});

export default router;
