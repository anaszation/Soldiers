import * as THREE from 'three';
import { PlayerColor } from './types';

export class PaperFoldEngine {
  public mesh: THREE.Mesh;
  public geometry: THREE.PlaneGeometry;
  private originalPositions: Float32Array;

  public readonly WIDTH = 0.297;  // A4 proportion in meters (297mm)
  public readonly HEIGHT = 0.210; // 210mm
  public readonly SEGMENTS_X = 54;
  public readonly SEGMENTS_Y = 36;

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

    // Save initial flat vertex positions for deformation reference
    this.originalPositions = new Float32Array(this.geometry.attributes.position.array);

    const material = new THREE.MeshStandardMaterial({
      map: paperTexture,
      roughness: 0.85,
      metalness: 0.0,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.position.set(0, 0, 0.002); // 2mm above wooden desk surface
  }

  /**
   * Start 3D Paper Fold Animation
   * @param player Which player is folding their half over
   * @param onContact Called when paper reaches 180 contact with table
   * @param onComplete Called when paper unfolds back to flat
   */
  public triggerFold(
    player: PlayerColor,
    onContact: () => void,
    onComplete: () => void
  ) {
    if (this.isFolding) return;

    this.foldingPlayer = player;
    this.isFolding = true;
    this.foldProgress = 0;
    this.foldDirection = 1; // Fold in
    this.contactTriggered = false;
    this.onContactCallback = onContact;
    this.onCompleteCallback = onComplete;
  }

  /**
   * Update paper vertex curl deformation in the render loop
   */
  public update(deltaSeconds: number) {
    if (!this.isFolding) return;

    // Fold speed: ~0.8s fold in, pause at contact, ~0.6s unfold
    const foldSpeed = 1.35;
    this.foldProgress += this.foldDirection * foldSpeed * deltaSeconds;

    // Contact threshold at peak fold (t = 1.0)
    if (this.foldDirection === 1 && this.foldProgress >= 1.0) {
      this.foldProgress = 1.0;
      if (!this.contactTriggered) {
        this.contactTriggered = true;
        if (this.onContactCallback) this.onContactCallback();
      }
      // Start unfolding back after brief contact press
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

    // Apply vertex deformation
    this.applyFoldDeformation(this.foldProgress, this.foldingPlayer);
  }

  private applyFoldDeformation(progress: number, player: PlayerColor) {
    const pos = this.geometry.attributes.position;
    const orig = this.originalPositions;
    const vertexCount = pos.count;

    // Smooth ease-in-out curve for natural physical paper hinge
    const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI);
    const angle = ease * Math.PI; // 0 to 180 degrees (PI radians)

    const isBlue = player === 'blue';
    // Blue folds from left (x < 0) to right (x > 0)
    // Red folds from right (x > 0) to left (x < 0)

    for (let i = 0; i < vertexCount; i++) {
      const idx = i * 3;
      const origX = orig[idx];
      const origY = orig[idx + 1];
      const origZ = orig[idx + 2];

      const isFoldingVertex = isBlue ? origX < 0 : origX > 0;

      if (isFoldingVertex) {
        const distFromCrease = Math.abs(origX);
        const normDist = distFromCrease / (this.WIDTH / 2);

        // Natural curved bend (arch effect)
        const archFactor = Math.sin(progress * Math.PI) * 0.045 * normDist;

        if (isBlue) {
          // Blue: x moves from -dist to +dist
          pos.array[idx] = -distFromCrease * Math.cos(angle);
          pos.array[idx + 1] = origY;
          pos.array[idx + 2] = distFromCrease * Math.sin(angle) + archFactor;
        } else {
          // Red: x moves from +dist to -dist
          pos.array[idx] = distFromCrease * Math.cos(angle);
          pos.array[idx + 1] = origY;
          pos.array[idx + 2] = distFromCrease * Math.sin(angle) + archFactor;
        }
      } else {
        // Static half remains flat on desk with subtle sympathetic vibration
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
