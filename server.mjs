import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 14300;
const DIST_DIR = path.join(__dirname, 'dist');
const ENGINE_SCRIPT = path.join(__dirname, 'engine', 'runner.mjs');

// Global runner process state
let activeChild = null;
const sseClients = new Set();
const wsClients = new Map(); // WebSocket -> { clientType: 'desktop' | 'web', version: string, id: string }

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

function hasConnectedDesktop() {
  for (const [ws, meta] of wsClients.entries()) {
    if (meta.clientType === 'desktop' && ws.readyState === WebSocket.OPEN) {
      return true;
    }
  }
  return false;
}

// Broadcast WebSocket message to all (or excluding sender)
function broadcastWS(msgObj, excludeWs = null) {
  const json = JSON.stringify(msgObj);
  for (const [ws] of wsClients.entries()) {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(json);
      } catch {
        wsClients.delete(ws);
      }
    }
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

// Unified Broadcast across WebSocket & SSE
function broadcastAll(type, payload, excludeWs = null) {
  broadcastWS({ type, payload }, excludeWs);
  broadcastSSE(type, payload);
}

const PUBLIC_URL = process.env.PUBLIC_URL || 'https://homebinary.endrisusanto.my.id';

// Periodic SSE & WebSocket Ping
setInterval(() => {
  for (const client of sseClients) {
    try { client.write(': ping\n\n'); } catch { sseClients.delete(client); }
  }
  for (const [ws] of wsClients.entries()) {
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.ping(); } catch { wsClients.delete(ws); }
    }
  }
}, 10000);

