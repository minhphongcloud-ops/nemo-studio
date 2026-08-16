/**
 * AppState — reactive global state manager.
 * Components subscribe to state changes and re-render automatically.
 */
class AppState {
  constructor() {
    this._state = {
      accounts: [],
      rules: [],
      dances: [],
      settings: {
        autoDance: true,
        receiveGifts: true,
        stageEffects: true,
        audio: true,
        volume: 70,
        selectedDanceId: null,
        avatarModelUrl: null,
      },
      engine: {
        queue: [],
        current: null,
        progress: 0,
        isRunning: false,
      },
      giftFeed: [
        { user: 'Huy Hoàng', giftName: 'Rose', emoji: '🌹', qty: 10 },
        { user: 'Trâm Anh', giftName: 'Galaxy', emoji: '🌌', qty: 1 },
        { user: 'Tuấn Kiệt', giftName: 'Lion', emoji: '🦁', qty: 1 },
        { user: 'Minh Nhật', giftName: 'TikTok Gift', emoji: '🎁', qty: 5 },
        { user: 'Quỳnh Như', giftName: 'Rose', emoji: '🌹', qty: 3 },
      ],
      chatMessages: [],
      liveStats: { viewers: 0, likes: 0, duration: 0 },
      systemMetrics: { fps: 60, cpu: 12, ram: 28, latency: 28 },
      connection: { server: false, tiktok: false },
      selectedAccountId: null,
      selectedDanceId: null,
      avatarAnimation: null,
      danceTab: 'all',
      devToolsOpen: false,
    };
    this._subscribers = new Map();
  }

  get(key) {
    if (key) {
      return key.split('.').reduce((obj, k) => obj?.[k], this._state);
    }
    return this._state;
  }

  set(key, value) {
    const keys = key.split('.');
    let obj = this._state;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    this._notify(key);
  }

  update(key, updater) {
    const current = this.get(key);
    this.set(key, updater(current));
  }

  merge(updates) {
    Object.entries(updates).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const existing = this.get(key) || {};
        this.set(key, { ...existing, ...value });
      } else {
        this.set(key, value);
      }
    });
  }

  subscribe(key, callback) {
    if (!this._subscribers.has(key)) {
      this._subscribers.set(key, []);
    }
    this._subscribers.get(key).push(callback);
    return () => {
      const fns = this._subscribers.get(key)?.filter(fn => fn !== callback);
      this._subscribers.set(key, fns || []);
    };
  }

  _notify(changedKey) {
    for (const [key, fns] of this._subscribers) {
      if (changedKey === key || changedKey.startsWith(key + '.') || key.startsWith(changedKey + '.') || key === '*') {
        fns.forEach(fn => fn(this.get(key), changedKey));
      }
    }
  }
}

export const state = new AppState();
