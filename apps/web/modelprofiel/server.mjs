import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleModelprofiel } from '../src/lib/modelprofiel.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(root, '../public/modelprofiel/index.html');
const port = Number(process.env.PORT || 8791);

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
  if (url.pathname === '/' || url.pathname === '/modelprofiel' || url.pathname === '/modelprofiel/' || url.pathname === '/modelprofiel/index.html') {
    const html = await readFile(htmlPath, 'utf8');
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(html);
    return;
  }
  if (url.pathname === '/api/modelprofiel') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
    });
    const response = await handleModelprofiel(request);
    const headers = Object.fromEntries(response.headers);
    res.writeHead(response.status, headers);
    res.end(Buffer.from(await response.arrayBuffer()));
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('Niet gevonden');
});

server.listen(port, '127.0.0.1', () => {
  console.log(`modelprofiel http://127.0.0.1:${port}/`);
});
