import * as THREE from 'three';
import { PlayerColor } from './types';

export class PaperFoldEngine {
  public rootGroup: THREE.Group;
  public mesh: THREE.Mesh; // For raycasting backwards compatibility
  public geometry: THREE.PlaneGeometry;
  private backGeometry: THREE.PlaneGeometry;
  private originalPositions: Float32Array;

  public readonly WIDTH = 0.297;  // A4 proportion in meters (297mm)
  public readonly HEIGHT = 0.210; // 210mm
  public readonly SEGMENTS_X = 64;
  public readonly SEGMENTS_Y = 48;

  // Animation timeline state
  public isFolding: boolean = false;
  private animTime: number = 0; // in seconds
  private readonly TOTAL_DURATION = 1.50; // Total fold cycle: 0.5s curl + 0.45s rub + 0.55s unfold
  private foldingPlayer: PlayerColor = 'blue';

  private onContactCallback?: () => void;
  private onCompleteCallback?: () => void;
  private contactTriggered: boolean = false;

  constructor(frontTexture: THREE.CanvasTexture, backTexture: THREE.CanvasTexture) {
    this.rootGroup = new THREE.Group();
    this.rootGroup.position.set(0, 0, 0.002);

    this.geometry = new THREE.PlaneGeometry(
      this.WIDTH,
      this.HEIGHT,
      this.SEGMENTS_X,
      this.SEGMENTS_Y
    );

    this.backGeometry = new THREE.PlaneGeometry(
      this.WIDTH,
      this.HEIGHT,
      this.SEGMENTS_X,
      this.SEGMENTS_Y
    );

    this.originalPositions = new Float32Array(this.geometry.attributes.position.array);

    // Front Material: Only renders on front faces (active field with doodles)
    const frontMat = new THREE.MeshStandardMaterial({
      map: frontTexture,
      roughness: 0.88,
      metalness: 0.0,
      side: THREE.FrontSide,
    });

    // Back Material: Only renders on back faces (clean blank back of sheet with faint grid)
    const backMat = new THREE.MeshStandardMaterial({
      map: backTexture,
      roughness: 0.88,
      metalness: 0.0,
      side: THREE.BackSide,
    });

    const frontMesh = new THREE.Mesh(this.geometry, frontMat);
    frontMesh.castShadow = true;
    frontMesh.receiveShadow = true;

    const backMesh = new THREE.Mesh(this.backGeometry, backMat);
    backMesh.castShadow = true;
    backMesh.receiveShadow = true;

    this.mesh = frontMesh; // Exposed for raycasting

    this.rootGroup.add(frontMesh);
    this.rootGroup.add(backMesh);
  }

  public triggerFold(
    player: PlayerColor,
    onContact: () => void,
    onComplete: () => void
  ) {
    if (this.isFolding) return;

    this.foldingPlayer = player;
    this.isFolding = true;
    this.animTime = 0;
    this.contactTriggered = false;
    this.onContactCallback = onContact;
    this.onCompleteCallback = onComplete;
  }

  public update(deltaSeconds: number) {
    if (!this.isFolding) return;

    this.animTime += deltaSeconds;
    const progress = Math.min(1.0, this.animTime / this.TOTAL_DURATION);

    // Three distinct physical phases:
    // 1. Curl Over: 0.00 -> 0.38 (Paper curves up and arcs across the crease)
    // 2. Flush Contact & Rub: 0.38 -> 0.64 (Paper slaps flat and rubs to transfer ink)
    // 3. Peel & Open: 0.64 -> 1.00 (Paper peels back up and opens flat)

    if (progress >= 0.38 && !this.contactTriggered) {
      this.contactTriggered = true;
      if (this.onContactCallback) this.onContactCallback();
    }

    if (progress >= 1.0) {
      this.isFolding = false;
      this.resetToFlat();
      if (this.onCompleteCallback) this.onCompleteCallback();
      return;
    }

    this.applyPhysicalPaperFold(progress, this.foldingPlayer);
  }

