import { io } from 'socket.io-client';

/**
 * Socket.IO client — connects to backend server.
 * Auto-reconnects. Provides on/emit/off API.
 */
class SocketClient {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this._connected = false;
  }

  connect(url = '') {
    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });

    this.socket.on('connect', () => {
      this._connected = true;
      console.log('[Socket] Connected:', this.socket.id);
      this._trigger('_connected', { id: this.socket.id });
    });

    this.socket.on('disconnect', (reason) => {
      this._connected = false;
      console.log('[Socket] Disconnected:', reason);
      this._trigger('_disconnected', { reason });
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
      this._trigger('_error', { message: err.message });
    });

    return this;
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
      // Register with Socket.IO
      if (this.socket && !event.startsWith('_')) {
        this.socket.on(event, (...args) => this._trigger(event, ...args));
      }
    }
    this.listeners.get(event).push(callback);
    return this;
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    if (callback) {
      const fns = this.listeners.get(event).filter(fn => fn !== callback);
      this.listeners.set(event, fns);
    } else {
      this.listeners.delete(event);
    }
    return this;
  }

  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
    return this;
  }

  _trigger(event, ...args) {
    const fns = this.listeners.get(event);
    if (fns) fns.forEach(fn => fn(...args));
  }

  get connected() {
    return this._connected;
  }
}

export const socket = new SocketClient();
