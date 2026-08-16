import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';

/**
 * AnimationLoader — Two-phase VRMA loading.
 *
 * Phase 1 (no VRM needed):
 *   loadRaw(file) → { vrmAnimation, name, fileName }
 *   Can be called anytime. Stores raw animation data.
 *
 * Phase 2 (VRM required):
 *   createClip(vrmAnimation, vrm) → AnimationClip
 *   Called when VRM is available and play is requested.
 */
export class AnimationLoader {
  constructor() {
    this._loader = new GLTFLoader();
    this._loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
  }

  /**
   * Validate a VRMA File.
   */
  validate(file) {
    if (!file) return { valid: false, error: 'Không có file được chọn.' };
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'vrma') return { valid: false, error: `File không hợp lệ: .${ext}. Chỉ chấp nhận .vrma` };
    if (file.size > 50 * 1024 * 1024) return { valid: false, error: `File quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Tối đa 50MB.` };
    if (file.size === 0) return { valid: false, error: 'File rỗng.' };
    return { valid: true };
  }

  /**
   * Phase 1: Load VRMA file WITHOUT needing a VRM.
   * Returns raw VRMAnimation object that can be stored in registry.
   *
   * @param {File} file
   * @param {Function} [onProgress]
   * @returns {Promise<{ vrmAnimation: object, name: string, fileName: string }>}
   */
  async loadRaw(file, onProgress) {
    const check = this.validate(file);
    if (!check.valid) throw new Error(check.error);

    const arrayBuffer = await file.arrayBuffer();
    const url = URL.createObjectURL(new Blob([arrayBuffer]));

    try {
      const gltf = await new Promise((resolve, reject) => {
        this._loader.load(
          url,
          resolve,
          (p) => { if (onProgress && p.total > 0) onProgress(Math.round(p.loaded / p.total * 100)); },
          reject
        );
      });

      const vrmAnimations = gltf.userData.vrmAnimations;
      if (!vrmAnimations || vrmAnimations.length === 0) {
        throw new Error('File VRMA không hợp lệ: không tìm thấy dữ liệu animation.');
      }

      const vrmAnimation = vrmAnimations[0];
      const name = file.name.replace(/\.vrma$/i, '');

      return { vrmAnimation, name, fileName: file.name };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Phase 2: Create an AnimationClip from a stored VRMAnimation + a loaded VRM.
   * Call this when VRM becomes available or when play is requested.
   *
   * @param {object} vrmAnimation — from loadRaw()
   * @param {import('@pixiv/three-vrm').VRM} vrm
   * @returns {{ clip: THREE.AnimationClip, duration: number }}
   */
  createClip(vrmAnimation, vrm) {
    const clip = createVRMAnimationClip(vrmAnimation, vrm);
    return { clip, duration: clip.duration };
  }

  /**
   * Legacy: Load VRMA and immediately create clip (requires VRM).
   * Kept for backward compatibility.
   *
   * @param {File} file
   * @param {import('@pixiv/three-vrm').VRM} vrm
   * @param {Function} [onProgress]
   */
  async load(file, vrm, onProgress) {
    const { vrmAnimation, name, fileName } = await this.loadRaw(file, onProgress);
    const { clip, duration } = this.createClip(vrmAnimation, vrm);
    return { clip, name, fileName, duration };
  }
}
