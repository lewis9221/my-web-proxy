const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.PORT || 3000);
const UPSTREAM = 'https://example.com/'; // Fixed demo site, NOT an open proxy.

const server = http.createServer(async (req, res) => {
  if (req.method !== 'GET') {
    res.writeHead(405, {'Content-Type': 'text/plain', 'Allow': 'GET'});
    return res.end('GET only');
  }
  if (req.url === '/') {
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control':'no-store'});
    return res.end(fs.readFileSync(path.join(__dirname, 'index.html')));
  }
  if (req.url === '/api/demo') {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      let upstream;
      try { upstream = await fetch(UPSTREAM, {redirect:'error',signal: controller.signal}); }
      finally { clearTimeout(timeout); }
      if (!upstream.ok) throw new Error(`Upstream HTTP ${upstream.status}`);
      const html = await upstream.text();
      // Return as text, rather than injecting untrusted HTML into our own page.
      res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'});
      return res.end(JSON.stringify({source: UPSTREAM, preview: html.slice(0, 1800)}));
    } catch (e) {
      res.writeHead(502, {'Content-Type':'application/json'});
      return res.end(JSON.stringify({error:'Demo upstream request failed'}));
    }
  }
  res.writeHead(404, {'Content-Type': 'text/plain'});
  res.end('Not found');
});
server.listen(PORT, '0.0.0.0', () => console.log(`Open http://localhost:${PORT}`));
