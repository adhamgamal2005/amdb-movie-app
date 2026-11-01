require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

app.use(cors());
app.use(express.json());

// Serve static front-end files (index.html, style.css, script.js)
app.use(express.static(__dirname));

// 1. Fetch Genres
app.get('/api/genres', async (req, res) => {
    try {
        const response = await fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}`);
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch genres' });
    }
});

// 2. Fetch Popular Movies
app.get('/api/popular', async (req, res) => {
    try {
        const response = await fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}&page=1`);
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch popular movies' });
    }
});

// 3. Search Movies
app.get('/api/search', async (req, res) => {
    const query = req.query.query;
    if (!query) return res.status(400).json({ error: 'Query parameter required' });

    try {
        const response = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to search movies' });
    }
});

// 4. Recommendation Engine (Server-side scoring)
app.get('/api/recommendations', async (req, res) => {
    const { genres, minRating = 6.0 } = req.query;
    if (!genres) return res.status(400).json({ error: 'Genres required' });

    const selectedGenreIds = genres.split(',').map(Number);
    const GENRE_WEIGHT = 40;
    const RATING_WEIGHT = 5;
    const POPULARITY_WEIGHT = 0.2;
    const POPULARITY_CAP = 100;

    try {
        const genreParam = selectedGenreIds.join('|');
        const [p1, p2] = await Promise.all([
            fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreParam}&vote_count.gte=200&sort_by=popularity.desc&page=1`),
            fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreParam}&vote_count.gte=200&sort_by=popularity.desc&page=2`)
        ]);

        const data1 = await p1.json();
        const data2 = await p2.json();
        const candidates = [...(data1.results || []), ...(data2.results || [])];

        const scored = candidates
            .filter(movie => movie.vote_average >= parseFloat(minRating))
            .map(movie => {
                const genreMatches = movie.genre_ids.filter(id => selectedGenreIds.includes(id)).length;
                const normalizedPopularity = Math.min(movie.popularity, POPULARITY_CAP);
                const score = (genreMatches * GENRE_WEIGHT) + (movie.vote_average * RATING_WEIGHT) + (normalizedPopularity * POPULARITY_WEIGHT);
                return { ...movie, score };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 12);

        res.json({ results: scored });
    } catch (err) {
        res.status(500).json({ error: 'Failed to compute recommendations' });
    }
});

// 5. Movie Details & Reviews
app.get('/api/movie/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [movieRes, reviewRes] = await Promise.all([
            fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}`),
            fetch(`${BASE_URL}/movie/${id}/reviews?api_key=${API_KEY}`)
        ]);
        const movie = await movieRes.json();
        const reviews = await reviewRes.json();
        res.json({ movie, reviews });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch movie details' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});