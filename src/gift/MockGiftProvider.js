import { createGiftEvent } from './GiftEvent.js';

/**
 * MockGiftProvider — Simulates gift events for testing.
 * 
 * DOES NOT connect to TikTok.
 * Generates GiftEvents and routes them through the full pipeline:
 *   MockGiftProvider → GiftEvent → RuleEngine → AvatarCommand → AvatarEngine
 */
export class MockGiftProvider {
  /**
   * @param {import('./RuleEngine.js').RuleEngine} ruleEngine
   * @param {import('../avatar/AvatarEngine.js').AvatarEngine} avatarEngine
   */
  constructor(ruleEngine, avatarEngine) {
    this._ruleEngine = ruleEngine;
    this._avatarEngine = avatarEngine;
    this._onGiftSent = null;
    this._onLog = null;
  }

  /**
   * Available test gifts.
   */
  static get GIFTS() {
    return [
      { id: 'rose', name: 'Rose', emoji: '🌹' },
      { id: 'heart', name: 'Heart', emoji: '❤️' },
      { id: 'galaxy', name: 'Galaxy', emoji: '🌌' },
      { id: 'lion', name: 'Lion', emoji: '🦁' },
      { id: 'universe', name: 'TikTok Universe', emoji: '👑' },
    ];
  }

  /**
   * Send a test gift through the full pipeline.
   * 
   * Flow: GiftEvent → RuleEngine → AvatarCommand → AvatarEngine
   * 
   * @param {{ giftId: string, giftName: string, quantity: number, userName: string }} params
   */
  sendTestGift({ giftId, giftName, quantity = 1, userName = 'TestUser' }) {
    // 1. Create GiftEvent
    const giftEvent = createGiftEvent({
      giftId,
      giftName,
      quantity,
      senderId: 'test-' + userName.toLowerCase().replace(/\s/g, ''),
      senderName: userName,
    });

    this._log('gift_received', `Gift received: ${giftName} x${quantity} from ${userName}`);

    if (this._onGiftSent) this._onGiftSent(giftEvent);

    // 2. Route through RuleEngine
    const result = this._ruleEngine.match(giftEvent);

    if (result) {
      this._log('rule_matched', `Rule matched: ${result.rule.action}`);

      // 3. Send AvatarCommand to AvatarEngine
      this._avatarEngine.executeCommand(result.command);
    } else {
      this._log('rule_no_match', `No rule matched for: ${giftName}`);
    }

    return { giftEvent, matchResult: result };
  }

  onGiftSent(callback) { this._onGiftSent = callback; }
  onLog(callback) { this._onLog = callback; }

  _log(type, message) {
    if (this._onLog) {
      this._onLog({
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString('vi-VN'),
        type,
        message,
      });
    }
  }
}
