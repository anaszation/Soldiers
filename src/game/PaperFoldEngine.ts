import * as THREE from 'three';
import { PlayerColor } from './types';

export class PaperFoldEngine {
  public mesh: THREE.Mesh;
  public geometry: THREE.PlaneGeometry;
  private originalPositions: Float32Array;

  public readonly WIDTH = 0.297;  // A4 proportion in meters (297mm)
  public readonly HEIGHT = 0.210; // 210mm
  public readonly SEGMENTS_X = 64; // High density for smooth organic paper flex
  public readonly SEGMENTS_Y = 48;

  // Animation state
  public isFolding: boolean = false;
  private foldProgress: number = 0; // 0 to 1
  private foldDirection: 1 | -1 = 1; // 1 = folding forward, -1 = unfolding
  private foldingPlayer: PlayerColor = 'blue';
  private onContactCallback?: () => void;
  private onCompleteCallback?: () => void;
  private contactTriggered: boolean = false;

  constructor(paperTexture: THREE.CanvasTexture) {
    this.geometry = new THREE.PlaneGeometry(
      this.WIDTH,
      this.HEIGHT,
      this.SEGMENTS_X,
      this.SEGMENTS_Y
    );

    this.originalPositions = new Float32Array(this.geometry.attributes.position.array);

    const material = new THREE.MeshStandardMaterial({
      map: paperTexture,
      roughness: 0.88,
      metalness: 0.0,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.position.set(0, 0, 0.002);
  }

  public triggerFold(
    player: PlayerColor,
    onContact: () => void,
    onComplete: () => void
  ) {
    if (this.isFolding) return;

    this.foldingPlayer = player;
    this.isFolding = true;
    this.foldProgress = 0;
    this.foldDirection = 1;
    this.contactTriggered = false;
    this.onContactCallback = onContact;
    this.onCompleteCallback = onComplete;
  }

  public update(deltaSeconds: number) {
    if (!this.isFolding) return;

    // Organic speed: ease into the fold, crisp press, smooth unfold
    const foldSpeed = 1.25;
    this.foldProgress += this.foldDirection * foldSpeed * deltaSeconds;

    // Contact threshold at peak fold (t = 1.0)
    if (this.foldDirection === 1 && this.foldProgress >= 1.0) {
      this.foldProgress = 1.0;
      if (!this.contactTriggered) {
        this.contactTriggered = true;
        if (this.onContactCallback) this.onContactCallback();
      }
      this.foldDirection = -1;
    }

    // Unfold completion (t = 0.0)
    if (this.foldDirection === -1 && this.foldProgress <= 0.0) {
      this.foldProgress = 0.0;
      this.isFolding = false;
      this.resetToFlat();
      if (this.onCompleteCallback) this.onCompleteCallback();
      return;
    }

    // Apply organic non-linear paper curl deformation
    this.applyOrganicPaperFold(this.foldProgress, this.foldingPlayer);
  }

  /**
   * Organic 3D Non-linear Paper Curl Deformation
   * Simulates real paper flexibility: arching curvature, rolling bend, and corner flex
   */
  private applyOrganicPaperFold(progress: number, player: PlayerColor) {
    const pos = this.geometry.attributes.position;
    const orig = this.originalPositions;
    const vertexCount = pos.count;

    // Smooth sinusoidal ease
    const p = Math.max(0, Math.min(1, progress));
    const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);
    const angle = ease * Math.PI;

    const isBlue = player === 'blue';
    const halfWidth = this.WIDTH / 2;
    const halfHeight = this.HEIGHT / 2;

    for (let i = 0; i < vertexCount; i++) {
      const idx = i * 3;
      const origX = orig[idx];
      const origY = orig[idx + 1];
      const origZ = orig[idx + 2];

      const isFoldingVertex = isBlue ? origX < 0 : origX > 0;

      if (isFoldingVertex) {
        const distFromCrease = Math.abs(origX);
        const u = distFromCrease / halfWidth; // 0 (crease) to 1 (outer edge)
        const v = Math.abs(origY) / halfHeight; // 0 (center Y) to 1 (top/bottom corners)

        // 1. Organic Arch Height: High flex loop in the middle of the sheet
        const flexWave = Math.sin(p * Math.PI);
        const archLoop = flexWave * (0.075 * Math.sin(u * Math.PI) + 0.035 * Math.sin(u * Math.PI * 0.5));

        // 2. Corner curl: Corners roll slightly faster than the middle edge
        const cornerRoll = flexWave * (v * v * 0.015);

        // 3. Horizontal arc compression: Paper forms a continuous cylinder curve
        const horizontalCurl = flexWave * Math.sin(u * Math.PI) * 0.032;

        if (isBlue) {
          // Blue folds left to right
          const targetX = -distFromCrease * Math.cos(angle) + horizontalCurl;
          const targetZ = distFromCrease * Math.sin(angle) + archLoop + cornerRoll;

          pos.array[idx] = targetX;
          pos.array[idx + 1] = origY;
          pos.array[idx + 2] = Math.max(0.001, targetZ);
        } else {
          // Red folds right to left
          const targetX = distFromCrease * Math.cos(angle) - horizontalCurl;
          const targetZ = distFromCrease * Math.sin(angle) + archLoop + cornerRoll;

          pos.array[idx] = targetX;
          pos.array[idx + 1] = origY;
          pos.array[idx + 2] = Math.max(0.001, targetZ);
        }
      } else {
        // Subtle contact wave on the receiving half
        pos.array[idx] = origX;
        pos.array[idx + 1] = origY;
        pos.array[idx + 2] = origZ;
      }
    }

    pos.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  private resetToFlat() {
    const pos = this.geometry.attributes.position;
    pos.array.set(this.originalPositions);
    pos.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }
}
