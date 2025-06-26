# Build stage
FROM ghcr.io/puppeteer/puppeteer:21.5.2 AS builder

USER root
WORKDIR /app

# Install dependencies and build
COPY package*.json ./
RUN npm config set registry https://registry.npmjs.org/ && npm install --omit=optional
COPY . .
RUN npm run build:simple

# Production stage
FROM ghcr.io/puppeteer/puppeteer:21.5.2

USER root
WORKDIR /app

# Environment variables for Puppeteer in Docker
ENV NODE_ENV=production
ENV XDG_CONFIG_HOME=/tmp/.chromium
ENV XDG_CACHE_HOME=/tmp/.chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false

# Install system dependencies for Puppeteer and dbus
RUN apt-get update && apt-get install -y --no-install-recommends \
    dbus \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    libu2f-udev \
    libxshmfence1 \
    libglu1-mesa \
    && rm -rf /var/lib/apt/lists/*

# Copy production files
COPY --from=builder /app/package*.json ./
RUN npm install --production --omit=optional
COPY --from=builder /app/dist ./dist

# Install sudo and configure pptruser
RUN apt-get update && apt-get install -y sudo && rm -rf /var/lib/apt/lists/* \
    && echo "pptruser ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

# Create chromium cache directories with proper permissions
RUN mkdir -p /tmp/.chromium && chown -R pptruser:pptruser /tmp/.chromium

# Give ownership to pptruser
RUN chown -R pptruser:pptruser /app

# Switch to pptruser for security (Puppeteer runs best as non-root)
USER pptruser

EXPOSE 3000

# Start dbus service and run application with verbose logging
CMD ["sh", "-c", "sudo service dbus start && node dist/index-simple.js"]
