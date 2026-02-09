require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dns = require('dns');
const { URL } = require('url');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.urlencoded({ extended: false })); // ✅ body parser for POST form data
app.use(express.json());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});

// ---- In-memory "database" ----
let counter = 1;
const urlsById = new Map();     // id -> original_url
const idByUrl = new Map();      // original_url -> id (optional dedupe)

// ✅ POST /api/shorturl
app.post('/api/shorturl', function (req, res) {
  const input = (req.body.url || '').trim();

  // Validate URL format: must be http or https, and parseable
  let parsed;
  try {
    parsed = new URL(input);
  } catch (e) {
    return res.json({ error: 'invalid url' });
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return res.json({ error: 'invalid url' });
  }

  // Verify hostname exists using dns.lookup
  dns.lookup(parsed.hostname, (err) => {
    if (err) return res.json({ error: 'invalid url' });

    // Optional: return same short id if URL already stored
    if (idByUrl.has(input)) {
      return res.json({ original_url: input, short_url: idByUrl.get(input) });
    }

    const id = counter++;
    urlsById.set(id, input);
    idByUrl.set(input, id);

    return res.json({ original_url: input, short_url: id });
  });
});

// ✅ GET /api/shorturl/:short_url -> redirect
app.get('/api/shorturl/:short_url', function (req, res) {
  const id = parseInt(req.params.short_url, 10);
  if (!Number.isFinite(id)) return res.json({ error: 'invalid url' });

  const original = urlsById.get(id);
  if (!original) return res.json({ error: 'invalid url' });

  return res.redirect(original);
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
