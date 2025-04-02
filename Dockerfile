FROM node:20-slim

# Puppeteer dependencies
RUN apt-get update && apt-get install -y \
    chromium-browser \
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

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of the app
COPY . .

# Puppeteer environment config
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Expose the port Render uses
EXPOSE 3000

# Start the app
CMD ["node", "index.js"]