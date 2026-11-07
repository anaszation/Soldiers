import confetti from 'canvas-confetti';
import { Soldier, SoldierType, PlayerColor, GamePhase, GameMode, RPSChoice, StrikeRecord } from './types';
import { PaperCanvas } from './PaperCanvas';
import { SceneManager } from './SceneManager';
import { soundManager } from '../audio/SoundManager';
import { PeerConnection } from '../network/PeerConnection';

export class GameController {
  public phase: GamePhase = 'MENU';
  public mode: GameMode = 'LOCAL_1V1';
  public activePlayer: PlayerColor = 'blue';

  public soldiers: Soldier[] = [];
  public strikes: StrikeRecord[] = [];
  public selectedSoldierType: SoldierType | null = 'rifleman';

  public paperCanvas: PaperCanvas;
  public sceneManager: SceneManager;
  public network: PeerConnection = new PeerConnection();

  // Statistics
  public turnCount: number = 0;
  public totalHits: number = 0;
  public totalStrikes: number = 0;

  // RPS State
  public blueRPSChoice: RPSChoice | null = null;
  public redRPSChoice: RPSChoice | null = null;

  // UI Element References
  private elements: Record<string, HTMLElement | null> = {};

  constructor(sceneManager: SceneManager, paperCanvas: PaperCanvas) {
    this.sceneManager = sceneManager;
    this.paperCanvas = paperCanvas;
    this.cacheDomElements();
    this.bindEvents();
  }

  private cacheDomElements() {
    const ids = [
      'menu-modal', 'btn-mode-ai', 'btn-mode-local', 'btn-mode-online',
      'online-controls', 'room-code-input', 'btn-copy-room', 'join-code-input', 'btn-connect-peer',
      'action-banner', 'banner-text', 'soldier-shelf', 'shelf-title', 'soldier-list',
      'btn-auto-place', 'btn-clear-placements', 'btn-confirm-deployment', 'placed-counter',
      'privacy-curtain', 'curtain-msg', 'btn-curtain-continue',
      'rps-modal', 'rps-result-label', 'blue-rps-buttons', 'red-rps-buttons',
      'blue-hand-img', 'red-hand-img',
      'victory-modal', 'winner-title', 'winner-desc', 'stat-turns', 'stat-accuracy', 'stat-hits', 'btn-play-again',
      'toast-message', 'blue-count', 'red-count',
      'btn-camera', 'cam-label', 'btn-sound', 'sound-label', 'btn-help', 'rules-modal', 'btn-close-rules'
    ];
    ids.forEach(id => {
      this.elements[id] = document.getElementById(id);
    });
  }

