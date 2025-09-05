import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/usersController.js";
import {requireAuth} from "../middleware/authMiddleware.js";
import { pool } from "../db.js";

export default async function usersRoutes(fastify, options) {
  // GET current logged-in user
  fastify.get('/me', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { rows } = await pool.query(
        'SELECT id, first_name, last_name, username, email, role, created_at FROM users WHERE id = $1',
        [request.user.id]
      );
      
      if (rows.length === 0) {
        reply.code(404);
        return { message: "User not found" };
      }
      
      return rows[0];
    } catch (err) {
      console.error("Error in /me:", err);
      reply.code(500);
      return { message: "Failed to fetch user info" };
    }
  });

  fastify.get('/', { preHandler: requireAuth }, getAllUsers);
  fastify.post('/', { preHandler: requireAuth }, createUser);
  fastify.put('/:id', { preHandler: requireAuth }, updateUser);
  fastify.delete('/:id', { preHandler: requireAuth }, deleteUser);
}
