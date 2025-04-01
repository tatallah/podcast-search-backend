const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 3000;
app.post('/search', async (req, res) => {
  const { podcastName } = req.body;

  if (!podcastName) {
    return res.status(400).json({ error: 'Podcast name is required' });
  }

  const results = {
    Apple: false,
    Spotify: false,
    Stitcher: false,
    Podbean: false,
    Google: false,
  };

  try {
    // 🍎 Apple Podcasts
    const appleResponse = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(podcastName)}&entity=podcast`);
    const appleData = await appleResponse.json();
    results.Apple = appleData.results.some(p => p.collectionName.toLowerCase().includes(podcastName.toLowerCase()));

    // 🎧 Spotify (no public search API — fallback to link presence)
    const spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(podcastName)}`;
    const spotifyResponse = await fetch(spotifySearchUrl);
    const spotifyText = await spotifyResponse.text();
    results.Spotify = spotifyText.toLowerCase().includes(podcastName.toLowerCase());

    // 📻 Stitcher (basic text match)
    const stitcherSearchUrl = `https://www.stitcher.com/search?query=${encodeURIComponent(podcastName)}`;
    const stitcherResponse = await fetch(stitcherSearchUrl);
    const stitcherText = await stitcherResponse.text();
    results.Stitcher = stitcherText.toLowerCase().includes(podcastName.toLowerCase());

    // 🎙️ Podbean (text search)
    const podbeanSearchUrl = `https://www.podbean.com/search?q=${encodeURIComponent(podcastName)}`;
    const podbeanResponse = await fetch(podbeanSearchUrl);
    const podbeanText = await podbeanResponse.text();
    results.Podbean = podbeanText.toLowerCase().includes(podcastName.toLowerCase());

    // 🟢 Google Podcasts (basic search page scrape)
    const googleSearchUrl = `https://podcasts.google.com/search/${encodeURIComponent(podcastName)}`;
    const googleResponse = await fetch(googleSearchUrl);
    const googleText = await googleResponse.text();
    results.Google = googleText.toLowerCase().includes(podcastName.toLowerCase());

    res.json(results);
  } catch (err) {
    console.error('Search failed:', err);
    res.status(500).json({ error: 'Search failed', details: err.message });
  }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
