import crypto from 'crypto';

const csrfTokens = new Set();

export const generateCSRFToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  csrfTokens.add(token);
  return token;
};

export const validateCSRF = async (request, reply) => {
  const token = request.headers['x-csrf-token'];
  
  if (!token) {
    reply.code(403);
    throw new Error('CSRF token required');
  }
  
  if (!csrfTokens.has(token)) {
    reply.code(403);
    throw new Error('Invalid CSRF token');
  }
  
  // Remove token after use (one-time use)
  csrfTokens.delete(token);
};