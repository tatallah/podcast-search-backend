const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Spotify token management
let spotifyToken = null;
let tokenExpiry = 0;

async function getSpotifyToken() {
  if (spotifyToken && Date.now() < tokenExpiry) {
    return spotifyToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  spotifyToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;

  return spotifyToken;
}

// Express app setup
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Search endpoint
app.post('/search', async (req, res) => {
  const { podcastName } = req.body;

  if (!podcastName) {
    return res.status(400).json({ error: 'Podcast name is required' });
  }

  const results = {};

  // Define search logic for each platform
  const platforms = {
    Apple: async () => {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(podcastName)}&entity=podcast&limit=10`;
      const response = await fetch(url);
      const data = await response.json();
      const target = podcastName.trim().toLowerCase();
      return data.results.some(p =>
        p.collectionName.trim().toLowerCase() === target
      );
    },
    Spotify: async () => {
      const token = await getSpotifyToken();
      const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(podcastName)}&type=show&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      return data.shows.items.some(show =>
        show.name.toLowerCase() === podcastName.toLowerCase()
      );
    },
    Stitcher: async () => {
      const browser = await puppeteer.launch({
        headless: 'new',
        executablePath: '/usr/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      const url = `https://www.stitcher.com/search?query=${encodeURIComponent(podcastName)}`;
      await page.goto(url, { waitUntil: 'networkidle2' });
      const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
      await browser.close();
      return pageText.includes(podcastName.toLowerCase());
    },
    Podbean: async () => {
      const browser = await puppeteer.launch({
        headless: 'new',
        executablePath: '/usr/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      const url = `https://www.podbean.com/search?q=${encodeURIComponent(podcastName)}`;
      await page.goto(url, { waitUntil: 'networkidle2' });
      const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
      await browser.close();
      return pageText.includes(podcastName.toLowerCase());
    },
    Google: async () => {
      const browser = await puppeteer.launch({
        headless: 'new',
        executablePath: '/usr/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      const url = `https://podcasts.google.com/search/${encodeURIComponent(podcastName)}`;
      await page.goto(url, { waitUntil: 'networkidle2' });
      const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
      await browser.close();
      return pageText.includes(podcastName.toLowerCase());
    },
    Audible: async () => {
      const browser = await puppeteer.launch({
        headless: 'new',
        executablePath: '/usr/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      const url = `https://www.audible.com/search?keywords=${encodeURIComponent(podcastName)}&searchType=podcast`;
      await page.goto(url, { waitUntil: 'networkidle2' });
      const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
      await browser.close();
      return pageText.includes(podcastName.toLowerCase());
    }
  };

  // Run all searches
  for (const [platform, searchFunction] of Object.entries(platforms)) {
    try {
      results[platform] = await searchFunction();
    } catch (err) {
      console.error(`❌ Error searching ${platform}:`, err.message);
      results[platform] = false;
    }
  }

  res.json(results);
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
