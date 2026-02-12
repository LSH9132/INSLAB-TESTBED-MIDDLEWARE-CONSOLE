// Custom Next.js standalone server with HTTP + WebSocket proxy
const path = require('path');
const http = require('http');
const net = require('net');
const fs = require('fs');
const next = require('next');
// Fallback to NextServer if possible, but let's use next() wrapper with manual serving first?
// No, next() crashed. Use NextServer.
const NextServer = require('next/dist/server/next-server').default;

process.env.NODE_ENV = 'production';
process.chdir(__dirname);

const dir = path.join(__dirname);
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT, 10) || 3000;
const centralServerUrl = process.env.CENTRAL_SERVER_URL || 'http://central-server:3001';
const centralTarget = new URL(centralServerUrl);

// Load config manually as NextServer needs it
const conf = require(path.join(dir, '.next', 'required-server-files.json')).config;
console.log('NextServer dir:', dir);

const nextServer = new NextServer({
  hostname,
  port,
  dir,
  dev: false,
  customServer: false,
  conf,
});

const nextHandler = nextServer.getRequestHandler();

const getContentType = (ext) => {
  const map = {
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  };
  return map[ext] || 'text/plain';
};

const serveStatic = (req, res, filePath) => {
  const ext = path.extname(filePath);
  const contentType = getContentType(ext);

  if (!fs.existsSync(filePath)) {
    // Pass to next handler if file not found locally (maybe dynamic route?)
    return false;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 500;
      res.end('Internal Server Error');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
  return true;
};

const server = http.createServer(async (req, res) => {
  const url = req.url || '';

  // Serve static files manually
  if (url.startsWith('/_next/static/')) {
    const relativePath = url.replace('/_next/static/', '');
    const filePath = path.join(dir, '.next/static', relativePath);
    if (serveStatic(req, res, filePath)) return;
  }

  // Serve public files
  if (url === '/favicon.ico' || url.startsWith('/images/')) {
    const filePath = path.join(dir, 'public', url);
    if (serveStatic(req, res, filePath)) return;
  }

  // Proxy /api/* to central server
  if (url.startsWith('/api/')) {
    const proxyReq = http.request(
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
  try {
    await nextHandler(req, res);
  } catch (err) {
    console.error('Request error:', err);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

// Proxy WebSocket /ws/* to central server
server.on('upgrade', (req, socket, head) => {
  const url = req.url || '';

  if (!url.startsWith('/ws/')) {
    socket.end();
    return;
  }

  const proxySocket = net.createConnection(
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
    console.error('WebSocket proxy error:', err.message);
    socket.end();
  });

  socket.on('error', (err) => {
    console.error('Client socket error:', err.message);
    proxySocket.end();
  });
});

server.listen(port, hostname, () => {
  console.log(`> Ready on http://${hostname}:${port}`);
  console.log(`> Proxy: /api/* + /ws/* -> ${centralServerUrl}`);
});
