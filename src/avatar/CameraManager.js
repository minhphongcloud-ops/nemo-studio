import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * CameraManager — Manages PerspectiveCamera + OrbitControls.
 * 
 * Features:
 * - Auto-frame: positions camera to show full VRM body
 * - Orbit/zoom/pan
 * - Lock mode (for LIVE)
 */
export class CameraManager {
  constructor() {
    /** @type {THREE.PerspectiveCamera} */
    this.camera = null;
    /** @type {OrbitControls} */
    this.controls = null;
    this._locked = false;
  }

  /**
   * Initialize camera and controls.
   * @param {HTMLCanvasElement} canvas — renderer's DOM element
   * @param {number} aspect — width/height
   */
  init(canvas, aspect) {
    this.camera = new THREE.PerspectiveCamera(30, aspect, 0.1, 100);
    this.camera.position.set(0, 1.2, 3.5);
    this.camera.lookAt(0, 1, 0);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(0, 1, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 10;
    this.controls.maxPolarAngle = Math.PI * 0.85;
    this.controls.minPolarAngle = Math.PI * 0.1;
    this.controls.update();
  }

  /**
   * Auto-frame camera to show full VRM body.
   * Calculates bounding box of the VRM and positions camera accordingly.
   * @param {THREE.Object3D} vrmScene — VRM scene/root
   */
  autoFrame(vrmScene) {
    if (!this.camera || !vrmScene) return;

    const box = new THREE.Box3().setFromObject(vrmScene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Target = center of body, slightly above midpoint
    const targetY = center.y;
    this.controls.target.set(0, targetY, 0);

    // Distance based on height — show full body with some padding
    const fov = this.camera.fov * (Math.PI / 180);
    const maxDim = Math.max(size.x, size.y, size.z);
    let distance = (maxDim / 2) / Math.tan(fov / 2);
    distance *= 1.3; // padding

    this.camera.position.set(0, targetY, distance);
    this.camera.lookAt(0, targetY, 0);

    this.controls.update();
  }

  /**
   * Update controls (call each frame if damping enabled).
   */
  update() {
    if (this.controls && !this._locked) {
      this.controls.update();
    }
  }

  /**
   * Lock/unlock orbit controls.
   */
  lock() {
    this._locked = true;
    if (this.controls) this.controls.enabled = false;
  }

  unlock() {
    this._locked = false;
    if (this.controls) this.controls.enabled = true;
  }

  get isLocked() {
    return this._locked;
  }

  /**
   * Update aspect ratio.
   */
  setAspect(aspect) {
    if (this.camera) {
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
    }
  }

  dispose() {
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }
    this.camera = null;
  }
}
