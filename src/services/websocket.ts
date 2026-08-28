/**
 * HomeBinary Bidirectional WebSocket Client
 * Connects Desktop & Web clients to the Central Server for 100% Real-time Mirroring
 */

export type WsMessageHandler = (type: string, payload: any) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string = '';
  private clientType: 'desktop' | 'web' = 'web';
  private version: string = '0.5.3';
  private handlers: Set<WsMessageHandler> = new Set();
  private reconnectTimer: any = null;
  private isExplicitDisconnect = false;
  public isConnected = false;

  public init(serverUrl: string, clientType: 'desktop' | 'web', version: string) {
    this.clientType = clientType;
    this.version = version;
    this.isExplicitDisconnect = false;

    // Build ws:// or wss:// URL
    let wsUrl = serverUrl;
    if (wsUrl.startsWith('http://')) {
      wsUrl = wsUrl.replace('http://', 'ws://');
    } else if (wsUrl.startsWith('https://')) {
      wsUrl = wsUrl.replace('https://', 'wss://');
    } else if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      wsUrl = `${isHttps ? 'wss://' : 'ws://'}${wsUrl}`;
    }

    if (!wsUrl.endsWith('/ws')) {
      wsUrl = `${wsUrl.replace(/\/+$/, '')}/ws`;
    }

    this.url = wsUrl;
    this.connect();
  }

  private connect() {
    if (this.isExplicitDisconnect || !this.url) return;

    try {
      if (this.ws) {
        try { this.ws.close(); } catch {}
      }

      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        console.log(`[WebSocket] Connected to ${this.url} as ${this.clientType}`);

        // Register client identity
        this.send('register', {
          clientType: this.clientType,
          version: this.version,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type) {
            this.notifyHandlers(data.type, data.payload ?? data);
          }
        } catch (err) {
          console.warn('[WebSocket Parse Error]', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        if (!this.isExplicitDisconnect) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            this.connect();
          }, 2500);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[WebSocket Error]', err);
        try { this.ws?.close(); } catch {}
      };
    } catch (err) {
      console.warn('[WebSocket Init Error]', err);
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    }
  }

  public subscribe(handler: WsMessageHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  private notifyHandlers(type: string, payload: any) {
    for (const handler of this.handlers) {
      try {
        handler(type, payload);
      } catch (err) {
        console.error('[WebSocket Handler Error]', err);
      }
    }
  }

  public send(type: string, payload?: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type, payload }));
      } catch (err) {
        console.warn('[WebSocket Send Error]', err);
      }
    }
  }

  public disconnect() {
    this.isExplicitDisconnect = true;
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
    this.isConnected = false;
  }
}

export const wsService = new WebSocketClient();