// Helper to spawn server-side runner
function startServerRunner(payload) {
  if (activeChild && !activeChild.killed) {
    try { activeChild.kill('SIGTERM'); } catch {}
  }

  if (payload.items && Array.isArray(payload.items)) {
    const map = new Map(payload.items.map(x => [x.id, x]));
    appState.items = appState.items.map(it => map.get(it.id) || it);
    for (const it of payload.items) {
      if (!appState.items.some(x => x.id === it.id)) {
        appState.items.push(it);
      }
    }
  }
  appState.isRunning = true;
  saveAppState();

  broadcastAll('batch-started', { isRunning: true });

  const child = spawn('node', [ENGINE_SCRIPT], {
    cwd: path.join(__dirname, 'engine'),
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  activeChild = child;

  child.stdin.write(JSON.stringify(payload));
  child.stdin.end();

  let buffer = '';
  child.stdout.on('data', data => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        if (parsed.type === 'item-status-update') {
          const update = parsed.payload;
          appState.items = appState.items.map(it => {
            if ((update.id && it.id === update.id) || (update.pdaVersion && it.pdaVersion === update.pdaVersion) || (update.index !== undefined && it.index === update.index)) {
              return {
                ...it,
                status: update.status || it.status,
                buildId: update.buildId || update.build_id || it.buildId,
                message: update.message || it.message,
                error: update.error || it.error,
                progressPercent: update.progressPercent ?? (update.status === 'success' ? 100 : it.progressPercent),
              };
            }
            return it;
          });
          saveAppState();
          broadcastAll('item-status-update', update);
        } else if (parsed.type === 'task-log') {
          const logEntry = {
            id: Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toLocaleTimeString(),
            level: parsed.payload?.level || 'info',
            message: parsed.payload?.message || '',
            index: parsed.payload?.index,
          };
          appState.logs.push(logEntry);
          broadcastAll('task-log', logEntry);
        } else if (parsed.type === 'task-finished' || parsed.type === 'batch-finished') {
          appState.isRunning = false;
          saveAppState();
          broadcastAll('task-finished', parsed.payload);
        }
      } catch {
        const logEntry = {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toLocaleTimeString(),
          level: 'info',
          message: line,
        };
        appState.logs.push(logEntry);
        broadcastAll('task-log', logEntry);
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
      broadcastAll('task-log', logEntry);
    }
  });

  child.on('close', code => {
    if (activeChild === child) activeChild = null;
    appState.isRunning = false;
    saveAppState();
    broadcastAll('task-finished', {
      code,
      success_count: appState.items.filter(x => x.status === 'success').length,
      failed_count: appState.items.filter(x => x.status === 'failed').length,
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // CORS & Security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. Healthcheck
  if (pathname === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      version: '0.5.4', 
      mode: 'web-socket-synced', 
      publicUrl: PUBLIC_URL,
      wsClients: wsClients.size,
      desktopConnected: hasConnectedDesktop(),
      itemsCount: appState.items.length,
      isRunning: appState.isRunning || !!activeChild,
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
      isRunning: appState.isRunning || !!activeChild,
      desktopConnected: hasConnectedDesktop(),
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

        broadcastAll('state-sync', {
          items: appState.items,
          portalConfig: appState.portalConfig,
          isRunning: appState.isRunning || !!activeChild,
          desktopConnected: hasConnectedDesktop(),
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

  // 3. Server-Sent Events (SSE) Stream
  if (pathname === '/api/events' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(': connected\n\n');
    sseClients.add(res);

    const initialSync = JSON.stringify({
      type: 'state-sync',
      payload: {
        items: appState.items,
        portalConfig: appState.portalConfig,
        isRunning: appState.isRunning || !!activeChild,
        desktopConnected: hasConnectedDesktop(),
        lastUpdated: appState.lastUpdated,
      }
    });
    res.write(`data: ${initialSync}\n\n`);

    req.on('close', () => { sseClients.delete(res); });
    return;
  }

  // 4. Start Batch Runner HTTP Endpoint
  if (pathname === '/api/batch/start' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        
        // If desktop is connected, route execution to Windows Desktop!
        const desktopEntries = Array.from(wsClients.entries()).filter(([w, m]) => m.clientType === 'desktop' && w.readyState === WebSocket.OPEN);
        if (desktopEntries.length > 0) {
          for (const [dWs] of desktopEntries) {
            dWs.send(JSON.stringify({ type: 'execute-batch-local', payload }));
          }
          broadcastAll('task-log', {
            level: 'info',
            message: '⚡ [Sync] Dispatched batch execution command to connected Windows Desktop app.',
            timestamp: new Date().toLocaleTimeString(),
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'dispatched-to-desktop' }));
        } else {
          startServerRunner(payload);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'started-on-server' }));
        }
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 4b. Cancel Batch Runner
  if (pathname === '/api/batch/cancel' && req.method === 'POST') {
    broadcastWS({ type: 'cancel-batch' });
    if (activeChild && !activeChild.killed) {
      try { activeChild.kill('SIGTERM'); } catch {}
      activeChild = null;
    }
    appState.isRunning = false;
    saveAppState();
    broadcastAll('task-finished', { cancelled: true });
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
        broadcastAll('task-log', {
          level: 'info',
          message: '📥 [Remote Update] Pulling latest updates from GitHub repository...',
          timestamp: new Date().toLocaleTimeString(),
        });

        broadcastAll('remote-desktop-update', {
          action: 'auto-update',
          timestamp: new Date().toISOString(),
          message: 'Remote update trigger broadcasted to desktop clients.'
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

        try {
          const gitOut = await runCmd('git', ['pull', 'origin', 'main']);
          broadcastAll('task-log', {
            level: 'info',
            message: `📦 [Git Pull] ${gitOut.trim().split('\n')[0] || 'Code up to date'}`,
            timestamp: new Date().toLocaleTimeString(),
          });
        } catch (gitErr) {
          console.warn('Git pull notice (container mode):', gitErr.message);
        }

        broadcastAll('task-log', {
          level: 'info',
          message: '🔨 [Remote Update] Rebuilding frontend assets with Vite...',
          timestamp: new Date().toLocaleTimeString(),
        });

        try {
          await runCmd('npm', ['run', 'build']);
          broadcastAll('task-log', {
            level: 'success',
            message: '✅ [Remote Update] Frontend rebuilt successfully!',
            timestamp: new Date().toLocaleTimeString(),
          });
        } catch (buildErr) {
          broadcastAll('task-log', {
            level: 'warn',
            message: `Build notice: ${buildErr.message}`,
            timestamp: new Date().toLocaleTimeString(),
          });
        }

        broadcastAll('task-log', {
          level: 'success',
          message: '🚀 [Remote Update] Restarting server container with new version...',
          timestamp: new Date().toLocaleTimeString(),
        });

        setTimeout(() => { process.exit(0); }, 1500);
      } catch (err) {
        broadcastAll('task-log', {
          level: 'error',
          message: `❌ [Remote Update Error] ${err.message}`,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    })();
    return;
  }

  // 6. Dedicated Remote Trigger for Windows Desktop Clients
  if (pathname === '/api/system/trigger-desktop-update' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        broadcastAll('remote-desktop-update', {
          action: 'auto-update',
          targetVersion: payload.version || 'latest',
          timestamp: new Date().toISOString(),
          message: 'Remote update trigger broadcasted to desktop clients.'
        });
        broadcastAll('task-log', {
          level: 'warn',
          message: '📡 [Remote Trigger] Broadcasted auto-update command to all connected Windows Desktop apps.',
          timestamp: new Date().toLocaleTimeString(),
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'broadcasted', targetVersion: payload.version || 'latest' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // =========================================================================
  // STATIC ASSETS SERVING (dist/)
  // =========================================================================
  if (req.method === 'GET') {
    let filePath = path.join(DIST_DIR, pathname);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const fileStream = fs.createReadStream(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      fileStream.pipe(res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('Method Not Allowed');
});

// ===========================================================================
// WEBSOCKET SERVER ATTACHMENT (/ws)
// ===========================================================================
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  const meta = {
    clientType: 'web',
    version: '0.5.4',
    id: Math.random().toString(36).substring(2, 9),
    ip: req.socket.remoteAddress,
  };
  wsClients.set(ws, meta);
  console.log(`[WebSocket] New client connected (${meta.id}) from ${meta.ip}. Total clients: ${wsClients.size}`);

  // Send initial full state
  ws.send(JSON.stringify({
    type: 'state-sync',
    payload: {
      items: appState.items,
      portalConfig: appState.portalConfig,
      logs: appState.logs.slice(-100),
      isRunning: appState.isRunning || !!activeChild,
      desktopConnected: hasConnectedDesktop(),
      lastUpdated: appState.lastUpdated,
    }
  }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const { type, payload } = msg;

      switch (type) {
        case 'register':
          if (payload?.clientType) {
            meta.clientType = payload.clientType;
            meta.version = payload.version || meta.version;
            console.log(`[WebSocket] Client ${meta.id} registered as ${meta.clientType} (v${meta.version})`);
            broadcastAll('desktop-status', { online: hasConnectedDesktop() });
          }
          break;

        case 'state-push':
          if (payload?.items && Array.isArray(payload.items)) {
            appState.items = payload.items;
          }
          if (payload?.portalConfig) {
            appState.portalConfig = { ...appState.portalConfig, ...payload.portalConfig };
          }
          appState.lastUpdated = new Date().toISOString();
          saveAppState();
          broadcastAll('state-sync', {
            items: appState.items,
            portalConfig: appState.portalConfig,
            isRunning: appState.isRunning || !!activeChild,
            desktopConnected: hasConnectedDesktop(),
            lastUpdated: appState.lastUpdated,
          }, ws);
          break;

        case 'item-status-update':
          if (payload) {
            appState.items = appState.items.map(it => {
              if ((payload.id && it.id === payload.id) || (payload.pdaVersion && it.pdaVersion === payload.pdaVersion) || (payload.index !== undefined && it.index === payload.index)) {
                return {
                  ...it,
                  status: payload.status || it.status,
                  buildId: payload.buildId || payload.build_id || it.buildId,
                  message: payload.message || it.message,
                  error: payload.error || it.error,
                  progressPercent: payload.progressPercent ?? (payload.status === 'success' ? 100 : it.progressPercent),
                };
              }
              return it;
            });
            saveAppState();
            broadcastAll('item-status-update', payload, ws);
          }
          break;

        case 'task-log':
          if (payload) {
            const logEntry = {
              id: Math.random().toString(36).substring(2, 9),
              timestamp: payload.timestamp || new Date().toLocaleTimeString(),
              level: payload.level || 'info',
              message: payload.message || '',
              index: payload.index,
            };
            appState.logs.push(logEntry);
            broadcastAll('task-log', logEntry, ws);
          }
          break;

        case 'batch-started':
          appState.isRunning = true;
          saveAppState();
          broadcastAll('batch-started', payload, ws);
          break;

        case 'task-finished':
        case 'batch-finished':
          appState.isRunning = false;
          saveAppState();
          broadcastAll('task-finished', payload, ws);
          break;

        case 'trigger-batch':
        case 'trigger-batch-runner':
          {
            const desktopEntries = Array.from(wsClients.entries()).filter(([w, m]) => m.clientType === 'desktop' && w.readyState === WebSocket.OPEN);
            if (desktopEntries.length > 0) {
              for (const [dWs] of desktopEntries) {
                dWs.send(JSON.stringify({ type: 'execute-batch-local', payload }));
              }
              broadcastAll('task-log', {
                level: 'info',
                message: '⚡ [Sync] Dispatched batch execution command to connected Windows Desktop app.',
                timestamp: new Date().toLocaleTimeString(),
              });
            } else {
              startServerRunner(payload);
            }
          }
          break;

        case 'cancel-batch':
          broadcastWS({ type: 'cancel-batch' }, ws);
          if (activeChild && !activeChild.killed) {
            try { activeChild.kill('SIGTERM'); } catch {}
            activeChild = null;
          }
          appState.isRunning = false;
          saveAppState();
          broadcastAll('task-finished', { cancelled: true });
          break;

        case 'trigger-fetch-ids':
          {
            const desktopEntries = Array.from(wsClients.entries()).filter(([w, m]) => m.clientType === 'desktop' && w.readyState === WebSocket.OPEN);
            if (desktopEntries.length > 0) {
              for (const [dWs] of desktopEntries) {
                dWs.send(JSON.stringify({ type: 'execute-fetch-ids', payload }));
              }
            } else {
              startServerRunner({ ...payload, portal: { ...payload.portal, fetchOnly: true } });
            }
          }
          break;
      }
    } catch (err) {
      console.warn('[WebSocket Message Error]', err);
    }
  });

  ws.on('close', () => {
    wsClients.delete(ws);
    console.log(`[WebSocket] Client disconnected (${meta.id}). Total clients: ${wsClients.size}`);
    broadcastAll('desktop-status', { online: hasConnectedDesktop() });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=============================================================`);
  console.log(`🚀 HomeBinary Realtime Server running at:`);
  console.log(`   - Local:    http://localhost:${PORT}`);
  console.log(`   - Public:   ${PUBLIC_URL}`);
  console.log(`   - WS:       ws://localhost:${PORT}/ws & wss://${new URL(PUBLIC_URL).host}/ws`);
  console.log(`=============================================================\n`);
});
