FROM node:20-slim

# Install dependencies for Puppeteer and Chrome
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    xdg-utils \
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
    curl \
    && rm -rf /var/lib/apt/lists/*

# Download and install Chrome manually
RUN curl -sSL https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -o chrome.deb \
    && apt-get update && apt-get install -y ./chrome.deb \
    && rm chrome.deb

# Set working directory
WORKDIR /app

# Copy dependencies and install
COPY package*.json ./
RUN npm install

# Copy app source
COPY . .

# Puppeteer config
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

# Expose port
EXPOSE 3000

# Start app
CMD ["node", "index.js"]