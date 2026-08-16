/**
 * ExpressionManager — Controls VRM facial expressions.
 * 
 * Uses @pixiv/three-vrm's expression manager.
 * Supports: happy, angry, sad, surprised, relaxed, neutral, etc.
 */
export class ExpressionManager {
  constructor() {
    /** @type {import('@pixiv/three-vrm').VRM} */
    this._vrm = null;
    this._currentExpression = null;
    this._currentWeight = 0;
  }

  /**
   * Bind to a loaded VRM.
   * @param {import('@pixiv/three-vrm').VRM} vrm
   */
  bind(vrm) {
    this._vrm = vrm;
    this._currentExpression = null;
    this._currentWeight = 0;
  }

  /**
   * Set an expression with weight.
   * @param {string} name — Expression name (happy, sad, angry, surprised, relaxed, neutral, etc.)
   * @param {number} weight — 0.0 to 1.0
   */
  setExpression(name, weight = 1.0) {
    if (!this._vrm?.expressionManager) {
      console.warn('[ExpressionManager] No VRM expression manager available');
      return;
    }

    // Reset previous
    if (this._currentExpression && this._currentExpression !== name) {
      this._vrm.expressionManager.setValue(this._currentExpression, 0);
    }

    this._vrm.expressionManager.setValue(name, Math.max(0, Math.min(1, weight)));
    this._currentExpression = name;
    this._currentWeight = weight;
  }

  /**
   * Reset all expressions to neutral.
   */
  resetAll() {
    if (!this._vrm?.expressionManager) return;

    // Reset all known expressions
    const manager = this._vrm.expressionManager;
    if (manager.expressions) {
      for (const expr of manager.expressions) {
        manager.setValue(expr.expressionName, 0);
      }
    }

    this._currentExpression = null;
    this._currentWeight = 0;
  }

  /**
   * Get available expression names.
   * @returns {string[]}
   */
  getAvailableExpressions() {
    if (!this._vrm?.expressionManager?.expressions) return [];
    return this._vrm.expressionManager.expressions.map(e => e.expressionName);
  }

  /**
   * Update expression manager (call each frame).
   */
  update() {
    if (this._vrm?.expressionManager) {
      this._vrm.expressionManager.update();
    }
  }

  get currentExpression() {
    return this._currentExpression;
  }

  unbind() {
    this._vrm = null;
    this._currentExpression = null;
    this._currentWeight = 0;
  }
}
