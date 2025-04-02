// podcast-search/index.js

const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

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

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

app.post('/search', async (req, res) => {
  const { podcastName } = req.body;

  if (!podcastName) {
    return res.status(400).json({ error: 'Podcast name is required' });
  }

  const results = {};

  const platforms = {
    Apple: async () => {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(podcastName)}&entity=podcast&limit=10`;
      const response = await fetch(url);
      const data = await response.json();
      const target = podcastName.trim().toLowerCase();
      return data.results.some(p => p.collectionName.trim().toLowerCase() === target);
    },
    Spotify: async () => {
      const token = await getSpotifyToken();
      const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(podcastName)}&type=show&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      return data.shows.items.some(show => show.name.toLowerCase() === podcastName.toLowerCase());
    },
    Google: async () => {
      const apiKey = process.env.GOOGLE_API_KEY;
      const cx = process.env.GOOGLE_CSE_ID;
      const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(podcastName)}&cx=${cx}&key=${apiKey}`;

      try {
        const response = await fetch(url);
        const data = await response.json();
        return data.items?.some(item => item.link.includes('podcasts.google.com')) || false;
      } catch (err) {
        console.error('Google CSE error:', err.message);
        return false;
      }
    },
    Audible: async () => {
      try {
        const url = `https://www.audible.com/search?keywords=${encodeURIComponent(podcastName)}&searchType=podcast`;
        const response = await fetch(url);
        const text = await response.text();
        return text.toLowerCase().includes(podcastName.toLowerCase());
      } catch (err) {
        console.error('Audible search error:', err.message);
        return false;
      }
    }
  };

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

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
