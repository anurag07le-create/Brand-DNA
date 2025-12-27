const express = require('express');
const path = require('path');
const { scrapeWebsite } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

const crypto = require('crypto');

// In-memory cache for results
const resultsCache = new Map();

app.get('/analyze-stream', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('URL is required');
    }

    // Setup SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
        const data = await scrapeWebsite(targetUrl, (task, progress) => {
            sendEvent({ type: 'progress', task, progress });
        });

        const id = crypto.randomUUID();
        resultsCache.set(id, data);

        // Cleanup old cache entries (simple cleanup)
        if (resultsCache.size > 100) {
            const firstKey = resultsCache.keys().next().value;
            resultsCache.delete(firstKey);
        }

        sendEvent({ type: 'complete', redirectUrl: `/result/${id}` });
        res.end();
    } catch (error) {
        console.error(error);
        sendEvent({ type: 'error', message: 'Analysis failed. Please try again.' });
        res.end();
    }
});

app.get('/result/:id', (req, res) => {
    const id = req.params.id;
    const data = resultsCache.get(id);

    if (!data) {
        return res.redirect('/');
    }

    res.render('dashboard', { data });
});

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple API Key Database (In-memory/Env for now)
const VALID_API_KEYS = new Set([
    process.env.API_KEY || "dna-sample-key-123",
    "master-key"
]);

// API Route
app.post('/api', async (req, res) => {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;

    // Auth Check
    if (!apiKey || !VALID_API_KEYS.has(apiKey)) {
        return res.status(401).json({
            success: false,
            error: "Unauthorized. Invalid or missing API Key."
        });
    }

    const targetUrl = req.body.url;
    if (!targetUrl) {
        return res.status(400).json({
            success: false,
            error: "Missing 'url' in request body."
        });
    }

    try {
        // Scrape without progress callback (standard wait)
        const data = await scrapeWebsite(targetUrl);

        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error("[API Error]", error);
        res.status(500).json({
            success: false,
            error: "Analysis failed.",
            details: error.message
        });
    }
});

// Backward compatibility (if needed) but we are moving to stream
app.post('/analyze', (req, res) => {
    // Redirect to index but with the URL to trigger the stream via JS?
    // Or just render a page that immediately starts the stream.
    // Let's assume client-side JS handles the switch.
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
