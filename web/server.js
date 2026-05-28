// Luni Web — Placeholder server
// Will be replaced with Next.js in Phase 3

const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
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
        .container {
          text-align: center;
          padding: 2rem;
        }
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
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🤖 Luni Cloud</h1>
        <p>Web Dashboard — Coming in Phase 3</p>
        <p>API server is running at <code>/api/v1/health</code></p>
        <span class="badge">v0.1.0 — Foundation</span>
      </div>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Luni Web placeholder listening on port ${PORT}`);
});