  /**
   * Realistic Physical Fold: Curving roll, flush flat press with rub vibration, and smooth peel
   */
  private applyPhysicalPaperFold(t: number, player: PlayerColor) {
    const posFront = this.geometry.attributes.position;
    const posBack = this.backGeometry.attributes.position;
    const orig = this.originalPositions;
    const vertexCount = posFront.count;

    const isBlue = player === 'blue';
    const halfWidth = this.WIDTH / 2;
    const halfHeight = this.HEIGHT / 2;

    // Calculate effective fold rotation angle (0 to 180 degrees)
    let foldAngle = 0;
    let archIntensity = 0;
    let rubRipple = 0;

    if (t < 0.38) {
      // Phase 1: Curving over (0 to 180 deg)
      const p = t / 0.38;
      const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);
      foldAngle = ease * Math.PI;
      archIntensity = Math.sin(p * Math.PI);
    } else if (t < 0.64) {
      // Phase 2: FLUSH FLAT CONTACT & RUB
      foldAngle = Math.PI; // Exactly 180 degrees (flat on top of other half)
      archIntensity = 0.0;
      // High-frequency micro ripple of thumb rubbing the paper
      const rubP = (t - 0.38) / 0.26;
      rubRipple = Math.sin(rubP * Math.PI * 16) * 0.0006;
    } else {
      // Phase 3: Peeling open (180 to 0 deg)
      const p = (t - 0.64) / 0.36;
      const ease = 0.5 - 0.5 * Math.cos((1 - p) * Math.PI);
      foldAngle = ease * Math.PI;
      archIntensity = Math.sin((1 - p) * Math.PI) * 0.85;
    }

    for (let i = 0; i < vertexCount; i++) {
      const idx = i * 3;
      const origX = orig[idx];
      const origY = orig[idx + 1];

      const isFoldingVertex = isBlue ? origX < 0 : origX > 0;

      if (isFoldingVertex) {
        const distFromCrease = Math.abs(origX);
        const u = distFromCrease / halfWidth; // 0 (crease) to 1 (outer edge)
        const v = Math.abs(origY) / halfHeight;

        // Realistic cylindrical flex loop
        const archLoop = archIntensity * (0.075 * Math.sin(u * Math.PI) + 0.025 * Math.sin(u * Math.PI * 0.5));
        const cornerRoll = archIntensity * (v * v * 0.012);
        const horizontalCurl = archIntensity * Math.sin(u * Math.PI) * 0.028;

        if (isBlue) {
          // Blue folds left to right
          const targetX = -distFromCrease * Math.cos(foldAngle) + (foldAngle < Math.PI * 0.98 ? horizontalCurl : 0);
          const targetZ = distFromCrease * Math.sin(foldAngle) + archLoop + cornerRoll + rubRipple;

          // Front Mesh vertex
          posFront.array[idx] = targetX;
          posFront.array[idx + 1] = origY;
          posFront.array[idx + 2] = Math.max(0.0008, targetZ);

          // Back Mesh vertex
          posBack.array[idx] = targetX;
          posBack.array[idx + 1] = origY;
          posBack.array[idx + 2] = Math.max(0.0007, targetZ - 0.0001);
        } else {
          // Red folds right to left
          const targetX = distFromCrease * Math.cos(foldAngle) - (foldAngle < Math.PI * 0.98 ? horizontalCurl : 0);
          const targetZ = distFromCrease * Math.sin(foldAngle) + archLoop + cornerRoll + rubRipple;

          posFront.array[idx] = targetX;
          posFront.array[idx + 1] = origY;
          posFront.array[idx + 2] = Math.max(0.0008, targetZ);

          posBack.array[idx] = targetX;
          posBack.array[idx + 1] = origY;
          posBack.array[idx + 2] = Math.max(0.0007, targetZ - 0.0001);
        }
      } else {
        // Static receiving half
        posFront.array[idx] = origX;
        posFront.array[idx + 1] = origY;
        posFront.array[idx + 2] = 0;

        posBack.array[idx] = origX;
        posBack.array[idx + 1] = origY;
        posBack.array[idx + 2] = -0.0001;
      }
    }

    posFront.needsUpdate = true;
    posBack.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.backGeometry.computeVertexNormals();
  }

  private resetToFlat() {
    const posFront = this.geometry.attributes.position;
    const posBack = this.backGeometry.attributes.position;
    posFront.array.set(this.originalPositions);
    posBack.array.set(this.originalPositions);
    posFront.needsUpdate = true;
    posBack.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.backGeometry.computeVertexNormals();
  }
}
