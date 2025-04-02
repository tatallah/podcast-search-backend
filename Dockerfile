# Use official Node.js base image
FROM node:20-slim

# Puppeteer dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    libx11-xcb1 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libgbm1 \
    libgtk-3-0 \
    libasound2 \
    libxshmfence1 \
    libnss3 \
    libxss1 \
    libxtst6 \
    libxrandr2 \
    libxdamage1 \
    libdrm2 \
    libxcomposite1 \
    ca-certificates \
    fonts-liberation \
    xdg-utils \
    wget \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files first (for caching)
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Copy the rest of the app
COPY . .

# Puppeteer-specific environment settings
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD_
