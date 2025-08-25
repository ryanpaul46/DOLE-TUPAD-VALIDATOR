# Use official Node.js image
FROM node:18

# Set working directory
WORKDIR /app

# Copy server first
COPY server/package*.json ./server/
RUN cd server && npm install

# Copy client
COPY client/package*.json ./client/
RUN cd client && npm install && npm run build

# Copy the rest of the code
COPY . .

# Expose port
EXPOSE 4000

# Start server
CMD ["node", "server/index.js"]
