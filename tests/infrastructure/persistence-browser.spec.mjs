import { test, expect } from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

function createServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url || '/').split('?')[0];
      const relativePath = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
      const filePath = path.join(projectRoot, relativePath);
      const ext = path.extname(filePath);
      const contentType = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.mjs': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
      }[ext] || 'application/octet-stream';
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found: ' + filePath);
          return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({
        server,
        url: 'http://127.0.0.1:' + port + '/tests/infrastructure/persistence-browser.test.html',
      });
    });
  });
}

test.describe('Persistence Composition — Browser', () => {
  test('creates persistence graph with IndexedDB and exercises repositories', async ({ page }) => {
    const { server, url } = await createServer();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      const results = await page.evaluate(() => {
        return new Promise((resolve) => {
          const check = () => {
            const output = document.getElementById('output');
            if (output && (output.textContent.includes('Total:') || output.textContent.includes('FATAL:'))) {
              resolve({ output: output.textContent, results: window.__testResults });
            } else {
              setTimeout(check, 100);
            }
          };
          check();
        });
      }, { timeout: 120000 });
      const testResults = results.results;
      expect(testResults).toBeDefined();
      expect(testResults.total).toBeGreaterThan(0);
      expect(testResults.failed).toBe(0);
      expect(testResults.passed).toBe(testResults.total);
    } finally {
      server.close();
    }
  });
});