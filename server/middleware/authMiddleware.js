import jwt from "jsonwebtoken";

// Sanitize input for logging
const sanitizeForLog = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/[\r\n\t]/g, '_').substring(0, 100);
};

// General authentication middleware
export const requireAuth = async (request, reply) => {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    reply.code(401);
    throw new Error("No token provided");
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    request.user = decoded; // { id, username, role }
  } catch (err) {
    console.error("JWT verification error:", sanitizeForLog(err.message));
    reply.code(401);
    throw new Error("Invalid or expired token");
  }
};

// Admin-only middleware
export const requireAdmin = async (request, reply) => {
  if (!request.user) {
    reply.code(401);
    throw new Error("Unauthorized");
  }

  if (request.user.role !== "admin") {
    reply.code(403);
    throw new Error("Admin access required");
  }
};
