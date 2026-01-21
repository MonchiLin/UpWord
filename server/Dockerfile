# Base image
FROM oven/bun:1

# Set working directory
WORKDIR /app

# Copy dependency files
COPY package.json ./
COPY bun.lock ./

# Install dependencies
RUN bun install --production

# Copy source code
COPY . .

# Environment variables should be injected at runtime, 
# but we can set defaults or expose ports
ENV PORT=7860

# Build time injection
ARG BUILD_TIME
ENV BUILD_TIME=$BUILD_TIME

# Production environment
ENV NODE_ENV=production

# Expose the API port
EXPOSE 7860

# Start the server
CMD ["/bin/sh", "-c", "bun run migrate up && bun run index.ts"]
