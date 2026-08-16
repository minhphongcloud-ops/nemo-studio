import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

/**
 * VRMLoader — Load and validate VRM files.
 * 
 * Flow:
 * 1. Validate file (check extension, size)
 * 2. Load via GLTFLoader + VRMLoaderPlugin
 * 3. Optimize VRM (combine bones, rotate)
 * 4. Return VRM instance
 */
export class VRMLoader {
  constructor() {
    this._loader = new GLTFLoader();
    this._loader.register((parser) => new VRMLoaderPlugin(parser));
  }

  /**
   * Validate a File object before loading.
   * @param {File} file
   * @returns {{ valid: boolean, error?: string }}
   */
  validate(file) {
    if (!file) {
      return { valid: false, error: 'Không có file được chọn.' };
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'vrm') {
      return { valid: false, error: `File không hợp lệ: .${ext}. Chỉ chấp nhận .vrm` };
    }

    // Max 100MB
    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { valid: false, error: `File quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Tối đa 100MB.` };
    }

    if (file.size === 0) {
      return { valid: false, error: 'File rỗng.' };
    }

    return { valid: true };
  }

  /**
   * Load a VRM file.
   * @param {File} file
   * @param {Function} onProgress — (percent: number) => void
   * @returns {Promise<{ vrm: import('@pixiv/three-vrm').VRM, name: string }>}
   */
  async load(file, onProgress) {
    // Validate
    const check = this.validate(file);
    if (!check.valid) {
      throw new Error(check.error);
    }

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer]);
    const url = URL.createObjectURL(blob);

    try {
      const gltf = await new Promise((resolve, reject) => {
        this._loader.load(
          url,
          (gltf) => resolve(gltf),
          (progress) => {
            if (onProgress && progress.total > 0) {
              onProgress(Math.round((progress.loaded / progress.total) * 100));
            }
          },
          (error) => reject(error)
        );
      });

      const vrm = gltf.userData.vrm;
      if (!vrm) {
        throw new Error('File VRM không hợp lệ: không tìm thấy dữ liệu VRM.');
      }

      // Optimize
      VRMUtils.removeUnnecessaryVertices(gltf.scene);
      VRMUtils.combineSkeletons(gltf.scene);

      // VRM is loaded facing +Z, rotate to face camera (-Z)
      VRMUtils.rotateVRM0(vrm);

      // Extract name from metadata or filename
      const name = vrm.meta?.name || file.name.replace(/\.vrm$/i, '') || 'Avatar';

      return { vrm, name };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Setup a loaded VRM in the scene.
   * Centers it at origin and returns bounding info.
   * @param {import('@pixiv/three-vrm').VRM} vrm
   * @param {THREE.Scene} scene
   */
  setupInScene(vrm, scene) {
    // Add to scene
    scene.add(vrm.scene);

    // Center at origin — compute bounding box and adjust Y
    const box = new THREE.Box3().setFromObject(vrm.scene);
    const center = box.getCenter(new THREE.Vector3());

    // Move so feet are at Y=0
    vrm.scene.position.x = -center.x;
    vrm.scene.position.y = -box.min.y;
    vrm.scene.position.z = -center.z;

    // Return info
    const size = box.getSize(new THREE.Vector3());
    return {
      height: size.y,
      width: size.x,
      center: new THREE.Vector3(0, size.y / 2, 0),
    };
  }

  /**
   * Remove a VRM from scene and dispose.
   * @param {import('@pixiv/three-vrm').VRM} vrm
   * @param {THREE.Scene} scene
   */
  removeFromScene(vrm, scene) {
    if (!vrm || !scene) return;
    scene.remove(vrm.scene);
    VRMUtils.deepDispose(vrm.scene);
  }
}
