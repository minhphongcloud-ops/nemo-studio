import { AvatarState, AvatarStateMachine } from './AvatarState.js';
import { AvatarRuntime } from './AvatarRuntime.js';
import { CameraManager } from './CameraManager.js';
import { ExpressionManager } from './ExpressionManager.js';
import { VRMLoader } from './VRMLoader.js';
import { AnimationLoader } from './AnimationLoader.js';
import { AnimationManager } from './AnimationManager.js';
import { AnimationRegistry } from './AnimationRegistry.js';

/**
 * AvatarEngine — Public facade for the entire Avatar system.
 * 
 * This is the ONLY class the UI layer interacts with.
 * 
 * Knows nothing about: TikTok, Gifts, Rules.
 * Only receives AvatarCommands.
 * 
 * API:
 *   init(container)           — Mount into DOM
 *   loadVRM(file)             — Import avatar
 *   unloadVRM()               — Remove avatar
 *   loadAnimation(file)       — Import VRMA
 *   playAnimation(id)         — Play by animation ID
 *   pauseAnimation()          
 *   resumeAnimation()         
 *   stopAnimation()           
 *   resetAnimation()          
 *   executeCommand(command)   — Process AvatarCommand
 *   getState()                — Get full engine state
 *   dispose()                 — Cleanup
 */
export class AvatarEngine {
  constructor() {
    this.stateMachine = new AvatarStateMachine();
    this.runtime = new AvatarRuntime();
    this.camera = new CameraManager();
    this.expression = new ExpressionManager();
    this.vrmLoader = new VRMLoader();
    this.animationLoader = new AnimationLoader();
    this.animationManager = new AnimationManager();
    this.animationRegistry = new AnimationRegistry();

    /** @type {import('@pixiv/three-vrm').VRM | null} */
    this._vrm = null;
    this._vrmName = null;

    // Event callbacks
    this._onStateChange = null;
    this._onFpsUpdate = null;
    this._onAnimationEvent = null;
    this._onLog = null;

    // Wire up internal events
    this.stateMachine.onChange((newState, prev) => {
      if (this._onStateChange) this._onStateChange(newState, prev);
    });
  }

  /**
   * Initialize the engine and mount into a DOM container.
   * @param {HTMLElement} container
   */
  init(container) {
    // Init runtime (scene, renderer, lights)
    this.runtime.init(container);

    // Init camera
    const { width, height } = { 
      width: container.clientWidth || 300, 
      height: container.clientHeight || 400 
    };
    this.camera.init(this.runtime.renderer.domElement, width / height);
    this.runtime.setCamera(this.camera.camera);

    // Register per-frame updates
    this.runtime.onUpdate((delta) => {
      // Update VRM (spring bones, etc.)
      if (this._vrm) {
        this._vrm.update(delta);
      }
      // Update animation mixer
      this.animationManager.update(delta);
      // Update expressions
      this.expression.update();
      // Update camera controls
      this.camera.update();
    });

    // FPS callback
    this.runtime.onFpsUpdate((fps) => {
      if (this._onFpsUpdate) this._onFpsUpdate(fps);
    });

    // Animation events → log
    this.animationManager.onStart((id, duration) => {
      this.stateMachine.transition(AvatarState.PLAYING);
      this._log('animation_start', `Animation started: ${id} (${duration.toFixed(1)}s)`);
      if (this._onAnimationEvent) this._onAnimationEvent('start', id, duration);
    });

    this.animationManager.onEnd((id) => {
      this.stateMachine.transition(AvatarState.IDLE);
      this._log('animation_end', `Animation completed: ${id}`);
      if (this._onAnimationEvent) this._onAnimationEvent('end', id);
    });

    this.animationManager.onProgress((id, time, total, pct) => {
      if (this._onAnimationEvent) this._onAnimationEvent('progress', id, time, total, pct);
    });

    this.animationManager.onStateChange((state) => {
      if (this._onAnimationEvent) this._onAnimationEvent('stateChange', state);
    });

    this._log('engine_init', 'Avatar Engine initialized');
  }

  // ─── VRM ─────────────────────────────────────────────────

