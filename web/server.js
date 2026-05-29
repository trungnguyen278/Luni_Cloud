const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html',
  '.jsx':  'text/javascript',
  '.js':   'text/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
};

const PREVIEW_DIR = '/app/ui_preview';

const homepage = `<!DOCTYPE html>
<html>
<head>
  <title>Luni Cloud</title>
  <style>
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: #0a0e1a;
      color: #e8ecf4;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .container { text-align: center; padding: 2rem; }
    h1 { color: #5be9ff; font-size: 2.5rem; margin-bottom: 0.5rem; }
    p { color: #8892a8; font-size: 1.1rem; }
    .badge {
      display: inline-block;
      background: rgba(91, 233, 255, 0.15);
      color: #5be9ff;
      padding: 0.3rem 0.8rem;
      border-radius: 4px;
      font-size: 0.85rem;
      margin-top: 1rem;
    }
    a { color: #5be9ff; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Luni Cloud</h1>
    <p>Web Dashboard — Coming in Phase 3</p>
    <p>API server is running at <code>/api/v1/health</code></p>
    <p><a href="/preview">UI Preview (Emotion Sheet)</a></p>
    <span class="badge">v0.1.0 — Foundation</span>
  </div>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(homepage);
    return;
  }

  if (req.url.startsWith('/preview')) {
    const subPath = req.url.replace('/preview', '') || '/Luni Emotion Sheet.html';
    const filePath = path.join(PREVIEW_DIR, decodeURIComponent(subPath));
    const resolved = path.resolve(filePath);

    if (!resolved.startsWith(PREVIEW_DIR)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(resolved, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(resolved).toLowerCase();
      res.writeHead(200, { 'Content-Type': (MIME[ext] || 'application/octet-stream') + '; charset=utf-8' });
      res.end(data);
    });
    return;
  }

  // Fallback: serve files from ui_preview (JSX loaded by relative path in HTML)
  const fallbackPath = path.join(PREVIEW_DIR, decodeURIComponent(req.url));
  const fallbackResolved = path.resolve(fallbackPath);
  if (fallbackResolved.startsWith(PREVIEW_DIR)) {
    fs.readFile(fallbackResolved, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(fallbackResolved).toLowerCase();
      res.writeHead(200, { 'Content-Type': (MIME[ext] || 'application/octet-stream') + '; charset=utf-8' });
      res.end(data);
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Luni Web listening on port ${PORT}`);
});
