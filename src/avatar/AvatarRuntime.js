import * as THREE from 'three';
import { VRMUtils } from '@pixiv/three-vrm';

/**
 * AvatarRuntime — Manages the Three.js lifecycle.
 * 
 * Owns: Scene, WebGLRenderer, Clock, render loop.
 * Does NOT own: Camera (CameraManager), VRM (VRMLoader), Animations (AnimationManager).
 * 
 * Performance rules:
 * - Scene, Renderer created ONCE in init()
 * - Render loop via requestAnimationFrame (not setInterval)
 * - FPS counter updates every 250ms (not every frame)
 * - No DOM manipulation in render loop
 */
export class AvatarRuntime {
  constructor() {
    /** @type {THREE.Scene} */
    this.scene = null;
    /** @type {THREE.WebGLRenderer} */
    this.renderer = null;
    /** @type {THREE.Clock} */
    this.clock = null;
    /** @type {HTMLElement} */
    this.container = null;
    /** @type {number} */
    this._rafId = null;
    /** @type {boolean} */
    this._running = false;

    // FPS tracking (updates every 250ms)
    this._frameCount = 0;
    this._fpsTime = 0;
    this._fps = 0;
    this._fpsCallback = null;

    // Update callbacks — called every frame with delta
    this._updateCallbacks = [];
  }

  /**
   * Initialize the Three.js runtime and mount into a DOM container.
   * @param {HTMLElement} container
   */
  init(container) {
    if (this.renderer) {
      console.warn('[AvatarRuntime] Already initialized');
      return;
    }

    this.container = container;

    // Scene
    this.scene = new THREE.Scene();

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = false; // perf: no shadows for VTuber

    // Size
    const { width, height } = this._getSize();
    this.renderer.setSize(width, height);

    // Mount canvas
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';

    // Clock
    this.clock = new THREE.Clock();

    // Lighting
    this._setupLighting();

    // Background
    this._setupBackground();

    // Resize observer
    this._resizeObserver = new ResizeObserver(() => this.resize());
    this._resizeObserver.observe(container);

    // Start loop
    this._running = true;
    this._loop();
  }

  /**
   * Premium dark lighting setup: ambient + key + fill + rim.
   */
  _setupLighting() {
    // Ambient — soft base
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    // Key light — warm from top-right
    const keyLight = new THREE.DirectionalLight(0xfff0e6, 1.2);
    keyLight.position.set(2, 3, 2);
    this.scene.add(keyLight);

    // Fill light — cool from left
    const fillLight = new THREE.DirectionalLight(0xe6f0ff, 0.4);
    fillLight.position.set(-2, 1, 1);
    this.scene.add(fillLight);

    // Rim light — magenta accent from behind
    const rimLight = new THREE.DirectionalLight(0xe91e8c, 0.3);
    rimLight.position.set(0, 2, -3);
    this.scene.add(rimLight);

    // Bottom fill — subtle purple
    const bottomLight = new THREE.DirectionalLight(0x7c3aed, 0.15);
    bottomLight.position.set(0, -1, 1);
    this.scene.add(bottomLight);
  }

  /**
   * Dark premium background gradient.
   */
  _setupBackground() {
    // Dark transparent background — container CSS handles the gradient
    this.scene.background = null;
  }

  /**
   * Render loop — requestAnimationFrame.
   */
  _loop() {
    if (!this._running) return;

    this._rafId = requestAnimationFrame(() => this._loop());

    const delta = this.clock.getDelta();

    // Update all registered callbacks (VRM spring bones, mixer, etc.)
    for (const cb of this._updateCallbacks) {
      cb(delta);
    }

    // FPS counter
    this._frameCount++;
    this._fpsTime += delta;
    if (this._fpsTime >= 0.25) {
      this._fps = Math.round(this._frameCount / this._fpsTime);
      this._frameCount = 0;
      this._fpsTime = 0;
      if (this._fpsCallback) this._fpsCallback(this._fps);
    }

    // Render — needs a camera (provided externally)
    if (this._camera) {
      this.renderer.render(this.scene, this._camera);
    }
  }

  /**
   * Set the active camera for rendering.
   * @param {THREE.Camera} camera
   */
  setCamera(camera) {
    this._camera = camera;
  }

  /**
   * Register an update callback to be called every frame.
   * @param {Function} callback - receives delta time
   * @returns {Function} unsubscribe
   */
  onUpdate(callback) {
    this._updateCallbacks.push(callback);
    return () => {
      this._updateCallbacks = this._updateCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Register FPS change callback (called every 250ms).
   * @param {Function} callback
   */
  onFpsUpdate(callback) {
    this._fpsCallback = callback;
  }

  /**
   * Handle container resize.
   */
  resize() {
    if (!this.renderer || !this.container) return;
    const { width, height } = this._getSize();
    this.renderer.setSize(width, height);
    if (this._camera && this._camera.isPerspectiveCamera) {
      this._camera.aspect = width / height;
      this._camera.updateProjectionMatrix();
    }
  }

  _getSize() {
    return {
      width: this.container.clientWidth || 300,
      height: this.container.clientHeight || 400,
    };
  }

  /**
   * Get current FPS.
   */
  get fps() {
    return this._fps;
  }

  /**
   * Cleanup everything.
   */
  dispose() {
    this._running = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    this._updateCallbacks = [];
    this._fpsCallback = null;

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement?.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.renderer = null;
    }

    if (this.scene) {
      this.scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      this.scene = null;
    }

    this.clock = null;
    this._camera = null;
    this.container = null;
  }
}
