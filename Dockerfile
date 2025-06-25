# Stage 1: Build the application
# Use a specific version of the official Puppeteer image that matches your package.json
FROM ghcr.io/puppeteer/puppeteer:21.5.2 AS builder

# The base image has a non-root user 'pptruser', but we need root for npm install.
USER root
WORKDIR /app

# Install all dependencies and build the app
COPY package*.json ./
RUN npm install --omit=optional
COPY . .
RUN npm run build:simple

# Stage 2: Create the production image
FROM ghcr.io/puppeteer/puppeteer:21.5.2

USER root
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
# Set cache directories to a temporary location to avoid permission issues
ENV XDG_CONFIG_HOME=/tmp/.chromium
ENV XDG_CACHE_HOME=/tmp/.chromium

# Copy package files and install only production dependencies
COPY --from=builder /app/package*.json ./
RUN npm install --production --omit=optional

# Copy the built application from the builder stage
COPY --from=builder /app/dist ./dist

# Give the non-root user ownership of the app files
RUN chown -R pptruser:pptruser /app

# Switch to the non-root user for security
USER pptruser

EXPOSE 3000

# Healthcheck to ensure the application is running correctly
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/healthz', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# The command to run the application
CMD ["node", "dist/index-simple.js"]
