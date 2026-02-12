// Development server with HTTP + WebSocket proxy to central-server
const { createServer, request: httpRequest } = require('http');
const { createConnection } = require('net');
const { parse } = require('url');
const next = require('next');

const hostname = 'localhost';
const port = 3000;
const centralServerUrl = process.env.CENTRAL_SERVER_URL || 'http://localhost:3001';
const centralTarget = new URL(centralServerUrl);

const app = next({ dev: true, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    const url = req.url || '';

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
        console.error('API proxy error:', err.message);
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

    if (!url.startsWith('/ws/')) return;

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

    proxySocket.on('error', () => socket.end());
    socket.on('error', () => proxySocket.end());
  });

  server.listen(port, hostname, () => {
    console.log(`> Dev ready on http://${hostname}:${port}`);
    console.log(`> Proxy: /api/* + /ws/* -> ${centralServerUrl}`);
  });
});
