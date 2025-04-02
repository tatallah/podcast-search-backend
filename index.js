// podcast-search/index.js
const stringSimilarity = require('string-similarity');
function isFuzzyMatch(a, b) {
  return stringSimilarity.compareTwoStrings(a.toLowerCase(), b.toLowerCase()) >= 0.5;
}
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
      return data.results.some(p => isFuzzyMatch(p.collectionName, podcastName));
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
        isFuzzyMatch(show.name, podcastName)
      );
    },

    YouTube: async () => {
      try {
        const apiKey = process.env.YOUTUBE_API_KEY;
        const query = podcastName;

        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=10&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.error) {
            console.error("🛑 YouTube API error:", data.error);
        }

        console.log("📦 YouTube API raw response:", JSON.stringify(data, null, 2));

        const items = data?.items ?? [];
        console.log(`📦 YouTube 'items' content:`, items.map(i => i.snippet?.title));
        console.log("🛰️ Fetched YouTube URL:", url);
        if (!items.length) {
          console.log("❌ YouTube API returned no usable items.");
          return false;
        }

        const matches = items.some(item => {
          const title = item.snippet?.title || '';
          const description = item.snippet?.description || '';
          const channelTitle = item.snippet?.channelTitle || '';

          return (
            isFuzzyMatch(title, podcastName) ||
            isFuzzyMatch(description, podcastName) ||
            isFuzzyMatch(channelTitle, podcastName)
          );
        });

        console.log(`✅ YouTube fuzzy match result: ${matches}`);
        return matches;
      } catch (err) {
        console.error("🔥 YouTube search error:", err.message);
        return false;
      }
    },

    Audible: async () => {
      const url = `https://www.audible.com/search?keywords=${encodeURIComponent(podcastName)}&searchType=podcast`;
      const response = await fetch(url);
      const html = await response.text(); // 👈 make sure this line is present

      // Extract all <h3> title blocks
      const titleMatch = html.match(/<h3.*?>(.*?)<\/h3>/gi) || [];

      // Remove HTML tags and trim
      const clean = (str) => str.replace(/<[^>]+>/g, '').trim();

      return titleMatch.some(title =>
        isFuzzyMatch(clean(title), podcastName)
      );
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
