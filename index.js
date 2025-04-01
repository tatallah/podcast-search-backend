const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 3000;
app.post('/search', async (req, res) => {
  const { podcastName } = req.body;

  if (!podcastName) {
    return res.status(400).json({ error: 'Podcast name is required' });
  }

  const results = {};

  // Define the search strategies
  const platforms = {
    Apple: async () => {
	const url = `https://itunes.apple.com/search?term=${encodeURIComponent(podcastName)}&entity=podcast&limit=10`;
	const response = await fetch(url);
	const data = await response.json();

	// Normalize both for comparison
  	const target = podcastName.trim().toLowerCase();

  	return data.results.some(podcast =>
		podcast.collectionName.trim().toLowerCase() === target
  	);
    },
    Spotify: async () => {
      const url = `https://open.spotify.com/search/${encodeURIComponent(podcastName)}`;
      const response = await fetch(url);
      const text = await response.text();
      return text.toLowerCase().includes(podcastName.toLowerCase());
    },
    Stitcher: async () => {
      const url = `https://www.stitcher.com/search?query=${encodeURIComponent(podcastName)}`;
      const response = await fetch(url);
      const text = await response.text();
      return text.toLowerCase().includes(podcastName.toLowerCase());
    },
    Podbean: async () => {
      const url = `https://www.podbean.com/search?q=${encodeURIComponent(podcastName)}`;
      const response = await fetch(url);
      const text = await response.text();
      return text.toLowerCase().includes(podcastName.toLowerCase());
    },
    Google: async () => {
      const url = `https://podcasts.google.com/search/${encodeURIComponent(podcastName)}`;
      const response = await fetch(url);
      const text = await response.text();
      return text.toLowerCase().includes(podcastName.toLowerCase());
    }
  };

  // Execute each search independently
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
    console.log(`Server is running on port ${PORT}`);
});
