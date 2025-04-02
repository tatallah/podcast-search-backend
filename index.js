const stringSimilarity = require('string-similarity');
const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

function isFuzzyMatch(a, b) {
  return stringSimilarity.compareTwoStrings(a.toLowerCase(), b.toLowerCase()) >= 0.5;
}

let spotifyToken = null;
let tokenExpiry = 0;

async function getSpotifyToken() {
  if (spotifyToken && Date.now() < tokenExpiry) return spotifyToken;

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
  if (!podcastName) return res.status(400).json({ error: 'Podcast name is required' });

  const results = {};

  const platforms = {
    Apple: async () => {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(podcastName)}&entity=podcast&limit=10`;
      const response = await fetch(url);
      const data = await response.json();

      return data.results
        .filter(p => isFuzzyMatch(p.collectionName, podcastName))
        .slice(0, 3)
        .map(p => ({
          title: p.collectionName,
          url: p.collectionViewUrl,
          description: p.description || p.collectionArtistName || "No description available."
        }));
    },

    Spotify: async () => {
      const token = await getSpotifyToken();
      const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(podcastName)}&type=show&limit=10`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      return data.shows.items
        .filter(show => isFuzzyMatch(show.name, podcastName))
        .slice(0, 3)
        .map(show => ({
          title: show.name,
          url: show.external_urls.spotify,
          description: show.description || "No description available."
        }));
    },

    YouTube: async () => {
      const apiKey = process.env.YOUTUBE_API_KEY;
      const query = podcastName;
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=10&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      const items = data?.items ?? [];

      return items
        .filter(item => {
          const title = item.snippet?.title || '';
          const description = item.snippet?.description || '';
          const channelTitle = item.snippet?.channelTitle || '';
          return (
            isFuzzyMatch(title, podcastName) ||
            isFuzzyMatch(description, podcastName) ||
            isFuzzyMatch(channelTitle, podcastName)
          );
        })
        .slice(0, 3)
        .map(item => ({
          title: item.snippet.title,
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          description: item.snippet.description || "No description available."
        }));
    },

    Audible: async () => {
      const url = `https://www.audible.com/search?keywords=${encodeURIComponent(podcastName)}&searchType=podcast`;
      const response = await fetch(url);
      const html = await response.text();

      const matches = [];
      const anchorRegex = /<a[^>]+href="(\/pd\/[^"]+)"[^>]*>(.*?)<\/a>/gi;
      let match;

      while ((match = anchorRegex.exec(html)) !== null && matches.length < 3) {
        const link = match[1];
        const title = match[2].replace(/<[^>]+>/g, '').trim();

        if (isFuzzyMatch(title, podcastName)) {
          matches.push({
            title,
            url: `https://www.audible.com${link}`,
            description: "No description available (HTML scraping)"
          });
        }
      }

      return matches;
    }
  };

  for (const [platform, searchFn] of Object.entries(platforms)) {
    try {
      results[platform] = await searchFn();
    } catch (err) {
      console.error(`❌ Error searching ${platform}:`, err.message);
      results[platform] = [];
    }
  }

  res.json(results);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
