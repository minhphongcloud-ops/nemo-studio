import { createPlayCommand } from './AvatarCommand.js';

/**
 * RuleEngine — Maps GiftEvents to AvatarCommands.
 * 
 * Flow:
 *   GiftEvent → match rules → AvatarCommand
 * 
 * Rules come from app state (data/rules.json).
 * Each rule maps a gift name to an animation action name.
 * The RuleEngine then looks up the animation in the registry.
 */
export class RuleEngine {
  /**
   * @param {Function} getRules — () => rules array from state
   * @param {import('../avatar/AnimationRegistry.js').AnimationRegistry} animationRegistry
   */
  constructor(getRules, animationRegistry) {
    this._getRules = getRules;
    this._registry = animationRegistry;
    this._onMatch = null;
    this._onNoMatch = null;
  }

  /**
   * Process a GiftEvent and return an AvatarCommand (or null).
   * @param {import('./GiftEvent.js').GiftEvent} giftEvent
   * @returns {{ command: object, rule: object } | null}
   */
  match(giftEvent) {
    const rules = this._getRules();
    if (!rules || !rules.length) return null;

    const giftNameLower = (giftEvent.giftName || '').toLowerCase();

    // Find matching rule
    const matchedRule = rules.find(r => {
      if (!r.active) return false;
      const ruleName = (r.giftName || '').toLowerCase();
      return giftNameLower.includes(ruleName) || ruleName.includes(giftNameLower);
    });

    if (!matchedRule) {
      if (this._onNoMatch) this._onNoMatch(giftEvent);
      return null;
    }

    // Map rule action to animation ID in registry
    const actionName = matchedRule.action || matchedRule.animationName;
    const animation = this._registry.findByName(actionName);

    const command = createPlayCommand(
      animation ? animation.id : actionName,
      matchedRule.durationSec || 0
    );

    const result = { command, rule: matchedRule, giftEvent };

    if (this._onMatch) this._onMatch(result);

    return result;
  }

  onMatch(callback) { this._onMatch = callback; }
  onNoMatch(callback) { this._onNoMatch = callback; }
}
