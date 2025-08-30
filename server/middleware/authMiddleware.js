import jwt from "jsonwebtoken";

// General authentication middleware
export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not configured');
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, username, role }
    next();
  } catch (err) {
    const sanitizedError = err.message.replace(/[\r\n\t]/g, '');
    console.error("JWT verification error:", sanitizedError);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Admin-only middleware
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }

  next();
};
