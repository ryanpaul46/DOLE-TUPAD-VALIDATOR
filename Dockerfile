# ---------- FRONTEND BUILD ----------
FROM node:20 AS frontend
WORKDIR /app/client

# Copy frontend dependencies and install
COPY client/package*.json ./
RUN npm install

# Copy frontend source and build
COPY client/ ./
RUN npm run build

# ---------- BACKEND ----------
FROM node:20 AS backend
WORKDIR /app

# Copy backend dependencies and install (production only)
COPY server/package*.json ./
RUN npm install --production

# Copy backend source
COPY server/ ./

# Copy frontend build into backend folder
COPY --from=frontend /app/client/dist ./client/dist

# Expose backend port
EXPOSE 4000

# Start backend server
CMD ["node", "index.js"]
