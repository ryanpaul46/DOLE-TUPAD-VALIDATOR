# ---------- Build client ----------
FROM node:18 AS client-build

WORKDIR /app/client

# Copy client package.json and install deps
COPY client/package*.json ./
COPY client/vite.config.js ./
RUN npm install

# Copy client source and build
COPY client/ ./
RUN npm run build


# ---------- Build server ----------
FROM node:18 AS server

WORKDIR /app

# Copy server package.json and install deps
COPY server/package*.json ./
RUN npm install

# Copy server source
COPY server/ ./server

# Copy client build into server so Express can serve it
COPY --from=client-build /app/client/dist ./client/dist

# Set environment variables (Railway overrides these anyway)
ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["node", "server/index.js"]
