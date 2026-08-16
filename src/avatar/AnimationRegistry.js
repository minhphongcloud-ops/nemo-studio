/**
 * AnimationRegistry — Stores VRMA animation entries.
 *
 * Each entry contains:
 *   { vrmAnimation, clip?, name, duration, category, fileName, ready }
 *
 * - vrmAnimation: raw data from AnimationLoader.loadRaw() — always present
 * - clip: Three.js AnimationClip — present only after VRM is bound
 * - ready: true when clip is created and playable
 */
export class AnimationRegistry {
  constructor() {
    /** @type {Map<string, AnimationEntry>} */
    this._entries = new Map();
    this._listeners = [];
  }

  /**
   * Register an animation (raw, before VRM is bound).
   * @param {string} id
   * @param {{ vrmAnimation: object, name: string, duration: number, category: string, fileName: string, clip?: object, ready?: boolean }} entry
   */
  register(id, entry) {
    this._entries.set(id, { ready: false, clip: null, ...entry });
    this._notify();
  }

  /**
   * Attach a compiled AnimationClip to an existing entry (after VRM is loaded).
   * @param {string} id
   * @param {import('three').AnimationClip} clip
   */
  bindClip(id, clip) {
    const entry = this._entries.get(id);
    if (!entry) return;
    entry.clip  = clip;
    entry.ready = true;
    this._notify();
  }

  /**
   * Remove an animation.
   */
  remove(id) {
    this._entries.delete(id);
    this._notify();
  }

  /**
   * Get animation by ID (full internal entry).
   */
  get(id) {
    return this._entries.get(id) || null;
  }

  /**
   * Find animation by name (case-insensitive partial match).
   */
  findByName(name) {
    const lower = name.toLowerCase();
    for (const [id, entry] of this._entries) {
      if (entry.name.toLowerCase().includes(lower) || lower.includes(entry.name.toLowerCase())) {
        return { id, ...entry };
      }
    }
    return null;
  }

  /**
   * Get all animations as summary objects (safe for UI).
   */
  getAll() {
    return Array.from(this._entries.entries()).map(([id, e]) => ({
      id,
      name:         e.name,
      duration:     e.duration,
      category:     e.category,
      fileName:     e.fileName,
      ready:        e.ready,
    }));
  }

  has(id) { return this._entries.has(id); }

  get size() { return this._entries.size; }

  onChange(callback) {
    this._listeners.push(callback);
    return () => { this._listeners = this._listeners.filter(fn => fn !== callback); };
  }

  _notify() {
    const all = this.getAll();
    this._listeners.forEach(fn => fn(all));
  }

  clear() {
    this._entries.clear();
    this._notify();
  }
}
