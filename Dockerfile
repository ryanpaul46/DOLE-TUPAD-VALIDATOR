# ---------- FRONTEND BUILD ----------
FROM node:20 AS frontend
WORKDIR /app/client

# Copy package.json and package-lock.json and install dependencies (cache layer)
COPY client/package*.json ./
RUN npm install

# Copy frontend source
COPY client/ ./

# Build frontend
RUN npm run build

# ---------- BACKEND ----------
FROM node:20 AS backend
WORKDIR /app

# Copy package.json and package-lock.json and install dependencies (cache layer)
COPY server/package*.json ./
RUN npm install --production

# Copy backend source
COPY server/ ./

# Copy frontend build from previous stage
COPY --from=frontend /app/client/dist ./client/dist

# Expose backend port
EXPOSE 4000

# Use environment variables set in Render dashboard (no secrets in Dockerfile)
# Example: DATABASE_URL, FRONTEND_URL, JWT_SECRET, PORT

# Start backend
CMD ["node", "index.js"]
