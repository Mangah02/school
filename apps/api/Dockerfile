# apps/api/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
# Copy root package files for workspace resolution
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY apps/api ./apps/api

# Generate Prisma Client and build the NestJS app
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npm run build

# --- Production Stage ---
FROM node:20-alpine AS runner

WORKDIR /app/apps/api

# Set NODE_ENV to production
ENV NODE_ENV=production

# Install ONLY production dependencies
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm ci --omit=dev

# Copy built artifacts and Prisma schema from builder
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001
USER nestjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]