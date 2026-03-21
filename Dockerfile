FROM node:20-alpine

# Install build dependencies for native modules (optional but recommended for bcrypt/ws/etc)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package definitions
COPY package.json ./
COPY client/package.json ./client/

# Install root and client dependencies
RUN npm install
RUN cd client && npm install

# Copy application source
COPY . .

# Build Vite frontend and Express backend
RUN npm run build

# Expose the API and Web port
EXPOSE 5000

# Start script: run Drizzle schema push, seed database, and start server
CMD ["sh", "-c", "npm run db:setup && npm start"]
