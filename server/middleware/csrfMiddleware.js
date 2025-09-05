import crypto from 'crypto';

const csrfTokens = new Map();

export const generateCSRFToken = (userId) => {
  const token = crypto.randomBytes(32).toString('hex');
  csrfTokens.set(userId, token);
  return token;
};

export const validateCSRF = async (request, reply) => {
  const token = request.headers['x-csrf-token'];
  const userId = request.user?.id;
  
  if (!token || !userId) {
    reply.code(403);
    throw new Error('Invalid CSRF token');
  }
  
  const storedToken = csrfTokens.get(userId);
  if (!storedToken || storedToken !== token) {
    reply.code(403);
    throw new Error('Invalid CSRF token');
  }
};