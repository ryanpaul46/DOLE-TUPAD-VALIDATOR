# ---------- FRONTEND BUILD ----------
FROM node:20 AS frontend
WORKDIR /app/client

# install deps
COPY client/package*.json ./
RUN npm install

# copy source
COPY client/ ./

# build frontend
RUN npm run build

# ---------- BACKEND ----------
FROM node:20 AS backend
WORKDIR /app

# install deps
COPY server/package*.json ./
RUN npm install

# copy backend source
COPY server/ ./

# copy frontend build into backend folder (Express will serve from ./client/dist)
COPY --from=frontend /app/client/dist ./client/dist

# expose backend port
EXPOSE 4000

# start server
CMD ["node", "index.js"]