  private bindEvents() {
    // Mode Buttons
    this.elements['btn-mode-ai']?.addEventListener('click', () => this.startDeployment('VS_AI'));
    this.elements['btn-mode-local']?.addEventListener('click', () => this.startDeployment('LOCAL_1V1'));
    this.elements['btn-mode-online']?.addEventListener('click', () => this.setupOnlineLobby());

    // Online Lobby Buttons
    this.elements['btn-copy-room']?.addEventListener('click', () => {
      const input = this.elements['room-code-input'] as HTMLInputElement;
      if (input && input.value) {
        navigator.clipboard.writeText(input.value);
        this.showToast('Room Code Copied!', 'miss');
      }
    });

    this.elements['btn-connect-peer']?.addEventListener('click', () => {
      const input = this.elements['join-code-input'] as HTMLInputElement;
      if (input && input.value.trim()) {
        this.network.connectToPeer(input.value.trim());
      }
    });

    // Deployment Controls
    this.elements['btn-auto-place']?.addEventListener('click', () => this.autoScatterSoldiers(this.activePlayer));
    this.elements['btn-clear-placements']?.addEventListener('click', () => this.clearPlacements(this.activePlayer));
    this.elements['btn-confirm-deployment']?.addEventListener('click', () => this.confirmDeployment());

    // Privacy Curtain Continue
    this.elements['btn-curtain-continue']?.addEventListener('click', () => {
      this.elements['privacy-curtain']?.classList.add('hidden');
      this.activePlayer = 'red';
      this.sceneManager.setActivePen('red');
      this.renderShelf();
      this.updateHUD();
      this.paperCanvas.render(this.soldiers, this.strikes, this.phase, this.activePlayer, null);
    });

    // Rock Paper Scissors Choices
    this.elements['blue-rps-buttons']?.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.rps-btn') as HTMLElement;
      if (btn && btn.dataset.choice) {
        this.handleRPSSelection('blue', btn.dataset.choice as RPSChoice);
      }
    });

    this.elements['red-rps-buttons']?.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.rps-btn') as HTMLElement;
      if (btn && btn.dataset.choice) {
        this.handleRPSSelection('red', btn.dataset.choice as RPSChoice);
      }
    });

    // Play Again
    this.elements['btn-play-again']?.addEventListener('click', () => {
      this.elements['victory-modal']?.classList.add('hidden');
      this.elements['menu-modal']?.classList.remove('hidden');
      this.phase = 'MENU';
      this.soldiers = [];
      this.strikes = [];
      this.turnCount = 0;
      this.totalHits = 0;
      this.totalStrikes = 0;
      this.paperCanvas.render(this.soldiers, this.strikes, this.phase, 'blue', null);
    });

    // Header Tool Buttons
    this.elements['btn-camera']?.addEventListener('click', () => {
      const isTactical = this.sceneManager.toggleCameraView();
      if (this.elements['cam-label']) {
        this.elements['cam-label'].textContent = isTactical ? 'Tactical View' : 'Cinematic View';
      }
    });

    this.elements['btn-sound']?.addEventListener('click', () => {
      const enabled = soundManager.toggleMute();
      if (this.elements['sound-label']) {
        this.elements['sound-label'].textContent = enabled ? 'Audio ON' : 'Audio MUTED';
      }
    });

    this.elements['btn-help']?.addEventListener('click', () => {
      this.elements['rules-modal']?.classList.remove('hidden');
    });

    this.elements['btn-close-rules']?.addEventListener('click', () => {
      this.elements['rules-modal']?.classList.add('hidden');
    });

    // Three.js Canvas Interaction for Drawing & Aiming
    const dom = this.sceneManager.renderer.domElement;
    dom.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    dom.addEventListener('click', (e) => this.handlePaperClick(e));
  }

  // ============================================================================
  // GAME LIFECYCLE
  // ============================================================================

  public startDeployment(mode: GameMode) {
    this.mode = mode;
    this.soldiers = [];
    this.strikes = [];
    this.turnCount = 0;
    this.totalHits = 0;
    this.totalStrikes = 0;
    this.activePlayer = 'blue';
    this.phase = 'DEPLOY_BLUE';

    this.elements['menu-modal']?.classList.add('hidden');
    this.elements['soldier-shelf']?.classList.remove('hidden');

    this.sceneManager.setActivePen('blue');
    this.renderShelf();
    this.updateHUD();
    this.paperCanvas.render(this.soldiers, this.strikes, this.phase, this.activePlayer, null);
  }

  private setupOnlineLobby() {
    this.mode = 'ONLINE_P2P';
    this.elements['online-controls']?.classList.remove('hidden');
    const input = this.elements['room-code-input'] as HTMLInputElement;

    this.network.init(true).then((myId) => {
      if (input) input.value = myId;
    });

    this.network.onConnected = () => {
      this.showToast('Friend Connected! Starting Game...', 'hit');
      setTimeout(() => {
        this.startDeployment('ONLINE_P2P');
      }, 1200);
    };

    this.network.onPacketReceived = (packet) => {
      this.handleNetworkPacket(packet);
    };
  }

  private handleNetworkPacket(packet: any) {
    if (packet.type === 'DEPLOYMENT_READY') {
      // Sync opponent soldiers
      const opponentSoldiers: Soldier[] = packet.payload;
      this.soldiers.push(...opponentSoldiers);
      this.startRPSShowdown();
    } else if (packet.type === 'RPS_MOVE') {
      this.handleRPSSelection('red', packet.payload);
    } else if (packet.type === 'STRIKE') {
      const strikeCoord = packet.payload;
      this.executeStrike(strikeCoord.x, strikeCoord.y);
    }
  }

  // ============================================================================
  // DEPLOYMENT LOGIC (10 SOLDIERS)
  // ============================================================================

  private renderShelf() {
    const list = this.elements['soldier-list'];
    if (!list) return;
    list.innerHTML = '';

    const types: SoldierType[] = [
      'rifleman', 'bazooka', 'sniper', 'tank', 'commander',
      'scout', 'machinegun', 'mortar', 'radio', 'bunker'
    ];

    const currentPlacements = this.soldiers.filter(s => s.player === this.activePlayer);
    const placedTypes = new Set(currentPlacements.map(s => s.type));

    types.forEach(type => {
      const isPlaced = placedTypes.has(type);
      const isSelected = this.selectedSoldierType === type;

      const card = document.createElement('div');
      card.className = `soldier-card ${isSelected ? 'selected' : ''} ${isPlaced ? 'placed' : ''}`;
      card.innerHTML = `
        <img src="/doodles/soldier_${type}_${this.activePlayer}.svg" alt="${type}" />
        <span>${type.toUpperCase()}</span>
      `;

      card.addEventListener('click', () => {
        if (!isPlaced) {
          this.selectedSoldierType = type;
          soundManager.play('scratch', 0.1, 0.4);
          this.renderShelf();
        }
      });

      list.appendChild(card);
    });

    // Update Counter & Confirm Button
    const count = currentPlacements.length;
    if (this.elements['placed-counter']) {
      this.elements['placed-counter'].textContent = `${count}/10`;
    }
    const confirmBtn = this.elements['btn-confirm-deployment'] as HTMLButtonElement;
    if (confirmBtn) {
      confirmBtn.disabled = count !== 10;
    }

    if (this.elements['shelf-title']) {
      this.elements['shelf-title'].textContent = `Deploy ${this.activePlayer.toUpperCase()} Soldiers (${count}/10 Placed)`;
    }
  }

  public autoScatterSoldiers(player: PlayerColor) {
    this.clearPlacements(player);
    const types: SoldierType[] = [
      'rifleman', 'bazooka', 'sniper', 'tank', 'commander',
      'scout', 'machinegun', 'mortar', 'radio', 'bunker'
    ];

    // Allowed boundaries (in canvas pixels 1000x700)
    // Blue is left (60 to 440), Red is right (560 to 940)
    const minX = player === 'blue' ? 70 : 570;
    const maxX = player === 'blue' ? 430 : 930;
    const minY = 80;
    const maxY = 620;

    types.forEach(type => {
      let x = 0, y = 0, valid = false;
      let attempts = 0;

      while (!valid && attempts < 100) {
        attempts++;
        x = Math.floor(minX + Math.random() * (maxX - minX));
        y = Math.floor(minY + Math.random() * (maxY - minY));

        // Check clearance with existing soldiers (min 60px distance)
        const conflict = this.soldiers.some(
          s => s.player === player && Math.hypot(s.x - x, s.y - y) < 60
        );
        if (!conflict) valid = true;
      }

      this.soldiers.push({
        id: `${player}-${type}-${Date.now()}-${Math.random()}`,
        type,
        player,
        x,
        y,
        radius: 22,
        alive: true,
        killProgress: 0,
      });
    });

    soundManager.play('scratch', 0.15, 0.7);
    this.selectedSoldierType = null;
    this.renderShelf();
    this.paperCanvas.render(this.soldiers, this.strikes, this.phase, this.activePlayer, null);
  }

  public clearPlacements(player: PlayerColor) {
    this.soldiers = this.soldiers.filter(s => s.player !== player);
    soundManager.play('unfold', 0.1, 0.4);
    this.renderShelf();
    this.paperCanvas.render(this.soldiers, this.strikes, this.phase, this.activePlayer, null);
  }

  public confirmDeployment() {
    const currentPlacements = this.soldiers.filter(s => s.player === this.activePlayer);
    if (currentPlacements.length !== 10) return;

    soundManager.play('slap', 0.1, 0.8);

    if (this.phase === 'DEPLOY_BLUE') {
      if (this.mode === 'VS_AI') {
        // AI deploys Red automatically
        this.autoScatterSoldiers('red');
        this.elements['soldier-shelf']?.classList.add('hidden');
        this.startRPSShowdown();
      } else if (this.mode === 'LOCAL_1V1') {
        // Privacy Curtain before Red deploys
        this.phase = 'DEPLOY_RED';
        this.elements['soldier-shelf']?.classList.add('hidden');
        this.elements['privacy-curtain']?.classList.remove('hidden');
        if (this.elements['curtain-msg']) {
          this.elements['curtain-msg'].innerHTML = 'Blue Team has finished secret mapping.<br>Hand over the notebook to <strong>Player 2 (RED)</strong>.';
        }
      } else if (this.mode === 'ONLINE_P2P') {
        this.elements['soldier-shelf']?.classList.add('hidden');
        this.network.send({
          type: 'DEPLOYMENT_READY',
          payload: currentPlacements,
        });
        this.showToast('Waiting for opponent deployment...', 'miss');
      }
    } else if (this.phase === 'DEPLOY_RED') {
      this.elements['soldier-shelf']?.classList.add('hidden');
      this.startRPSShowdown();
    }
  }

  // ============================================================================
  // ROCK PAPER SCISSORS (FIRST STRIKE INITIATIVE)
  // ============================================================================

  private startRPSShowdown() {
    this.phase = 'RPS_STANDOFF';
    this.blueRPSChoice = null;
    this.redRPSChoice = null;

    this.elements['rps-modal']?.classList.remove('hidden');
    if (this.elements['rps-result-label']) {
      this.elements['rps-result-label'].textContent = 'CHOOSE YOUR HAND';
    }

    // Set initial rock doodle images
    (this.elements['blue-hand-img'] as HTMLImageElement).src = '/doodles/rps_rock.svg';
    (this.elements['red-hand-img'] as HTMLImageElement).src = '/doodles/rps_rock.svg';

    if (this.mode === 'VS_AI') {
      // AI hides choice until Blue picks
      this.elements['red-rps-buttons']?.classList.add('hidden');
    } else {
      this.elements['red-rps-buttons']?.classList.remove('hidden');
    }
  }

  private handleRPSSelection(player: PlayerColor, choice: RPSChoice) {
    soundManager.play('scratch', 0.1, 0.5);

    if (player === 'blue') {
      this.blueRPSChoice = choice;
      (this.elements['blue-hand-img'] as HTMLImageElement).src = `/doodles/rps_${choice}.svg`;
      if (this.mode === 'VS_AI') {
        // AI chooses randomly
        const aiChoices: RPSChoice[] = ['rock', 'paper', 'scissors'];
        this.redRPSChoice = aiChoices[Math.floor(Math.random() * aiChoices.length)];
        (this.elements['red-hand-img'] as HTMLImageElement).src = `/doodles/rps_${this.redRPSChoice}.svg`;
      }
    } else {
      this.redRPSChoice = choice;
      (this.elements['red-hand-img'] as HTMLImageElement).src = `/doodles/rps_${choice}.svg`;
    }

    if (this.blueRPSChoice && this.redRPSChoice) {
      this.resolveRPS();
    }
  }

  private resolveRPS() {
    const b = this.blueRPSChoice!;
    const r = this.redRPSChoice!;
    const label = this.elements['rps-result-label'];

    if (b === r) {
      if (label) label.textContent = 'DRAW! GO AGAIN!';
      soundManager.play('unfold', 0.1, 0.7);
      setTimeout(() => {
        this.blueRPSChoice = null;
        this.redRPSChoice = null;
        if (label) label.textContent = 'CHOOSE YOUR HAND';
      }, 1000);
      return;
    }

    const blueWins =
      (b === 'rock' && r === 'scissors') ||
      (b === 'paper' && r === 'rock') ||
      (b === 'scissors' && r === 'paper');

    const winner: PlayerColor = blueWins ? 'blue' : 'red';
    if (label) {
      label.textContent = `${winner.toUpperCase()} WINS INITIATIVE!`;
    }
    soundManager.play('bell', 0.05, 0.8);

    setTimeout(() => {
      this.elements['rps-modal']?.classList.add('hidden');
      this.beginTurn(winner);
    }, 1500);
  }

  // ============================================================================
  // TURN LOOP (BLIND STRIKE & 3D FOLD)
  // ============================================================================

  private beginTurn(player: PlayerColor) {
    this.activePlayer = player;
    this.phase = 'TURN_AIM';
    this.sceneManager.setActivePen(player);
    this.updateHUD();
    this.paperCanvas.render(this.soldiers, this.strikes, this.phase, this.activePlayer, null);

    if (this.mode === 'VS_AI' && player === 'red') {
      // Trigger AI strike after deliberate human-like pause
      setTimeout(() => {
        this.executeAITurn();
      }, 1400);
    }
  }

  private handleMouseMove(e: MouseEvent) {
    if (this.phase !== 'TURN_AIM' && !this.phase.startsWith('DEPLOY')) return;

    const hit = this.sceneManager.raycastPaper(e.clientX, e.clientY);
    if (hit) {
      const coords = this.paperCanvas.uvToCanvasCoords(hit.u, hit.v);
      this.paperCanvas.render(this.soldiers, this.strikes, this.phase, this.activePlayer, coords);
    } else {
      this.paperCanvas.render(this.soldiers, this.strikes, this.phase, this.activePlayer, null);
    }
  }

  private handlePaperClick(e: MouseEvent) {
    if (this.phase === 'DEPLOY_BLUE' || this.phase === 'DEPLOY_RED') {
      // Placing soldiers manually on click
      if (!this.selectedSoldierType) return;
      const hit = this.sceneManager.raycastPaper(e.clientX, e.clientY);
      if (!hit) return;

      const coords = this.paperCanvas.uvToCanvasCoords(hit.u, hit.v);
      // Validate placement field
      const isBlue = this.activePlayer === 'blue';
      const isValidSide = isBlue
        ? coords.x >= 60 && coords.x <= 440
        : coords.x >= 560 && coords.x <= 940;

      if (!isValidSide || coords.y < 70 || coords.y > 630) {
        this.showToast(`Place soldier on YOUR ${this.activePlayer.toUpperCase()} field!`, 'miss');
        return;
      }

      this.soldiers.push({
        id: `${this.activePlayer}-${this.selectedSoldierType}-${Date.now()}`,
        type: this.selectedSoldierType,
        player: this.activePlayer,
        x: coords.x,
        y: coords.y,
        radius: 22,
        alive: true,
        killProgress: 0,
      });

      soundManager.play('dot', 0.1, 0.7);
      soundManager.play('scratch', 0.15, 0.5);

      // Select next available type automatically
      const currentPlacements = this.soldiers.filter(s => s.player === this.activePlayer);
      const placedTypes = new Set(currentPlacements.map(s => s.type));
      const allTypes: SoldierType[] = [
        'rifleman', 'bazooka', 'sniper', 'tank', 'commander',
        'scout', 'machinegun', 'mortar', 'radio', 'bunker'
      ];
      this.selectedSoldierType = allTypes.find(t => !placedTypes.has(t)) || null;

      this.renderShelf();
      this.paperCanvas.render(this.soldiers, this.strikes, this.phase, this.activePlayer, null);
      return;
    }

    if (this.phase !== 'TURN_AIM') return;
    if (this.mode === 'VS_AI' && this.activePlayer === 'red') return; // AI's turn

    const hit = this.sceneManager.raycastPaper(e.clientX, e.clientY);
    if (!hit) return;

    const coords = this.paperCanvas.uvToCanvasCoords(hit.u, hit.v);

    // Validate that player puts the strike dot on their OWN half of the paper!
    const isBlue = this.activePlayer === 'blue';
    const isOwnHalf = isBlue ? coords.x < 500 : coords.x > 500;

    if (!isOwnHalf) {
      this.showToast(`Draw your dot on YOUR ${this.activePlayer.toUpperCase()} half!`, 'miss');
      return;
    }

    this.executeStrike(coords.x, coords.y);
  }

  public executeStrike(strikeX: number, strikeY: number) {
    this.phase = 'TURN_FOLD';
    this.totalStrikes++;
    this.turnCount++;

    // Tactile pen tap
    this.sceneManager.isPenWriting = true;
    soundManager.play('dot', 0.05, 0.9);
    soundManager.play('scratch', 0.1, 0.6);

    setTimeout(() => {
      this.sceneManager.isPenWriting = false;

      // Start 3D paper curl
      soundManager.play('fold', 0.1, 0.85);

      this.sceneManager.paperFold.triggerFold(
        this.activePlayer,
        () => {
          // Peak Contact (180 fold press): Table slap + ink mirror math!
          soundManager.play('slap', 0.08, 1.0);

          // Mirror coordinate across center crease (x = 500)
          // formula: mirroredX = 2 * creaseX - strikeX = 1000 - strikeX
          const mirroredX = 1000 - strikeX;
          const mirroredY = strikeY;

          // Check hit against opponent soldiers
          const targetPlayer: PlayerColor = this.activePlayer === 'blue' ? 'red' : 'blue';
          const opponentLiving = this.soldiers.filter(s => s.player === targetPlayer && s.alive);

          let hitSoldier: Soldier | null = null;
          for (const s of opponentLiving) {
            const dist = Math.hypot(s.x - mirroredX, s.y - mirroredY);
            if (dist <= s.radius) {
              hitSoldier = s;
              break;
            }
          }

          const isHit = !!hitSoldier;
          if (isHit && hitSoldier) {
            hitSoldier.alive = false;
            this.totalHits++;
            soundManager.play('kill', 0.05, 1.0);
            this.showToast(`DIRECT HIT! ${hitSoldier.type.toUpperCase()} KILLED!`, 'hit');
          } else {
            this.showToast('MISS! Smudge transferred.', 'miss');
          }

          this.strikes.push({
            id: `strike-${Date.now()}`,
            shooter: this.activePlayer,
            strikeX,
            strikeY,
            mirroredX,
            mirroredY,
            hit: isHit,
            killedSoldierId: hitSoldier?.id,
            timestamp: Date.now(),
          });
        },
        () => {
          // Unfold complete: Reveal paper and check game over
          soundManager.play('unfold', 0.1, 0.7);
          this.paperCanvas.render(this.soldiers, this.strikes, this.phase, this.activePlayer, null);
          this.checkGameStatus();
        }
      );
    }, 280);
  }

  private checkGameStatus() {
    const blueAlive = this.soldiers.filter(s => s.player === 'blue' && s.alive).length;
    const redAlive = this.soldiers.filter(s => s.player === 'red' && s.alive).length;

    this.updateHUD();

    if (blueAlive === 0) {
      this.triggerVictory('red');
    } else if (redAlive === 0) {
      this.triggerVictory('blue');
    } else {
      // Next turn
      const nextPlayer: PlayerColor = this.activePlayer === 'blue' ? 'red' : 'blue';
      this.beginTurn(nextPlayer);
    }
  }

  private triggerVictory(winner: PlayerColor) {
    this.phase = 'GAME_OVER';
    soundManager.play('bell', 0.02, 1.0);

    // Confetti burst
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: winner === 'blue' ? ['#103ba6', '#4a90e2', '#ffffff'] : ['#ba1424', '#e74c3c', '#ffffff'],
    });

    this.paperCanvas.render(this.soldiers, this.strikes, this.phase, this.activePlayer, null);

    // Show Victory Screen
    setTimeout(() => {
      this.elements['victory-modal']?.classList.remove('hidden');
      if (this.elements['winner-title']) {
        this.elements['winner-title'].textContent = `${winner.toUpperCase()} TEAM WINS!`;
        this.elements['winner-title'].style.color = winner === 'blue' ? '#103ba6' : '#ba1424';
      }
      if (this.elements['stat-turns']) {
        this.elements['stat-turns'].textContent = `${this.turnCount}`;
      }
      if (this.elements['stat-accuracy']) {
        const acc = this.totalStrikes > 0 ? Math.round((this.totalHits / this.totalStrikes) * 100) : 0;
        this.elements['stat-accuracy'].textContent = `${acc}%`;
      }
      if (this.elements['stat-hits']) {
        this.elements['stat-hits'].textContent = `${this.totalHits}`;
      }
    }, 800);
  }

  // ============================================================================
  // AI OPPONENT LOGIC ("GENERAL SCRIBBLE")
  // ============================================================================

  private executeAITurn() {
    // AI is Red, shooting at Blue's side (mirrored target is in 60..440, so strike is in 560..940)
    // AI has intelligent hunting heuristic:
    // 1. Searches living targets with slight human aim noise (spread of 15px)
    // 2. Occasionally tests a blind coordinate
    const blueLiving = this.soldiers.filter(s => s.player === 'blue' && s.alive);
    let targetX = 0, targetY = 0;

    if (blueLiving.length > 0 && Math.random() < 0.65) {
      // Pick a random living blue soldier and aim near it
      const target = blueLiving[Math.floor(Math.random() * blueLiving.length)];
      // Add slight human error noise (+/- 25px)
      const noiseX = (Math.random() - 0.5) * 50;
      const noiseY = (Math.random() - 0.5) * 50;

      const aimOpponentX = Math.max(70, Math.min(430, target.x + noiseX));
      targetY = Math.max(80, Math.min(620, target.y + noiseY));

      // Mirror onto Red's half (x = 1000 - aimOpponentX)
      targetX = 1000 - aimOpponentX;
    } else {
      // Random blind exploration strike on Red's half (560 to 930)
      targetX = Math.floor(570 + Math.random() * 360);
      targetY = Math.floor(80 + Math.random() * 540);
    }

    this.executeStrike(targetX, targetY);
  }

  // ============================================================================
  // HUD & TOAST NOTIFICATIONS
  // ============================================================================

  private updateHUD() {
    const blueAlive = this.soldiers.filter(s => s.player === 'blue' && s.alive).length;
    const redAlive = this.soldiers.filter(s => s.player === 'red' && s.alive).length;

    if (this.elements['blue-count']) this.elements['blue-count'].textContent = `${blueAlive}/10`;
    if (this.elements['red-count']) this.elements['red-count'].textContent = `${redAlive}/10`;

    const banner = this.elements['banner-text'];
    if (banner) {
      if (this.phase === 'DEPLOY_BLUE') {
        banner.innerHTML = 'Player 1: Secretly place your <strong>10 Blue Soldiers</strong> on the left side.';
      } else if (this.phase === 'DEPLOY_RED') {
        banner.innerHTML = 'Player 2: Secretly place your <strong>10 Red Soldiers</strong> on the right side.';
      } else if (this.phase === 'TURN_AIM') {
        banner.innerHTML = `<strong>${this.activePlayer.toUpperCase()} TURN:</strong> Put a pen dot on YOUR side to guess enemy positions!`;
      } else if (this.phase === 'TURN_FOLD') {
        banner.innerHTML = 'Folding notebook paper... Transferring ink!';
      }
    }
  }

  public showToast(message: string, type: 'hit' | 'miss') {
    const toast = this.elements['toast-message'];
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');

    setTimeout(() => {
      toast.classList.add('hidden');
    }, 1400);
  }
}
