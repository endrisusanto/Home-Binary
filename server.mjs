import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 14300;
const DIST_DIR = path.join(__dirname, 'dist');
const ENGINE_SCRIPT = path.join(__dirname, 'engine', 'runner.mjs');

// Global runner process state
let activeChild = null;
const sseClients = new Set();

// MIME Types Map
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

// Broadcast SSE message to all connected web clients
function broadcastSSE(type, payload) {
  const data = JSON.stringify({ type, payload });
  const msg = `data: ${data}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(msg);
    } catch {
      sseClients.delete(client);
    }
  }
}

const PUBLIC_URL = process.env.PUBLIC_URL || 'https://homebinary.endrisusanto.my.id';

// Periodic SSE Keep-Alive Ping (10s interval for Cloudflare Tunnel / Reverse Proxy)
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(': ping\n\n');
    } catch {
      sseClients.delete(client);
    }
  }
}, 10000);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // Cloudflare / Reverse Proxy CORS & Security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // =========================================================================
  // API ENDPOINTS
  // =========================================================================

  // 1. Healthcheck
  if (pathname === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      version: '0.4.7', 
      mode: 'web', 
      publicUrl: PUBLIC_URL,
      clients: sseClients.size 
    }));
    return;
  }

  // 2. Server-Sent Events (SSE) Stream with Cloudflare Proxy No-Buffering
  if (pathname === '/api/events' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable proxy buffering (Nginx / Cloudflare)
    });
    res.write(': connected\n\n');
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // 3. Start Batch Runner
  if (pathname === '/api/batch/start' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');

        // Cancel existing process if running
        if (activeChild && !activeChild.killed) {
          try { activeChild.kill('SIGTERM'); } catch {}
        }

        // Spawn runner.mjs
        const child = spawn('node', [ENGINE_SCRIPT], {
          cwd: path.join(__dirname, 'engine'),
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        activeChild = child;

        // Feed JSON payload to stdin
        child.stdin.write(JSON.stringify(payload));
        child.stdin.end();

        // Stream stdout line by line
        let buffer = '';
        child.stdout.on('data', data => {
          buffer += data.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop(); // Keep incomplete trailing fragment

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const event = JSON.parse(trimmed);
              if (event && event.type) {
                broadcastSSE(event.type, event);
              }
            } catch {
              // Raw non-JSON output -> convert to log
              broadcastSSE('task-log', {
                level: 'info',
                message: trimmed,
                timestamp: new Date().toLocaleTimeString(),
              });
            }
          }
        });

        child.stderr.on('data', data => {
          const text = data.toString().trim();
          if (text) {
            broadcastSSE('task-log', {
              level: 'warn',
              message: text,
              timestamp: new Date().toLocaleTimeString(),
            });
          }
        });

        child.on('close', code => {
          if (activeChild === child) {
            activeChild = null;
          }
          broadcastSSE('task-log', {
            level: code === 0 ? 'success' : 'warn',
            message: `Automation engine process exited with code ${code}`,
            timestamp: new Date().toLocaleTimeString(),
          });
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'started' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 4. Cancel Batch Runner
  if (pathname === '/api/batch/cancel' && req.method === 'POST') {
    if (activeChild && !activeChild.killed) {
      try {
        activeChild.kill('SIGTERM');
        setTimeout(() => {
          try { activeChild?.kill('SIGKILL'); } catch {}
          activeChild = null;
        }, 1000);
      } catch {}
      broadcastSSE('task-log', {
        level: 'warn',
        message: 'Batch runner cancellation requested by user.',
        timestamp: new Date().toLocaleTimeString(),
      });
    }
    activeChild = null;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'cancelled' }));
    return;
  }

  // =========================================================================
  // STATIC ASSETS SERVING (dist/)
  // =========================================================================
  if (req.method === 'GET') {
    let filePath = path.join(DIST_DIR, pathname);

    // If root or directory, serve index.html
    if (pathname === '/' || !path.extname(pathname)) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        // Fallback to index.html for SPA client-side routing
        const fallbackPath = path.join(DIST_DIR, 'index.html');
        fs.readFile(fallbackPath, (fallbackErr, content) => {
          if (fallbackErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found - Frontend build not generated. Run `npm run build` first.');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(content);
          }
        });
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000',
      });

      fs.createReadStream(filePath).pipe(res);
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Build HomeBinary Web App Server`);
  console.log(` Local Port:      http://localhost:${PORT}`);
  console.log(` Cloudflare URL:  ${PUBLIC_URL}`);
  console.log(` Mode:            Docker / Cloudflare Tunnel Web App`);
  console.log(`====================================================`);
});
