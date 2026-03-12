// Development server with HTTP + WebSocket proxy to central-server
const { createServer, request: httpRequest } = require('http');
const { request: httpsRequest } = require('https');
const { createConnection } = require('net');
const { existsSync, createReadStream } = require('fs');
const path = require('path');
const { parse } = require('url');
const next = require('next');

const hostname = 'localhost';
const port = 3000;

function getRequester(protocol) {
  return protocol === 'https:' ? httpsRequest : httpRequest;
}

function probeCentralServer(rawUrl) {
  return new Promise((resolve) => {
    const target = new URL(rawUrl);
    const requestImpl = getRequester(target.protocol);
    const req = requestImpl(
      {
        hostname: target.hostname,
        port: target.port,
        path: '/api/health',
        method: 'GET',
        timeout: 1000,
      },
      (res) => {
        res.resume();
        resolve((res.statusCode || 500) < 500);
      }
    );

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function resolveCentralServerUrl() {
  const candidates = [
    process.env.CENTRAL_SERVER_URL,
    process.env.NEXT_PUBLIC_CENTRAL_SERVER_URL,
    'http://localhost:3001',
    'http://localhost:3101',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (await probeCentralServer(candidate)) {
      return candidate;
    }
  }

  return 'http://localhost:3001';
}

const app = next({ dev: true, hostname, port });
const handle = app.getRequestHandler();

function serveStatic(req, res, filePath) {
  if (!existsSync(filePath)) return false;

  const ext = path.extname(filePath);
  const contentType = ext === '.css'
    ? 'text/css; charset=UTF-8'
    : ext === '.js'
      ? 'application/javascript; charset=UTF-8'
      : 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store, must-revalidate',
  });
  createReadStream(filePath).pipe(res);
  return true;
}

app.prepare().then(async () => {
  const centralServerUrl = await resolveCentralServerUrl();
  const centralTarget = new URL(centralServerUrl);
  const upgradeHandler = app.getUpgradeHandler();
  const server = createServer(async (req, res) => {
    const url = req.url || '';

    if (url.startsWith('/_next/static/')) {
      const relativePath = decodeURIComponent(url.replace('/_next/static/', '').split('?')[0]);
      const filePath = path.join(__dirname, '.next', 'static', relativePath);
      if (serveStatic(req, res, filePath)) return;
    }

    // Proxy /api/* to central server
    if (url.startsWith('/api/')) {
      const proxyReq = httpRequest(
        {
          hostname: centralTarget.hostname,
          port: parseInt(centralTarget.port, 10),
          path: url,
          method: req.method,
          headers: { ...req.headers, host: centralTarget.host },
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
          proxyRes.pipe(res);
        }
      );

      proxyReq.on('error', (err) => {
        console.error(`API proxy error to ${centralServerUrl}:`, err.code || err.message || err);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Central server unavailable' }));
      });

      req.pipe(proxyReq);
      return;
    }

    // Everything else -> Next.js
    const parsedUrl = parse(req.url, true);
    await handle(req, res, parsedUrl);
  });

  // Proxy WebSocket /ws/* to central server
  server.on('upgrade', (req, socket, head) => {
    const url = req.url || '';

    if (!url.startsWith('/ws/')) {
      upgradeHandler(req, socket, head);
      return;
    }

    const proxySocket = createConnection(
      { host: centralTarget.hostname, port: parseInt(centralTarget.port, 10) },
      () => {
        const reqHeaders = { ...req.headers };
        reqHeaders.host = centralTarget.host;

        let raw = `GET ${url} HTTP/1.1\r\n`;
        for (const [key, value] of Object.entries(reqHeaders)) {
          if (Array.isArray(value)) {
            for (const v of value) raw += `${key}: ${v}\r\n`;
          } else if (value != null) {
            raw += `${key}: ${value}\r\n`;
          }
        }
        raw += '\r\n';

        proxySocket.write(raw);
        if (head && head.length > 0) proxySocket.write(head);

        proxySocket.pipe(socket);
        socket.pipe(proxySocket);
      }
    );

    proxySocket.on('error', (err) => {
      console.error(`WebSocket proxy error to ${centralServerUrl}:`, err.code || err.message || err);
      socket.end();
    });
    socket.on('error', () => proxySocket.end());
  });

  server.listen(port, hostname, () => {
    console.log(`> Dev ready on http://${hostname}:${port}`);
    console.log(`> Proxy: /api/* + /ws/* -> ${centralServerUrl}`);
  });
});
