import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = 'F:\\Projects\\finanse\\src';

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (!urlPath.startsWith('/')) urlPath = '/' + urlPath;
  
  let filePath = path.join(root, urlPath);
  
  // Allow directory traversal
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Serve index.html for directory requests
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found: ' + req.url);
      return;
    }
    const ext = path.extname(filePath);
    const headers = { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' };
    if (ext === '.js' || ext === '.mjs' || ext === '.html' || ext === '.css') {
      headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate';
      headers['Pragma'] = 'no-cache';
      headers['Expires'] = '0';
    }
    res.writeHead(200, headers);
    res.end(data);
  });
});

server.listen(3002, () => {
  console.log('Server running on http://localhost:3002');
});
