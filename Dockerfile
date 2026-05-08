# Stage 1: Base image
FROM node:24-alpine AS base

# Install openssl for Prisma engine to work on Alpine Linux
# libc6-compat provides compatibility for some native Node modules if needed
RUN apk add --no-cache openssl libc6-compat

# Stage 2: Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Install all dependencies including dev dependencies (needed for compilation)
RUN npm ci

# Stage 3: Build the application
FROM deps AS builder
WORKDIR /app
# Copy the source code
COPY . .
# Generate Prisma Client
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" npx prisma generate
# Build the NestJS app
RUN npm run build
# Compile the Prisma seed script to JavaScript
RUN npx tsc prisma/seed.ts --outDir dist/prisma --esModuleInterop --module nodenext --target ES2023

# Stage 4: Production runner
FROM base AS runner
WORKDIR /app

# Set NODE_ENV to production
ENV NODE_ENV=production
ENV PRISMA_SEED_COMMAND="node dist/prisma/seed.js"

# Copy package files
COPY package.json package-lock.json ./

# Install only production dependencies, and add `prisma` CLI for migrations hook
RUN npm ci --omit=dev && npm install prisma@^7.0.1

# Ensure uploads directory exists and is owned by non-root node user
# (Docker native node:alpine image includes a 'node' user)
RUN mkdir -p uploads && chown -R node:node uploads

# Copy built application and seed script
COPY --from=builder --chown=node:node /app/dist ./dist

# Copy generated Prisma Client specific to Alpine Linux
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy the prisma schema directory and config file for migrations
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Switch to non-root user for security
USER node

# Expose API port (Default NestJS port)
EXPOSE 3000

# Start command: run migrations, seed the database, then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/src/main.js"]
