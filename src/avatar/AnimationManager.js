import * as THREE from 'three';
import { AnimationState } from './AvatarState.js';

/**
 * AnimationManager — Controls animation playback on a VRM.
 * 
 * Owns the AnimationMixer.
 * Supports: play, pause, resume, stop, crossfade, speed, loop.
 * 
 * Events emitted via callbacks:
 * - onStart(animationId, duration)
 * - onEnd(animationId)
 * - onProgress(animationId, currentTime, totalTime, percentage)
 */
export class AnimationManager {
  constructor() {
    /** @type {THREE.AnimationMixer} */
    this._mixer = null;
    /** @type {THREE.AnimationAction} */
    this._currentAction = null;
    this._currentId = null;
    this._state = AnimationState.IDLE;
    this._speed = 1;
    this._loop = false;

    // Callbacks
    this._onStart = null;
    this._onEnd = null;
    this._onProgress = null;
    this._onStateChange = null;

    // Progress tracking
    this._progressInterval = null;
  }

  /**
   * Bind to a VRM scene (creates mixer).
   * @param {THREE.Object3D} vrmScene
   */
  bind(vrmScene) {
    this.dispose();
    this._mixer = new THREE.AnimationMixer(vrmScene);

    // Listen for animation finished
    this._mixer.addEventListener('finished', () => {
      this._setState(AnimationState.COMPLETED);
      if (this._onEnd) this._onEnd(this._currentId);
      this._currentAction = null;
      this._currentId = null;
      this._stopProgressTracking();
      this._setState(AnimationState.IDLE);
    });
  }

  /**
   * Play an animation clip with crossfade.
   * @param {string} id — animation ID
   * @param {THREE.AnimationClip} clip
   * @param {{ fadeIn?: number, fadeOut?: number }} options
   */
  play(id, clip, options = {}) {
    if (!this._mixer) {
      console.warn('[AnimationManager] No mixer bound');
      return;
    }

    const { fadeIn = 0.2, fadeOut = 0.2 } = options;

    // Create new action
    const newAction = this._mixer.clipAction(clip);
    newAction.setEffectiveTimeScale(this._speed);
    newAction.setLoop(this._loop ? THREE.LoopRepeat : THREE.LoopOnce, this._loop ? Infinity : 1);
    newAction.clampWhenFinished = !this._loop;

    // CrossFade from current
    if (this._currentAction && this._currentAction.isRunning()) {
      this._currentAction.fadeOut(fadeOut);
      newAction.reset().fadeIn(fadeIn).play();
    } else {
      // No current animation — just play with fade in
      newAction.reset().fadeIn(fadeIn).play();
    }

    this._currentAction = newAction;
    this._currentId = id;
    this._setState(AnimationState.PLAYING);

    if (this._onStart) this._onStart(id, clip.duration);
    this._startProgressTracking(clip.duration);
  }

  /**
   * Pause current animation.
   */
  pause() {
    if (this._currentAction && this._state === AnimationState.PLAYING) {
      this._currentAction.paused = true;
      this._setState(AnimationState.PAUSED);
      this._stopProgressTracking();
    }
  }

  /**
   * Resume paused animation.
   */
  resume() {
    if (this._currentAction && this._state === AnimationState.PAUSED) {
      this._currentAction.paused = false;
      this._setState(AnimationState.PLAYING);
      this._startProgressTracking(this._currentAction.getClip().duration);
    }
  }

  /**
   * Stop animation and return to idle.
   */
  stop() {
    if (this._currentAction) {
      this._currentAction.fadeOut(0.3);
      setTimeout(() => {
        if (this._currentAction) {
          this._currentAction.stop();
        }
        this._mixer?.stopAllAction();
      }, 350);
    }
    this._stopProgressTracking();
    if (this._onEnd) this._onEnd(this._currentId);
    this._currentAction = null;
    this._currentId = null;
    this._setState(AnimationState.IDLE);
  }

  /**
   * Reset — stop all and clear.
   */
  reset() {
    if (this._mixer) {
      this._mixer.stopAllAction();
    }
    this._currentAction = null;
    this._currentId = null;
    this._stopProgressTracking();
    this._setState(AnimationState.IDLE);
  }

  /**
   * Set playback speed.
   * @param {number} speed — multiplier (0.5, 1, 1.5, 2)
   */
  setSpeed(speed) {
    this._speed = speed;
    if (this._currentAction) {
      this._currentAction.setEffectiveTimeScale(speed);
    }
  }

  /**
   * Set loop mode.
   * @param {boolean} loop
   */
  setLoop(loop) {
    this._loop = loop;
    if (this._currentAction) {
      this._currentAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
      this._currentAction.clampWhenFinished = !loop;
    }
  }

  /**
   * Get current progress.
   * @returns {{ currentTime: number, totalTime: number, percentage: number } | null}
   */
  getProgress() {
    if (!this._currentAction) return null;
    const clip = this._currentAction.getClip();
    const time = this._currentAction.time;
    return {
      currentTime: time,
      totalTime: clip.duration,
      percentage: Math.min((time / clip.duration) * 100, 100),
    };
  }

  /**
   * Update mixer (call each frame with delta).
   * @param {number} delta
   */
  update(delta) {
    if (this._mixer) {
      this._mixer.update(delta);
    }
  }

  get currentAnimationId() {
    return this._currentId;
  }

  get state() {
    return this._state;
  }

  get speed() {
    return this._speed;
  }

  get loop() {
    return this._loop;
  }

  // --- Event callbacks ---

  onStart(callback) { this._onStart = callback; }
  onEnd(callback) { this._onEnd = callback; }
  onProgress(callback) { this._onProgress = callback; }
  onStateChange(callback) { this._onStateChange = callback; }

  // --- Internal ---

  _setState(newState) {
    if (this._state === newState) return;
    this._state = newState;
    if (this._onStateChange) this._onStateChange(newState);
  }

  _startProgressTracking(duration) {
    this._stopProgressTracking();
    this._progressInterval = setInterval(() => {
      if (this._currentAction && this._state === AnimationState.PLAYING) {
        const time = this._currentAction.time;
        const pct = Math.min((time / duration) * 100, 100);
        if (this._onProgress) {
          this._onProgress(this._currentId, time, duration, pct);
        }
      }
    }, 100); // Update progress every 100ms (not every frame!)
  }

  _stopProgressTracking() {
    if (this._progressInterval) {
      clearInterval(this._progressInterval);
      this._progressInterval = null;
    }
  }

  /**
   * Cleanup.
   */
  dispose() {
    this._stopProgressTracking();
    if (this._mixer) {
      this._mixer.stopAllAction();
      this._mixer.uncacheRoot(this._mixer.getRoot());
      this._mixer = null;
    }
    this._currentAction = null;
    this._currentId = null;
    this._state = AnimationState.IDLE;
  }
}
