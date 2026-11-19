// Tiny static web server for the front end. No packages needed: just run
//   node server.js
// Then open the link it prints. The back end must be running separately.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.FRONTEND_PORT || process.env.PORT || 5173; // hosts such as Railway provide PORT
const ROOT = path.join(__dirname, 'public');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const file = path.normalize(path.join(ROOT, urlPath));

  // block path traversal (../)
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }

  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error(`Port ${PORT} is already in use. The front end may already be running, or set FRONTEND_PORT=5174 and retry.`);
  else console.error(e);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log('');
  console.log('  Batloung Farm FRONT END is running');
  console.log(`  Open this link:  http://localhost:${PORT}`);
  console.log(`  Vendor map:      http://localhost:${PORT}/#vendors`);
  console.log('');
  console.log('  Make sure the back end is running in another terminal (npm run dev).');
});
