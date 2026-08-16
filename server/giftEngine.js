import { EventEmitter } from 'events';
import * as store from './store.js';

/**
 * GiftEngine — processes gift events through the rule → queue → animation pipeline.
 */
export class GiftEngine extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.currentItem = null;
    this.progress = 0; // seconds elapsed on current item
    this.isRunning = false;
    this._timer = null;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this._startTick();
    this.emit('engineState', { running: true });
  }

  stop() {
    this.isRunning = false;
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this.emit('engineState', { running: false });
  }

  pause() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this.emit('engineState', { running: false, paused: true });
  }

  resume() {
    if (!this.isRunning) return;
    this._startTick();
    this.emit('engineState', { running: true, paused: false });
  }

  reset() {
    this.stop();
    this.queue = [];
    this.currentItem = null;
    this.progress = 0;
    this.emit('queueUpdate', { queue: [], current: null, progress: 0 });
    this.emit('animationUpdate', { animation: null, progress: 0 });
  }

  /**
   * Process an incoming gift event — match rules, add to queue.
   */
  processGift(giftEvent) {
    const settings = store.getSettings();
    if (!settings.receiveGifts) return;

    const rules = store.getRules();

    // Find matching rule (case-insensitive partial match on gift name)
    const giftNameLower = (giftEvent.giftName || '').toLowerCase();
    const matchedRule = rules.find(r => {
      if (!r.active) return false;
      return giftNameLower.includes(r.giftName.toLowerCase()) ||
             r.giftName.toLowerCase().includes(giftNameLower);
    });

    if (matchedRule) {
      const queueItem = {
        id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        giftName: giftEvent.giftName,
        giftEmoji: matchedRule.giftEmoji,
        user: giftEvent.nickname || giftEvent.uniqueId || 'Người dùng',
        userId: giftEvent.userId,
        userAvatar: giftEvent.profilePictureUrl,
        quantity: giftEvent.repeatCount || 1,
        action: matchedRule.action,
        durationSec: matchedRule.durationSec,
        priority: matchedRule.priority,
        ruleId: matchedRule.id,
        timestamp: Date.now(),
      };

      // Insert by priority (higher priority = earlier in queue, but after current)
      this._insertByPriority(queueItem);

      this.emit('ruleMatched', { rule: matchedRule, gift: giftEvent });
      this.emit('queueUpdate', this.getState());

      // If no animation playing, start next
      if (!this.currentItem && this.isRunning && settings.autoDance) {
        this._playNext();
      }

      return { matched: true, rule: matchedRule, queueItem };
    }

    return { matched: false };
  }

  _insertByPriority(item) {
    // Find position: after items with higher or equal priority
    let insertIdx = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].priority < item.priority) {
        insertIdx = i;
        break;
      }
    }
    this.queue.splice(insertIdx, 0, item);
  }

  _playNext() {
    if (this.queue.length === 0) {
      this.currentItem = null;
      this.progress = 0;
      this.emit('animationUpdate', { animation: null, progress: 0, totalSec: 0 });
      this.emit('queueUpdate', this.getState());
      return;
    }

    this.currentItem = this.queue.shift();
    this.progress = 0;

    this.emit('animationStart', {
      animation: this.currentItem.action,
      totalSec: this.currentItem.durationSec,
      item: this.currentItem,
    });
    this.emit('queueUpdate', this.getState());
  }

  _startTick() {
    if (this._timer) clearInterval(this._timer);
    this._timer = setInterval(() => {
      if (!this.currentItem) {
        if (this.queue.length > 0) {
          this._playNext();
        }
        return;
      }

      this.progress++;
      const pct = (this.progress / this.currentItem.durationSec) * 100;

      this.emit('animationUpdate', {
        animation: this.currentItem.action,
        progress: this.progress,
        totalSec: this.currentItem.durationSec,
        percentage: Math.min(pct, 100),
        item: this.currentItem,
      });

      if (this.progress >= this.currentItem.durationSec) {
        this.emit('animationEnd', { item: this.currentItem });
        this._playNext();
      }
    }, 1000);
  }

  removeFromQueue(itemId) {
    this.queue = this.queue.filter(q => q.id !== itemId);
    this.emit('queueUpdate', this.getState());
  }

  clearQueue() {
    this.queue = [];
    this.emit('queueUpdate', this.getState());
  }

  skipCurrent() {
    if (this.currentItem) {
      this.emit('animationEnd', { item: this.currentItem, skipped: true });
      this._playNext();
    }
  }

  getState() {
    return {
      queue: this.queue,
      current: this.currentItem,
      progress: this.progress,
      isRunning: this.isRunning,
    };
  }
}
