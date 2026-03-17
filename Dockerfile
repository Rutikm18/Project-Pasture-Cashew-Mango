# ---- Build stage ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# ---- Runtime stage ----
FROM node:20-alpine
WORKDIR /app

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Give appuser ownership of all files
RUN chown -R appuser:appgroup /app

# Cloud Run injects PORT=8080; server.js already reads process.env.PORT
ENV PORT=8080
EXPOSE 8080

USER appuser

CMD ["node", "server.js"]
