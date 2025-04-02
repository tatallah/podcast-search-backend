FROM node:20-slim

# Install required libraries and Google Chrome
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
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy dependencies and install
COPY package*.json ./
RUN npm install

# Copy rest of the app
COPY . .

# Puppeteer config
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Expose port
EXPOSE 3000

# Start app
CMD ["node", "index.js"]