  /**
   * Load a VRM file.
   * @param {File} file
   * @param {Function} onProgress
   */
  async loadVRM(file, onProgress) {
    // Unload current if any
    if (this._vrm) {
      this.unloadVRM();
    }

    this.stateMachine.transition(AvatarState.LOADING);
    this._log('vrm_loading', `Loading VRM: ${file.name}`);

    try {
      const { vrm, name } = await this.vrmLoader.load(file, onProgress);

      // Setup in scene
      this.vrmLoader.setupInScene(vrm, this.runtime.scene);

      // Bind systems
      this._vrm = vrm;
      this._vrmName = name;
      this.expression.bind(vrm);
      this.animationManager.bind(vrm.scene);

      // Auto-frame camera
      this.camera.autoFrame(vrm.scene);

      this.stateMachine.transition(AvatarState.READY);
      this.stateMachine.transition(AvatarState.IDLE);

      // Bind all previously imported VRMA animations to the new VRM
      this._bindAllAnimations();

      this._log('vrm_loaded', `VRM loaded: ${name}`);

      return { name, expressions: this.expression.getAvailableExpressions() };
    } catch (error) {
      this.stateMachine.transition(AvatarState.ERROR);
      this._log('vrm_error', `VRM load error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Unload current VRM.
   */
  unloadVRM() {
    if (this._vrm) {
      this.animationManager.reset();
      this.expression.unbind();
      this.vrmLoader.removeFromScene(this._vrm, this.runtime.scene);
      this._vrm = null;
      this._vrmName = null;
      this.stateMachine.forceState(AvatarState.EMPTY);
      this._log('vrm_unloaded', 'VRM unloaded');
    }
  }

  // ─── ANIMATION ───────────────────────────────────────────

  /**
   * Load a VRMA animation file.
   * Phase 1: does NOT require VRM — stores raw vrmAnimation data.
   * If VRM is already loaded, also creates the clip immediately (Phase 2).
   *
   * @param {File} file
   * @param {Function} [onProgress]
   * @returns {{ id: string, name: string, duration: number, ready: boolean }}
   */
  async loadAnimation(file, onProgress) {
    this._log('animation_loading', `Loading animation: ${file.name}`);

    try {
      // Phase 1: load raw (no VRM needed)
      const { vrmAnimation, name, fileName } = await this.animationLoader.loadRaw(file, onProgress);

      // Generate stable ID
      const id = 'anim_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + Date.now().toString(36);

      // Estimate duration from raw VRMA (humanoid tracks duration)
      let duration = 0;
      try {
        const tracks = vrmAnimation?.humanoidTracks;
        if (tracks) {
          const allTimes = Object.values(tracks).flatMap(t => Array.from(t.times || []));
          if (allTimes.length) duration = Math.max(...allTimes);
        }
        if (!duration && vrmAnimation?.expressionTracks) {
          const allTimes = Object.values(vrmAnimation.expressionTracks).flatMap(t => Array.from(t.times || []));
          if (allTimes.length) duration = Math.max(...allTimes);
        }
      } catch (_) { duration = 0; }

      // Register with raw data (clip = null until VRM is ready)
      this.animationRegistry.register(id, {
        vrmAnimation,
        name,
        fileName,
        duration,
        category: this._guessCategory(name),
        clip: null,
        ready: false,
      });

      // Phase 2: if VRM is already loaded, compile clip immediately
      let ready = false;
      if (this._vrm) {
        try {
          const { clip, duration: clipDur } = this.animationLoader.createClip(vrmAnimation, this._vrm);
          this.animationRegistry.bindClip(id, clip);
          // Update duration to accurate value from clip
          const entry = this.animationRegistry.get(id);
          if (entry) entry.duration = clipDur;
          ready = true;
          duration = clipDur;
        } catch (err) {
          this._log('animation_error', `Clip compile error: ${err.message}`);
        }
      }

      this._log('animation_loaded',
        `Animation loaded: ${name} (${duration.toFixed(1)}s)${ready ? '' : ' — sẽ áp dụng khi có VRM'}`);

      return { id, name, duration, ready };
    } catch (error) {
      this._log('animation_error', `Animation load error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Play an animation by ID.
   * If clip not yet compiled (VRM wasn't loaded at import time),
   * compiles it now on demand.
   * @param {string} animationId
   */
  playAnimation(animationId) {
    const entry = this.animationRegistry.get(animationId);
    if (!entry) {
      this._log('animation_error', `Animation not found: ${animationId}`);
      return;
    }
    if (!this._vrm) {
      this._log('avatar_error', 'No avatar loaded — cannot play animation');
      return;
    }

    // Compile clip on demand if not yet done
    if (!entry.ready || !entry.clip) {
      try {
        const { clip, duration } = this.animationLoader.createClip(entry.vrmAnimation, this._vrm);
        this.animationRegistry.bindClip(animationId, clip);
        entry.duration = duration;
        entry.clip = clip;
      } catch (err) {
        this._log('animation_error', `Failed to compile clip: ${err.message}`);
        return;
      }
    }

    this.animationManager.play(animationId, entry.clip);
  }

  pauseAnimation() {
    this.animationManager.pause();
    this.stateMachine.transition(AvatarState.PAUSED);
  }

  resumeAnimation() {
    this.animationManager.resume();
    this.stateMachine.transition(AvatarState.PLAYING);
  }

  stopAnimation() {
    this.animationManager.stop();
    this.stateMachine.transition(AvatarState.IDLE);
  }

  resetAnimation() {
    this.animationManager.reset();
    this.stateMachine.transition(AvatarState.IDLE);
  }

  setSpeed(speed) {
    this.animationManager.setSpeed(speed);
  }

  setLoop(loop) {
    this.animationManager.setLoop(loop);
  }

  // ─── COMMAND ─────────────────────────────────────────────

  /**
   * Execute an AvatarCommand.
   * This is the ONLY way external systems (RuleEngine) talk to the engine.
   * 
   * @param {{ type: string, animationId?: string, expression?: string, weight?: number }} command
   */
  executeCommand(command) {
    this._log('avatar_command', `Command: ${command.type} ${command.animationId || command.expression || ''}`);

    switch (command.type) {
      case 'PLAY_ANIMATION': {
        // Try to find animation by ID first, then by name
        let entry = this.animationRegistry.get(command.animationId);
        if (!entry) {
          // Try finding by name
          const found = this.animationRegistry.findByName(command.animationId);
          if (found) {
            entry = this.animationRegistry.get(found.id);
            command.animationId = found.id;
          }
        }
        if (entry) {
          this.playAnimation(command.animationId);
        } else {
          this._log('command_error', `Animation not found for command: ${command.animationId}`);
        }
        break;
      }
      case 'STOP':
        this.stopAnimation();
        break;
      case 'PAUSE':
        this.pauseAnimation();
        break;
      case 'RESUME':
        this.resumeAnimation();
        break;
      case 'SET_EXPRESSION':
        this.expression.setExpression(command.expression, command.weight ?? 1.0);
        break;
      case 'RESET_EXPRESSION':
        this.expression.resetAll();
        break;
      default:
        this._log('command_error', `Unknown command type: ${command.type}`);
    }
  }

  // ─── STATE ───────────────────────────────────────────────

  /**
   * Get full engine state.
   */
  getState() {
    const progress = this.animationManager.getProgress();
    return {
      avatarState: this.stateMachine.current,
      vrmName: this._vrmName,
      vrmLoaded: !!this._vrm,
      animationState: this.animationManager.state,
      currentAnimation: this.animationManager.currentAnimationId,
      progress: progress ? progress.currentTime : 0,
      totalDuration: progress ? progress.totalTime : 0,
      percentage: progress ? progress.percentage : 0,
      fps: this.runtime.fps,
      speed: this.animationManager.speed,
      loop: this.animationManager.loop,
      animations: this.animationRegistry.getAll(),
    };
  }

  get vrm() {
    return this._vrm;
  }

  get vrmName() {
    return this._vrmName;
  }

  // ─── EVENTS ──────────────────────────────────────────────

  onStateChange(callback) { this._onStateChange = callback; }
  onFpsUpdate(callback) { this._onFpsUpdate = callback; }
  onAnimationEvent(callback) { this._onAnimationEvent = callback; }
  onLog(callback) { this._onLog = callback; }

  // ─── INTERNAL ────────────────────────────────────────────

  /**
   * After a VRM is loaded, compile AnimationClips for all pending VRMA entries.
   * This allows VRMA files imported BEFORE VRM to work automatically.
   */
  _bindAllAnimations() {
    if (!this._vrm) return;
    let bound = 0;
    for (const summary of this.animationRegistry.getAll()) {
      const entry = this.animationRegistry.get(summary.id);
      if (!entry || entry.ready || !entry.vrmAnimation) continue;
      try {
        const { clip, duration } = this.animationLoader.createClip(entry.vrmAnimation, this._vrm);
        this.animationRegistry.bindClip(summary.id, clip);
        entry.duration = duration;
        bound++;
      } catch (err) {
        this._log('animation_error', `Bind clip failed for ${entry.name}: ${err.message}`);
      }
    }
    if (bound > 0) {
      this._log('animation_loaded', `Đã bind ${bound} animation(s) với VRM mới`);
    }
  }

  _guessCategory(name) {
    const lower = name.toLowerCase();
    if (lower.includes('dance') || lower.includes('nhảy')) return 'dance';
    if (lower.includes('animation') || lower.includes('anim')) return 'animation';
    if (lower.includes('special') || lower.includes('ultra')) return 'special';
    return 'dance';
  }

  _log(type, message) {
    const entry = {
      timestamp: Date.now(),
      time: new Date().toLocaleTimeString('vi-VN'),
      type,
      message,
    };
    if (this._onLog) this._onLog(entry);
  }

  // ─── CLEANUP ─────────────────────────────────────────────

  dispose() {
    this.unloadVRM();
    this.animationRegistry.clear();
    this.animationManager.dispose();
    this.expression.unbind();
    this.camera.dispose();
    this.runtime.dispose();
    this._log('engine_disposed', 'Avatar Engine disposed');
  }
}
