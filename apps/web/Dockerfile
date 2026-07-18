# apps/web/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
RUN npm ci

COPY apps/web ./apps/web
WORKDIR /app/apps/web
RUN npm run build

# --- Production Stage ---
FROM node:20-alpine AS runner

WORKDIR /app/apps/web
ENV NODE_ENV=production

# Copy standalone output and public assets
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]