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

    const platforms = {
        Apple: `https://itunes.apple.com/search?term=${encodeURIComponent(podcastName)}&entity=podcast`,
        Spotify: `https://api.spotify.com/v1/search?q=${encodeURIComponent(podcastName)}&type=show`,
        Stitcher: `https://www.stitcher.com/search?query=${encodeURIComponent(podcastName)}`,
        Podbean: `https://api.podbean.com/v1/podcasts?search=${encodeURIComponent(podcastName)}`,
        Google: `https://podcasts.google.com/search/${encodeURIComponent(podcastName)}`,
    };

    const results = {};

    await Promise.all(
        Object.entries(platforms).map(async ([platform, url]) => {
            try {
                const response = await fetch(url);
                results[platform] = response.ok;
            } catch {
                results[platform] = false;
            }
        })
    );

    res.json(results);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
