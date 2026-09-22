/**
 * Debug CSS visibility for mobile menu button
 */

import { test, expect } from '@playwright/test';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SERVE_PORT = 3004;

function createServer(rootDir, port) {
  const uiDir = path.join(rootDir, 'src/ui');
  const srcDir = path.join(rootDir, 'src');
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const reqPath = req.url.split('?')[0];
      if (reqPath === '/favicon.ico') {
        res.writeHead(204);
        res.end();
        return;
      }
      let filePath = path.join(rootDir, reqPath === '/' ? 'src/ui/app.html' : reqPath);
      if (!fs.existsSync(filePath)) {
        const uiPath = path.join(uiDir, reqPath);
        if (fs.existsSync(uiPath)) {
          filePath = uiPath;
        } else {
          const srcPath = path.join(srcDir, reqPath);
          if (fs.existsSync(srcPath)) {
            filePath = srcPath;
          }
        }
      }
      if (!filePath.startsWith(rootDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found: ' + filePath);
          return;
        }
        const ext = path.extname(filePath);
        const contentType = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.mjs': 'application/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
        }[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
        res.end(data);
      });
    });
    server.on('error', reject);
    server.listen(port, () => resolve(server));
  });
}

test('debug menu button visibility', async ({ page }) => {
  const server = await createServer(PROJECT_ROOT, SERVE_PORT);
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(`http://localhost:${SERVE_PORT}/`);
  await page.waitForTimeout(3000);

  const btn = page.locator('.top-bar-menu-btn');
  const display = await btn.evaluate(el => getComputedStyle(el).display);
  const visibility = await btn.evaluate(el => getComputedStyle(el).visibility);
  const opacity = await btn.evaluate(el => getComputedStyle(el).opacity);
  const rect = await btn.boundingBox();
  const html = await page.content();

  console.log('display:', display);
  console.log('visibility:', visibility);
  console.log('opacity:', opacity);
  console.log('rect:', rect);
  console.log('has class is-open on sidebar:', await page.locator('.sidebar').evaluate(el => el.classList.contains('is-open')));

  server.close();
});
