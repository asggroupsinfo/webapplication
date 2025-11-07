// WebSocket service for real-time communication

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

class WebSocketService {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // Handle different URL formats
      let wsUrl: string;
      if (WS_URL.startsWith('ws://') || WS_URL.startsWith('wss://')) {
        wsUrl = WS_URL + '/ws';
      } else if (WS_URL.startsWith('http://')) {
        wsUrl = WS_URL.replace('http://', 'ws://') + '/ws';
      } else if (WS_URL.startsWith('https://')) {
        wsUrl = WS_URL.replace('https://', 'wss://') + '/ws';
      } else {
        // Default to ws://localhost:8000/ws
        wsUrl = 'ws://localhost:8000/ws';
      }
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.emit('connected');
      };

      this.socket.onclose = () => {
        console.log('WebSocket disconnected');
        this.emit('disconnected');
        this.attemptReconnect();
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Handle different message types
          if (data.type) {
            this.emit(data.type, data.payload || data);
          } else {
            // Handle plain JSON messages
            if (data.status) {
              this.emit('mt5_status', data.status);
            } else if (data.price) {
              this.emit('price_update', data);
            } else {
              this.emit('mt5_data', data);
            }
          }
        } catch (e) {
          // Handle text messages
          if (event.data.includes('mt5_status')) {
            const status = event.data.replace('mt5_status:', '').trim();
            this.emit('mt5_status', status);
          } else {
            this.emit('message', event.data);
          }
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  send(event: string, data: any): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: event, payload: data }));
    }
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN || false;
  }
}

export const wsService = new WebSocketService();

