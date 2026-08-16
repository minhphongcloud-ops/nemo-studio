import { EventEmitter } from 'events';

/**
 * TikTokManager — manages connections to TikTok LIVE streams.
 * Uses tiktok-live-connector (unofficial) to receive realtime events.
 */
export class TikTokManager extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map(); // accountId → connection
    this.WebcastPushConnection = null;
    this._loadLib();
  }

  async _loadLib() {
    try {
      const mod = await import('tiktok-live-connector');
      this.WebcastPushConnection = mod.WebcastPushConnection;
      console.log('[TikTok] tiktok-live-connector loaded');
    } catch (err) {
      console.warn('[TikTok] tiktok-live-connector not available:', err.message);
      console.warn('[TikTok] Running in mock mode — use DevTools to simulate gifts');
    }
  }

  async connect(accountId, username) {
    // Disconnect existing connection for this account
    this.disconnect(accountId);

    if (!this.WebcastPushConnection) {
      this.emit('error', { accountId, message: 'tiktok-live-connector chưa được cài đặt' });
      return null;
    }

    try {
      const connection = new this.WebcastPushConnection(username, {
        processInitialData: true,
        enableExtendedGiftInfo: true,
        enableWebsocketUpgrade: true,
        requestPollingIntervalMs: 2000,
      });

      // Store connection
      this.connections.set(accountId, connection);

      // Connect
      const state = await connection.connect();
      console.log(`[TikTok] Connected to @${username} (Room: ${state.roomId})`);

      this.emit('connected', {
        accountId,
        username,
        roomId: state.roomId,
        viewers: state.viewerCount || 0,
      });

      // ─── Event Handlers ─────────────────────────────────
      connection.on('gift', (data) => {
        // Only process finished streak gifts or non-streak gifts
        if (data.giftType === 1 && !data.repeatEnd) return;

        this.emit('gift', {
          accountId,
          userId: data.userId,
          uniqueId: data.uniqueId,
          nickname: data.nickname,
          profilePictureUrl: data.profilePictureUrl,
          giftId: data.giftId,
          giftName: data.giftName || data.describe || 'Gift',
          giftPictureUrl: data.giftPictureUrl,
          diamondCount: data.diamondCount || 0,
          repeatCount: data.repeatCount || 1,
          timestamp: Date.now(),
        });
      });

      connection.on('chat', (data) => {
        this.emit('chat', {
          accountId,
          userId: data.userId,
          uniqueId: data.uniqueId,
          nickname: data.nickname,
          comment: data.comment,
          timestamp: Date.now(),
        });
      });

      connection.on('like', (data) => {
        this.emit('like', {
          accountId,
          userId: data.userId,
          uniqueId: data.uniqueId,
          likeCount: data.likeCount,
          totalLikeCount: data.totalLikeCount,
        });
      });

      connection.on('member', (data) => {
        this.emit('member', {
          accountId,
          uniqueId: data.uniqueId,
          nickname: data.nickname,
          actionId: data.actionId,
        });
      });

      connection.on('roomUser', (data) => {
        this.emit('roomUser', {
          accountId,
          viewerCount: data.viewerCount,
        });
      });

      connection.on('streamEnd', () => {
        console.log(`[TikTok] Stream ended for @${username}`);
        this.emit('streamEnd', { accountId, username });
        this.connections.delete(accountId);
      });

      connection.on('error', (err) => {
        console.error(`[TikTok] Error for @${username}:`, err.message);
        this.emit('error', { accountId, message: err.message });
      });

      connection.on('disconnected', () => {
        console.log(`[TikTok] Disconnected from @${username}`);
        this.emit('disconnected', { accountId, username });
        this.connections.delete(accountId);
      });

      return state;
    } catch (err) {
      console.error(`[TikTok] Failed to connect to @${username}:`, err.message);
      this.emit('error', {
        accountId,
        message: `Không thể kết nối @${username}: ${err.message}`,
      });
      return null;
    }
  }

  disconnect(accountId) {
    const conn = this.connections.get(accountId);
    if (conn) {
      try { conn.disconnect(); } catch { /* ignore */ }
      this.connections.delete(accountId);
      this.emit('disconnected', { accountId });
    }
  }

  disconnectAll() {
    for (const [accountId] of this.connections) {
      this.disconnect(accountId);
    }
  }

  isConnected(accountId) {
    return this.connections.has(accountId);
  }

  getStatus() {
    const status = {};
    for (const [accountId] of this.connections) {
      status[accountId] = { connected: true };
    }
    return status;
  }
}
