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

const STATE_FILE = path.join(__dirname, 'engine', 'auth', 'app_state.json');

// Centralized Application State
let appState = {
  items: [],
  logs: [],
  portalConfig: {
    baseUrl: 'https://android.qb.sec.samsung.net/overview/28905',
    formUrl: 'https://android.qb.sec.samsung.net/wicket/page?6',
    headless: true,
    delayMs: 1000,
    timeoutMs: 30000,
    mock: false,
    trackProgress: true,
    concurrency: 3,
  },
  isRunning: false,
  lastUpdated: new Date().toISOString(),
};

// Load persistent state on boot
try {
  if (fs.existsSync(STATE_FILE)) {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    appState = { ...appState, ...parsed, isRunning: false };
    console.log(`[State] Restored ${appState.items.length} items from ${STATE_FILE}`);
  }
} catch (err) {
  console.warn('[State] Could not load saved state:', err.message);
}

function saveAppState() {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(appState, null, 2), 'utf8');
  } catch (err) {
    console.warn('[State] Failed to persist state:', err.message);
  }
}

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
      version: '0.4.9', 
      mode: 'web', 
      publicUrl: PUBLIC_URL,
      clients: sseClients.size,
      itemsCount: appState.items.length,
      isRunning: !!activeChild,
    }));
    return;
  }

  // 2. Centralized State API (GET current state)
  if (pathname === '/api/state' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      items: appState.items,
      logs: appState.logs.slice(-200),
      portalConfig: appState.portalConfig,
      isRunning: !!activeChild,
      lastUpdated: appState.lastUpdated,
    }));
    return;
  }

  // 2b. Centralized State API (POST push state updates & sync to all clients)
  if (pathname === '/api/state' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const incoming = JSON.parse(body || '{}');
        if (incoming.items && Array.isArray(incoming.items)) {
          appState.items = incoming.items;
        }
        if (incoming.portalConfig) {
          appState.portalConfig = { ...appState.portalConfig, ...incoming.portalConfig };
        }
        if (incoming.logs && Array.isArray(incoming.logs)) {
          appState.logs = [...appState.logs.slice(-300), ...incoming.logs].slice(-500);
        }
        appState.lastUpdated = new Date().toISOString();
        saveAppState();

        // Broadcast updated state to all connected desktop and web clients
        broadcastSSE('state-sync', {
          items: appState.items,
          portalConfig: appState.portalConfig,
          isRunning: !!activeChild,
          lastUpdated: appState.lastUpdated,
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'synchronized', count: appState.items.length }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 3. Server-Sent Events (SSE) Stream with Cloudflare Proxy No-Buffering
  if (pathname === '/api/events' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable proxy buffering (Nginx / Cloudflare)
    });
    res.write(': connected\n\n');
    sseClients.add(res);

    // Immediately send current synced state to new client
    const initialSync = JSON.stringify({
      type: 'state-sync',
      payload: {
        items: appState.items,
        portalConfig: appState.portalConfig,
        isRunning: !!activeChild,
        lastUpdated: appState.lastUpdated,
      }
    });
    res.write(`data: ${initialSync}\n\n`);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // 4. Start Batch Runner
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

        // Update items in state if provided
        if (payload.items && Array.isArray(payload.items)) {
          const map = new Map(payload.items.map(x => [x.id, x]));
          appState.items = appState.items.map(it => map.get(it.id) || it);
          // If items were new, append
          for (const it of payload.items) {
            if (!appState.items.some(x => x.id === it.id)) {
              appState.items.push(it);
            }
          }
        }
        appState.isRunning = true;
        saveAppState();

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
                // Update persistent item status
                if (event.type === 'item-status-update' && event.payload) {
                  const p = event.payload;
                  appState.items = appState.items.map(item => {
                    const isMatch =
                      (p.id && item.id === p.id) ||
                      (p.pdaVersion && item.pdaVersion === p.pdaVersion) ||
                      (p.pda_version && item.pdaVersion === p.pda_version) ||
                      (p.index !== undefined && p.index !== null && item.index === p.index);
                    if (!isMatch) return item;
                    return {
                      ...item,
                      status: p.status || item.status,
                      message: p.message || item.message,
                      error: p.error || item.error,
                      buildId: p.buildId || p.build_id || item.buildId,
                      progressPercent: p.progressPercent ?? item.progressPercent,
                    };
                  });
                  saveAppState();
                } else if (event.type === 'task-log' && event.payload) {
                  const logEntry = {
                    id: Math.random().toString(36).substring(2, 9),
                    timestamp: event.payload.timestamp || new Date().toLocaleTimeString(),
                    level: event.payload.level || 'info',
                    message: event.payload.message || '',
                    index: event.payload.index,
                  };
                  appState.logs.push(logEntry);
                  if (appState.logs.length > 500) appState.logs.shift();
                }

                broadcastSSE(event.type, event);
              }
            } catch {
              // Raw non-JSON output -> convert to log
              const logEntry = {
                id: Math.random().toString(36).substring(2, 9),
                timestamp: new Date().toLocaleTimeString(),
                level: 'info',
                message: trimmed,
              };
              appState.logs.push(logEntry);
              broadcastSSE('task-log', logEntry);
            }
          }
        });

        child.stderr.on('data', data => {
          const text = data.toString().trim();
          if (text) {
            const logEntry = {
              id: Math.random().toString(36).substring(2, 9),
              timestamp: new Date().toLocaleTimeString(),
              level: 'warn',
              message: text,
            };
            appState.logs.push(logEntry);
            broadcastSSE('task-log', logEntry);
          }
        });

        child.on('close', code => {
          if (activeChild === child) {
            activeChild = null;
          }
          appState.isRunning = false;
          saveAppState();
          broadcastSSE('task-finished', {
            code,
            success_count: appState.items.filter(x => x.status === 'success').length,
            failed_count: appState.items.filter(x => x.status === 'failed').length,
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

  // 5. Remote System Update & Container Auto-Restart
  if (pathname === '/api/system/update' && req.method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'updating', message: 'Remote update initiated.' }));

    (async () => {
      try {
        broadcastSSE('task-log', {
          level: 'info',
          message: '📥 [Remote Update] Pulling latest updates from GitHub repository...',
          timestamp: new Date().toLocaleTimeString(),
        });

        const runCmd = (cmd, args, cwd = __dirname) =>
          new Promise((resolve, reject) => {
            const proc = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
            let output = '';
            proc.stdout.on('data', d => { output += d.toString(); });
            proc.stderr.on('data', d => { output += d.toString(); });
            proc.on('close', code => {
              if (code === 0) resolve(output);
              else reject(new Error(`${cmd} exited with code ${code}: ${output}`));
            });
          });

        // Try git pull if git repo exists
        try {
          const gitOut = await runCmd('git', ['pull', 'origin', 'main']);
          broadcastSSE('task-log', {
            level: 'info',
            message: `📦 [Git Pull] ${gitOut.trim().split('\n')[0] || 'Code up to date'}`,
            timestamp: new Date().toLocaleTimeString(),
          });
        } catch (gitErr) {
          console.warn('Git pull notice (container mode):', gitErr.message);
        }

        broadcastSSE('task-log', {
          level: 'info',
          message: '🔨 [Remote Update] Rebuilding frontend assets with Vite...',
          timestamp: new Date().toLocaleTimeString(),
        });

        try {
          await runCmd('npm', ['run', 'build']);
          broadcastSSE('task-log', {
            level: 'success',
            message: '✅ [Remote Update] Frontend rebuilt successfully!',
            timestamp: new Date().toLocaleTimeString(),
          });
        } catch (buildErr) {
          broadcastSSE('task-log', {
            level: 'warn',
            message: `Build notice: ${buildErr.message}`,
            timestamp: new Date().toLocaleTimeString(),
          });
        }

        broadcastSSE('task-log', {
          level: 'success',
          message: '🚀 [Remote Update] Restarting server container with new version...',
          timestamp: new Date().toLocaleTimeString(),
        });

        setTimeout(() => {
          process.exit(0); // Graceful exit -> Docker restart policy triggers instant restart
        }, 1500);

      } catch (err) {
        broadcastSSE('task-log', {
          level: 'error',
          message: `❌ [Remote Update Error] ${err.message}`,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    })();
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
