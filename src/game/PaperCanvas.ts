import * as THREE from 'three';
import { Soldier, StrikeRecord, PlayerColor, GamePhase } from './types';

export class PaperCanvas {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public texture: THREE.CanvasTexture;

  public readonly WIDTH = 1000;
  public readonly HEIGHT = 700;
  public readonly CREASE_X = 500;

  // Cached SVG image elements
  private spriteImages: Map<string, HTMLImageElement> = new Map();
  private hitCrossoutImg: HTMLImageElement | null = null;
  private missSmudgeImg: HTMLImageElement | null = null;
  private imagesLoaded: boolean = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.WIDTH;
    this.canvas.height = this.HEIGHT;
    this.ctx = this.canvas.getContext('2d')!;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.generateMipmaps = true;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.colorSpace = THREE.SRGBColorSpace;

    this.preloadImages();
    this.render([], [], 'DEPLOY_BLUE', 'blue', null);
  }

  private preloadImages() {
    const soldiers = [
      'rifleman', 'bazooka', 'sniper', 'tank', 'commander',
      'scout', 'machinegun', 'mortar', 'radio', 'bunker'
    ];
    let loadedCount = 0;
    const totalCount = soldiers.length * 2 + 2;

    const onLoaded = () => {
      loadedCount++;
      if (loadedCount >= totalCount) {
        this.imagesLoaded = true;
        this.texture.needsUpdate = true;
      }
    };

    soldiers.forEach(type => {
      // Blue
      const imgBlue = new Image();
      imgBlue.src = `/doodles/soldier_${type}_blue.svg`;
      imgBlue.onload = onLoaded;
      this.spriteImages.set(`soldier_${type}_blue`, imgBlue);

      // Red
      const imgRed = new Image();
      imgRed.src = `/doodles/soldier_${type}_red.svg`;
      imgRed.onload = onLoaded;
      this.spriteImages.set(`soldier_${type}_red`, imgRed);
    });

    this.hitCrossoutImg = new Image();
    this.hitCrossoutImg.src = '/doodles/ink_hit_crossout.svg';
    this.hitCrossoutImg.onload = onLoaded;

    this.missSmudgeImg = new Image();
    this.missSmudgeImg.src = '/doodles/ink_miss_smudge.svg';
    this.missSmudgeImg.onload = onLoaded;
  }

  public uvToCanvasCoords(u: number, v: number): { x: number; y: number } {
    return {
      x: Math.round(u * this.WIDTH),
      y: Math.round((1 - v) * this.HEIGHT),
    };
  }

  public canvasToUVCoords(x: number, y: number): { u: number; v: number } {
    return {
      u: x / this.WIDTH,
      v: 1 - (y / this.HEIGHT),
    };
  }

  /**
   * Main Render Pass onto the 2D Paper Texture
   */
  public render(
    soldiers: Soldier[],
    strikes: StrikeRecord[],
    phase: GamePhase,
    activePlayer: PlayerColor,
    aimPreview: { x: number; y: number } | null
  ) {
    const ctx = this.ctx;
    const w = this.WIDTH;
    const h = this.HEIGHT;
    const creaseX = this.CREASE_X;

    // 1. Paper Base (Tactile Warm Notebook Tint)
    ctx.fillStyle = '#f7f4ed';
    ctx.fillRect(0, 0, w, h);

    // 2. Notebook Quad Grid (5mm Graph Paper, 20px step)
    ctx.strokeStyle = '#c2d5e8';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    for (let x = 20; x < w; x += 20) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 20; y < h; y += 20) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    // 3. Margin Lines (Traditional French Notebook Red Margins)
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(50, 0);
    ctx.lineTo(50, h);
    ctx.moveTo(w - 50, 0);
    ctx.lineTo(w - 50, h);
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // 4. Center Fold Crease Line (Dashed)
    ctx.strokeStyle = '#962d22';
    ctx.lineWidth = 2.4;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(creaseX, 0);
    ctx.lineTo(creaseX, h);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // 5. Header Handwritten Labels
    ctx.font = '700 16px "Space Mono", monospace';
    ctx.fillStyle = '#0a329e';
    ctx.textAlign = 'center';
    ctx.fillText('PLAYER 1 [BLUE FIELD]', creaseX / 2, 34);

    ctx.fillStyle = '#ba1222';
    ctx.fillText('PLAYER 2 [RED FIELD]', creaseX + creaseX / 2, 34);

    ctx.font = '11px "Space Mono", monospace';
    ctx.fillStyle = '#6e6256';
    ctx.fillText('--- CENTER CREASE (FOLD AXIS) ---', creaseX, h - 20);

    // 6. Render Soldiers (With Fog-of-War)
    soldiers.forEach(s => {
      // Fog of War: During turns, do not show living enemy soldiers to active player!
      const isVisible =
        phase === 'GAME_OVER' ||
        !s.alive ||
        (phase.startsWith('DEPLOY') && s.player === (phase === 'DEPLOY_BLUE' ? 'blue' : 'red')) ||
        (phase.startsWith('TURN') && s.player === activePlayer);

      if (!isVisible) return;

      const size = 62;
      const drawX = s.x - size / 2;
      const drawY = s.y - size / 2;

      // Base doodle circle
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fillStyle = s.player === 'blue' ? 'rgba(10, 50, 158, 0.12)' : 'rgba(186, 18, 34, 0.12)';
      ctx.fill();
      ctx.strokeStyle = s.player === 'blue' ? '#0a329e' : '#ba1222';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Soldier Sprite
      const spriteKey = `soldier_${s.type}_${s.player}`;
      const img = this.spriteImages.get(spriteKey);
      if (img && img.complete) {
        ctx.drawImage(img, drawX, drawY, size, size);
      }

      // If dead, draw aggressive kill crossout over the soldier
      if (!s.alive && this.hitCrossoutImg && this.hitCrossoutImg.complete) {
        ctx.drawImage(this.hitCrossoutImg, drawX - 8, drawY - 8, size + 16, size + 16);
      }
    });

    // 7. Render Strike History (Miss smudges & Hits)
    strikes.forEach(st => {
      // Ink mark on shooter side
      ctx.beginPath();
      ctx.arc(st.strikeX, st.strikeY, 5, 0, Math.PI * 2);
      ctx.fillStyle = st.shooter === 'blue' ? '#103ba6' : '#ba1424';
      ctx.fill();

      // Mirrored transfer mark on opponent side
      if (st.hit) {
        if (this.hitCrossoutImg && this.hitCrossoutImg.complete) {
          ctx.drawImage(this.hitCrossoutImg, st.mirroredX - 24, st.mirroredY - 24, 48, 48);
        }
      } else {
        if (this.missSmudgeImg && this.missSmudgeImg.complete) {
          ctx.drawImage(this.missSmudgeImg, st.mirroredX - 16, st.mirroredY - 16, 32, 32);
        } else {
          ctx.beginPath();
          ctx.arc(st.mirroredX, st.mirroredY, 6, 0, Math.PI * 2);
          ctx.fillStyle = st.shooter === 'blue' ? 'rgba(16, 59, 166, 0.65)' : 'rgba(186, 20, 36, 0.65)';
          ctx.fill();
        }
      }
    });

    // 8. Hover Aim Dot Preview
    if (aimPreview && (phase === 'TURN_AIM' || phase.startsWith('DEPLOY'))) {
      ctx.beginPath();
      ctx.arc(aimPreview.x, aimPreview.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = activePlayer === 'blue' ? '#103ba6' : '#ba1424';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Dashed projection guideline to the crease
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = activePlayer === 'blue' ? 'rgba(16, 59, 166, 0.35)' : 'rgba(186, 20, 36, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(aimPreview.x, aimPreview.y);
      ctx.lineTo(creaseX, aimPreview.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    this.texture.needsUpdate = true;
  }
}
