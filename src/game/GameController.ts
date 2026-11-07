import confetti from 'canvas-confetti';
import { Soldier, SoldierType, PlayerColor, GamePhase, GameMode, RPSChoice, StrikeRecord } from './types';
import { PaperCanvas } from './PaperCanvas';
import { SceneManager } from './SceneManager';
import { soundManager } from '../audio/SoundManager';
import { PeerConnection, NetworkPacket } from '../network/PeerConnection';

export class GameController {
  public phase: GamePhase = 'MENU';
  public mode: GameMode = 'LOCAL_1V1';
  public activePlayer: PlayerColor = 'blue';
  public myOnlineRole: PlayerColor = 'blue';

  public soldiers: Soldier[] = [];
  public strikes: StrikeRecord[] = [];
  public selectedSoldierType: SoldierType | null = 'rifleman';

  public paperCanvas: PaperCanvas;
  public sceneManager: SceneManager;
  public network: PeerConnection = new PeerConnection();

  // Deployment sync flags
  private myDeploymentReady: boolean = false;
  private opponentDeployed: boolean = false;

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
      'btn-camera', 'cam-label', 'btn-sound', 'sound-label', 'btn-help', 'rules-modal', 'btn-close-rules',
      'blue-score-box', 'red-score-box'
    ];
    ids.forEach(id => {
      this.elements[id] = document.getElementById(id);
    });
  }

  private bindEvents() {
    // Mode Buttons
    this.elements['btn-mode-ai']?.addEventListener('click', () => {
      soundManager.play('click');
      soundManager.startBackgroundMusic();
      this.startDeployment('VS_AI');
    });

    this.elements['btn-mode-local']?.addEventListener('click', () => {
      soundManager.play('click');
      soundManager.startBackgroundMusic();
      this.startDeployment('LOCAL_1V1');
    });

    this.elements['btn-mode-online']?.addEventListener('click', () => {
      soundManager.play('click');
      soundManager.startBackgroundMusic();
      this.setupOnlineHost();
    });

    // Online Join Room
    this.elements['btn-connect-peer']?.addEventListener('click', () => {
      soundManager.play('click');
      soundManager.startBackgroundMusic();
      const input = this.elements['join-code-input'] as HTMLInputElement;
      const targetId = input?.value.trim();
      if (targetId) {
        this.setupOnlineGuest(targetId);
      }
    });

    this.elements['btn-copy-room']?.addEventListener('click', () => {
      soundManager.play('click');
      const input = this.elements['room-code-input'] as HTMLInputElement;
      if (input && input.value) {
        navigator.clipboard.writeText(input.value);
        this.showToast('Room Code Copied!', 'miss');
      }
    });

    // Deployment Controls
    this.elements['btn-auto-place']?.addEventListener('click', () => {
      soundManager.play('click');
      this.autoScatterSoldiers(this.activePlayer);
    });

    this.elements['btn-clear-placements']?.addEventListener('click', () => {
      soundManager.play('click');
      this.clearPlacements(this.activePlayer);
    });

    this.elements['btn-confirm-deployment']?.addEventListener('click', () => this.confirmDeployment());

    // Privacy Curtain Continue
    this.elements['btn-curtain-continue']?.addEventListener('click', () => {
      soundManager.play('click');
      this.elements['privacy-curtain']?.classList.add('hidden');
      this.activePlayer = 'red';
      this.phase = 'DEPLOY_RED';
      this.sceneManager.setActivePen('red');
      this.sceneManager.isPenActiveOnPaper = true;
      this.elements['soldier-shelf']?.classList.remove('hidden');
      this.renderShelf();
      this.updateHUD();
      this.paperCanvas.render(this.soldiers, this.strikes, this.phase, this.activePlayer, null);
    });

    // Rock Paper Scissors Choices
    this.elements['blue-rps-buttons']?.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.rps-btn') as HTMLElement;
      if (btn && btn.dataset.choice) {
        this.onUserRPSSelect('blue', btn.dataset.choice as RPSChoice);
      }
    });

    this.elements['red-rps-buttons']?.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.rps-btn') as HTMLElement;
      if (btn && btn.dataset.choice) {
        this.onUserRPSSelect('red', btn.dataset.choice as RPSChoice);
      }
    });

    // Play Again
    this.elements['btn-play-again']?.addEventListener('click', () => {
      soundManager.play('click');
      if (this.mode === 'ONLINE_P2P') {
        this.network.send({ type: 'RESTART' });
      }
      this.resetToMenu();
    });

    // View & Sound Controls
    this.elements['btn-camera']?.addEventListener('click', () => {
      soundManager.play('click');
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
      soundManager.play('click');
      this.elements['rules-modal']?.classList.remove('hidden');
    });

    this.elements['btn-close-rules']?.addEventListener('click', () => {
      soundManager.play('click');
      this.elements['rules-modal']?.classList.add('hidden');
    });

    // 3D Canvas Interaction for Hover and Clicking
    const dom = this.sceneManager.renderer.domElement;
    dom.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    dom.addEventListener('click', (e) => this.handlePaperClick(e));
  }

  // ============================================================================
  // MULTIPLAYER SETUP
  // ============================================================================

  private setupOnlineHost() {
    this.mode = 'ONLINE_P2P';
    this.myOnlineRole = 'blue';
    this.elements['online-controls']?.classList.remove('hidden');
    const input = this.elements['room-code-input'] as HTMLInputElement;

    this.network.init(true).then((myId) => {
      if (input) input.value = myId;
      this.showToast('Share room code with your friend!', 'miss');
    });

    this.network.onConnected = () => {
      this.showToast('Friend Connected! Starting Game...', 'hit');
      soundManager.play('bell', 0.05, 0.85);
      this.network.send({ type: 'LOBBY_READY', player: 'blue' });
      setTimeout(() => {
        this.startDeployment('ONLINE_P2P', 'blue');
      }, 1000);
    };

    this.network.onPacketReceived = (packet) => this.handleNetworkPacket(packet);
  }

  private setupOnlineGuest(targetId: string) {
    this.mode = 'ONLINE_P2P';
    this.myOnlineRole = 'red';
    this.showToast('Connecting to Host...', 'miss');

    this.network.init(false, targetId).then(() => {
      this.network.onConnected = () => {
        this.showToast('Connected to Host! Starting Game...', 'hit');
        soundManager.play('bell', 0.05, 0.85);
        this.network.send({ type: 'JOIN_LOBBY', player: 'red' });
        setTimeout(() => {
          this.startDeployment('ONLINE_P2P', 'red');
        }, 1000);
      };
    });

    this.network.onPacketReceived = (packet) => this.handleNetworkPacket(packet);
  }

  private handleNetworkPacket(packet: NetworkPacket) {
    if (packet.type === 'LOBBY_READY') {
      this.startDeployment('ONLINE_P2P', 'red');
    } else if (packet.type === 'DEPLOYMENT_READY') {
      const incomingSoldiers: Soldier[] = packet.payload;
      this.soldiers = this.soldiers.filter(s => s.player !== packet.player);
      this.soldiers.push(...incomingSoldiers);
      this.opponentDeployed = true;

      if (this.myDeploymentReady) {
        this.startRPSShowdown();
      } else {
        this.showToast('Opponent finished deployment! Place yours.', 'miss');
      }
    } else if (packet.type === 'RPS_MOVE') {
      if (packet.player === 'blue') {
        this.blueRPSChoice = packet.payload;
        (this.elements['blue-hand-img'] as HTMLImageElement).src = `/doodles/rps_${packet.payload}.svg`;
      } else if (packet.player === 'red') {
        this.redRPSChoice = packet.payload;
        (this.elements['red-hand-img'] as HTMLImageElement).src = `/doodles/rps_${packet.payload}.svg`;
      }

      if (this.blueRPSChoice && this.redRPSChoice) {
        this.resolveRPS();
      }
    } else if (packet.type === 'STRIKE') {
      this.executeStrike(packet.payload.x, packet.payload.y);
    } else if (packet.type === 'RESTART') {
      this.resetToMenu();
    }
  }

  // ============================================================================
  // DEPLOYMENT LIFECYCLE
  // ============================================================================

  public startDeployment(mode: GameMode, assignedRole: PlayerColor = 'blue') {
    this.mode = mode;
    this.soldiers = [];
    this.strikes = [];
    this.turnCount = 0;
    this.totalHits = 0;
    this.totalStrikes = 0;
    this.myDeploymentReady = false;
    this.opponentDeployed = false;

    if (mode === 'ONLINE_P2P') {
      this.myOnlineRole = assignedRole;
      this.activePlayer = assignedRole;
      this.phase = assignedRole === 'blue' ? 'DEPLOY_BLUE' : 'DEPLOY_RED';
    } else {
      this.activePlayer = 'blue';
      this.phase = 'DEPLOY_BLUE';
    }

    this.elements['menu-modal']?.classList.add('hidden');
    this.elements['soldier-shelf']?.classList.remove('hidden');

    this.sceneManager.setActivePen(this.activePlayer);
    this.sceneManager.isPenActiveOnPaper = true;
    this.renderShelf();
    this.updateHUD();
    this.paperCanvas.render(this.soldiers, this.strikes, this.phase, this.activePlayer, null);
  }

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
          soundManager.play('click', 0.08, 0.5);
          this.renderShelf();
        }
      });

      list.appendChild(card);
    });

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

        const conflict = this.soldiers.some(
          s => s.player === player && Math.hypot(s.x - x, s.y - y) < 55
        );
        if (!conflict) valid = true;
      }

      this.soldiers.push({
        id: `${player}-${type}-${Date.now()}-${Math.random()}`,
        type,
        player,
        x,
        y,
        radius: 24,
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

    if (this.mode === 'ONLINE_P2P') {
      this.myDeploymentReady = true;
      this.elements['soldier-shelf']?.classList.add('hidden');
      this.sceneManager.isPenActiveOnPaper = false; // Dock pen
      this.network.send({
        type: 'DEPLOYMENT_READY',
        player: this.myOnlineRole,
        payload: currentPlacements,
      });

      if (this.opponentDeployed) {
        this.startRPSShowdown();
      } else {
        this.showToast('Deployment confirmed! Waiting for opponent...', 'miss');
        if (this.elements['banner-text']) {
          this.elements['banner-text'].innerHTML = 'Waiting for your opponent to finish their mapping...';
        }
      }
      return;
    }

    if (this.phase === 'DEPLOY_BLUE') {
      if (this.mode === 'VS_AI') {
        this.autoScatterSoldiers('red');
        this.elements['soldier-shelf']?.classList.add('hidden');
        this.sceneManager.isPenActiveOnPaper = false;
        this.startRPSShowdown();
      } else if (this.mode === 'LOCAL_1V1') {
        this.phase = 'PRIVACY_SWITCH';
        this.elements['soldier-shelf']?.classList.add('hidden');
        this.sceneManager.isPenActiveOnPaper = false; // Dock pen during curtain
        this.elements['privacy-curtain']?.classList.remove('hidden');
        if (this.elements['curtain-msg']) {
          this.elements['curtain-msg'].innerHTML = 'Blue Team has finished secret mapping.<br>Hand over the notebook to <strong>Player 2 (RED)</strong>.';
        }
      }
    } else if (this.phase === 'DEPLOY_RED') {
      this.elements['soldier-shelf']?.classList.add('hidden');
      this.sceneManager.isPenActiveOnPaper = false;
      this.startRPSShowdown();
    }
  }

  // ============================================================================
  // ROCK PAPER SCISSORS
  // ============================================================================

  private startRPSShowdown() {
    this.phase = 'RPS_STANDOFF';
    this.blueRPSChoice = null;
    this.redRPSChoice = null;
    this.sceneManager.isPenActiveOnPaper = false; // Pens stay docked during RPS

    this.elements['rps-modal']?.classList.remove('hidden');
    if (this.elements['rps-result-label']) {
      this.elements['rps-result-label'].textContent = 'CHOOSE YOUR HAND';
    }

    (this.elements['blue-hand-img'] as HTMLImageElement).src = '/doodles/rps_rock.svg';
    (this.elements['red-hand-img'] as HTMLImageElement).src = '/doodles/rps_rock.svg';

    if (this.mode === 'ONLINE_P2P') {
      if (this.myOnlineRole === 'blue') {
        this.elements['blue-rps-buttons']?.classList.remove('hidden');
        this.elements['red-rps-buttons']?.classList.add('hidden');
      } else {
        this.elements['blue-rps-buttons']?.classList.add('hidden');
        this.elements['red-rps-buttons']?.classList.remove('hidden');
      }
    } else if (this.mode === 'VS_AI') {
      this.elements['blue-rps-buttons']?.classList.remove('hidden');
      this.elements['red-rps-buttons']?.classList.add('hidden');
    } else {
      // Local Pass & Play: both active
      this.elements['blue-rps-buttons']?.classList.remove('hidden');
      this.elements['red-rps-buttons']?.classList.remove('hidden');
    }
  }

  private onUserRPSSelect(player: PlayerColor, choice: RPSChoice) {
    if (this.mode === 'ONLINE_P2P' && player !== this.myOnlineRole) return;

    soundManager.play('scratch', 0.1, 0.5);

    if (player === 'blue') {
      this.blueRPSChoice = choice;
      (this.elements['blue-hand-img'] as HTMLImageElement).src = `/doodles/rps_${choice}.svg`;
    } else {
      this.redRPSChoice = choice;
      (this.elements['red-hand-img'] as HTMLImageElement).src = `/doodles/rps_${choice}.svg`;
    }

    if (this.mode === 'ONLINE_P2P') {
      this.network.send({
        type: 'RPS_MOVE',
        player: this.myOnlineRole,
        payload: choice,
      });
      if (this.elements['rps-result-label']) {
        this.elements['rps-result-label'].textContent = 'HAND LOCKED! WAITING FOR OPPONENT...';
      }
    } else if (this.mode === 'VS_AI') {
      const aiChoices: RPSChoice[] = ['rock', 'paper', 'scissors'];
      this.redRPSChoice = aiChoices[Math.floor(Math.random() * aiChoices.length)];
      (this.elements['red-hand-img'] as HTMLImageElement).src = `/doodles/rps_${this.redRPSChoice}.svg`;
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
    soundManager.play('bell', 0.05, 0.85);

    setTimeout(() => {
      this.elements['rps-modal']?.classList.add('hidden');
      this.beginTurn(winner);
    }, 1500);
  }

  // ============================================================================
  // TURN LOGIC
  // ============================================================================

  private beginTurn(player: PlayerColor) {
    this.activePlayer = player;
    this.phase = 'TURN_AIM';
    this.sceneManager.setActivePen(player);

    // Only allow pen to hover on paper if it is THIS player's turn!
    if (this.mode === 'ONLINE_P2P') {
      this.sceneManager.isPenActiveOnPaper = (player === this.myOnlineRole);
    } else if (this.mode === 'VS_AI') {
      this.sceneManager.isPenActiveOnPaper = (player === 'blue');
    } else {
      this.sceneManager.isPenActiveOnPaper = true;
    }

    this.updateHUD();
    this.paperCanvas.render(this.soldiers, this.strikes, this.phase, this.activePlayer, null);

    if (this.mode === 'VS_AI' && player === 'red') {
      setTimeout(() => {
        this.executeAITurn();
      }, 1300);
    }
  }

  private handleMouseMove(e: MouseEvent) {
    if (this.phase !== 'TURN_AIM' && !this.phase.startsWith('DEPLOY')) return;
    if (this.mode === 'ONLINE_P2P' && this.activePlayer !== this.myOnlineRole) return;
    if (this.mode === 'VS_AI' && this.activePlayer === 'red') return;

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
      if (!this.selectedSoldierType) return;
      if (this.mode === 'ONLINE_P2P' && this.activePlayer !== this.myOnlineRole) return;

      const hit = this.sceneManager.raycastPaper(e.clientX, e.clientY);
      if (!hit) return;

      const coords = this.paperCanvas.uvToCanvasCoords(hit.u, hit.v);
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
        radius: 24,
        alive: true,
        killProgress: 0,
      });

      soundManager.play('dot', 0.1, 0.8);
      soundManager.play('scratch', 0.15, 0.5);

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
    if (this.mode === 'VS_AI' && this.activePlayer === 'red') return;

    if (this.mode === 'ONLINE_P2P' && this.activePlayer !== this.myOnlineRole) {
      this.showToast("Opponent's turn to aim! Please wait...", 'miss');
      return;
    }

    const hit = this.sceneManager.raycastPaper(e.clientX, e.clientY);
    if (!hit) return;

    const coords = this.paperCanvas.uvToCanvasCoords(hit.u, hit.v);
    const isBlue = this.activePlayer === 'blue';
    const isOwnHalf = isBlue ? coords.x < 500 : coords.x > 500;

    if (!isOwnHalf) {
      this.showToast(`Draw your dot on YOUR ${this.activePlayer.toUpperCase()} half!`, 'miss');
      return;
    }

    if (this.mode === 'ONLINE_P2P') {
      this.network.send({
        type: 'STRIKE',
        payload: { x: coords.x, y: coords.y },
      });
    }

    this.executeStrike(coords.x, coords.y);
  }

  public executeStrike(strikeX: number, strikeY: number) {
    this.phase = 'TURN_FOLD';
    this.totalStrikes++;
    this.turnCount++;

    // Tactile pen tap on the paper
    this.sceneManager.isPenWriting = true;
    soundManager.play('dot', 0.05, 0.95);
    soundManager.play('scratch', 0.1, 0.6);

    setTimeout(() => {
      // Pen lifts up and retreats to desk dock BEFORE paper folds!
      this.sceneManager.isPenWriting = false;
      this.sceneManager.isPenActiveOnPaper = false;

      // Crisp paper fold whoosh
      soundManager.play('fold', 0.1, 0.9);

      this.sceneManager.paperFold.triggerFold(
        this.activePlayer,
        () => {
          // Flush Contact Press & Rub on the table!
          soundManager.play('slap', 0.08, 1.0);
          soundManager.play('rub', 0.1, 0.85);

          const mirroredX = 1000 - strikeX;
          const mirroredY = strikeY;

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
          // Unfold complete: Paper is now completely open and flat!
          soundManager.play('unfold', 0.1, 0.75);

          // Reveal hit/miss with authentic comedic sound
          const lastStrike = this.strikes[this.strikes.length - 1];
          if (lastStrike?.hit) {
            soundManager.play('kill', 0.05, 1.0);
            this.showToast('DIRECT HIT! ENEMY ELIMINATED!', 'hit');
          } else {
            soundManager.play('smudge', 0.08, 0.9);
            this.showToast('MISS! Smudge transferred.', 'miss');
          }

          this.paperCanvas.render(this.soldiers, this.strikes, this.phase, this.activePlayer, null);
          this.checkGameStatus();
        }
      );
    }, 180);
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
      const nextPlayer: PlayerColor = this.activePlayer === 'blue' ? 'red' : 'blue';
      this.beginTurn(nextPlayer);
    }
  }

  private triggerVictory(winner: PlayerColor) {
    this.phase = 'GAME_OVER';
    soundManager.play('bell', 0.02, 1.0);

    confetti({
      particleCount: 140,
      spread: 95,
      origin: { y: 0.6 },
      colors: winner === 'blue' ? ['#0a329e', '#4a90e2', '#ffffff'] : ['#ba1222', '#e74c3c', '#ffffff'],
    });

    this.paperCanvas.render(this.soldiers, this.strikes, this.phase, this.activePlayer, null);

    setTimeout(() => {
      this.elements['victory-modal']?.classList.remove('hidden');
      if (this.elements['winner-title']) {
        this.elements['winner-title'].textContent = `${winner.toUpperCase()} TEAM WINS!`;
        this.elements['winner-title'].style.color = winner === 'blue' ? '#0a329e' : '#ba1222';
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

  private executeAITurn() {
    const blueLiving = this.soldiers.filter(s => s.player === 'blue' && s.alive);
    let targetX = 0, targetY = 0;

    if (blueLiving.length > 0 && Math.random() < 0.65) {
      const target = blueLiving[Math.floor(Math.random() * blueLiving.length)];
      const noiseX = (Math.random() - 0.5) * 45;
      const noiseY = (Math.random() - 0.5) * 45;
      const aimOpponentX = Math.max(70, Math.min(430, target.x + noiseX));
      targetY = Math.max(80, Math.min(620, target.y + noiseY));
      targetX = 1000 - aimOpponentX;
    } else {
      targetX = Math.floor(570 + Math.random() * 360);
      targetY = Math.floor(80 + Math.random() * 540);
    }

    // Convert AI target canvas pixels to 3D world coordinates for the pen
    const uv = this.paperCanvas.canvasToUVCoords(targetX, targetY);
    const worldX = (uv.u - 0.5) * this.sceneManager.paperFold.WIDTH;
    const worldY = (uv.v - 0.5) * this.sceneManager.paperFold.HEIGHT;
    this.sceneManager.paperContactPoint.set(worldX, worldY, 0.002);
    this.sceneManager.setActivePen('red');
    this.sceneManager.isPenActiveOnPaper = true;

    // AI pauses naturally to aim, then marks the dot
    setTimeout(() => {
      this.executeStrike(targetX, targetY);
    }, 700);
  }

  private resetToMenu() {
    this.elements['victory-modal']?.classList.add('hidden');
    this.elements['menu-modal']?.classList.remove('hidden');
    this.phase = 'MENU';
    this.soldiers = [];
    this.strikes = [];
    this.turnCount = 0;
    this.totalHits = 0;
    this.totalStrikes = 0;
    this.myDeploymentReady = false;
    this.opponentDeployed = false;
    this.sceneManager.isPenActiveOnPaper = false; // Pens docked
    this.paperCanvas.render(this.soldiers, this.strikes, this.phase, 'blue', null);
  }

  private updateHUD() {
    const blueAlive = this.soldiers.filter(s => s.player === 'blue' && s.alive).length;
    const redAlive = this.soldiers.filter(s => s.player === 'red' && s.alive).length;

    if (this.elements['blue-count']) this.elements['blue-count'].textContent = `${blueAlive}/10`;
    if (this.elements['red-count']) this.elements['red-count'].textContent = `${redAlive}/10`;

    // Active player highlight on scoreboard
    if (this.activePlayer === 'blue') {
      this.elements['blue-score-box']?.style.setProperty('outline', '2px solid #0a329e');
      this.elements['red-score-box']?.style.removeProperty('outline');
    } else {
      this.elements['red-score-box']?.style.setProperty('outline', '2px solid #ba1222');
      this.elements['blue-score-box']?.style.removeProperty('outline');
    }

    const banner = this.elements['banner-text'];
    if (banner) {
      if (this.phase === 'DEPLOY_BLUE') {
        banner.innerHTML = 'Player 1: Secretly place your <strong>10 Blue Soldiers</strong> on the left side.';
      } else if (this.phase === 'DEPLOY_RED') {
        banner.innerHTML = 'Player 2: Secretly place your <strong>10 Red Soldiers</strong> on the right side.';
      } else if (this.phase === 'TURN_AIM') {
        if (this.mode === 'ONLINE_P2P' && this.activePlayer !== this.myOnlineRole) {
          banner.innerHTML = `<strong>OPPONENT'S TURN (${this.activePlayer.toUpperCase()}):</strong> Opponent is aiming... Watch the paper fold!`;
        } else {
          banner.innerHTML = `<strong>${this.activePlayer.toUpperCase()} TURN:</strong> Put a pen dot on YOUR side to guess enemy positions!`;
        }
      } else if (this.phase === 'TURN_FOLD') {
        banner.innerHTML = 'Folding notebook paper... Transferring fresh ink!';
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
