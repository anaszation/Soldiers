/**
 * Bulletproof Tactile ASMR Foley & Childish War Audio Engine
 * Supports:
 * 1. Looping childish war background music (toy march snare, mouth pew-pew pops, cute bugle)
 * 2. Authentic tactile pen & paper sound effects (pen click, scratches, paper fold, rub, slap, unfold)
 * 3. Comedic comic hit explosions & miss sounds
 * 4. Automatic AudioContext unlocking on any user gesture
 */

export class SoundManager {
  private ctx: AudioContext | null = null;
  private soundBuffers: Map<string, AudioBuffer> = new Map();
  private audioElements: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private bgMusicSource: AudioBufferSourceNode | null = null;
  private bgMusicElement: HTMLAudioElement | null = null;
  public isMusicPlaying: boolean = false;

  private soundUrls: Record<string, string> = {
    click: '/audio/pen_click.wav',
    scratch: '/audio/pen_scratch.wav',
    dot: '/audio/pen_dot.wav',
    fold: '/audio/paper_fold.wav',
    rub: '/audio/paper_rub.wav',
    slap: '/audio/paper_slap.wav',
    unfold: '/audio/paper_unfold.wav',
    kill: '/audio/hit_kill.wav',
    smudge: '/audio/miss_smudge.wav',
    bell: '/audio/victory_bell.wav',
    war_bg: '/audio/childish_war_bg.wav',
  };

  constructor() {
    this.initAudioElements();
    this.setupUnlockListeners();
  }

  private initAudioElements() {
    for (const [key, url] of Object.entries(this.soundUrls)) {
      try {
        const audio = new Audio(url);
        audio.preload = 'auto';
        if (key === 'war_bg') {
          audio.loop = true;
          this.bgMusicElement = audio;
        } else {
          this.audioElements.set(key, audio);
        }
      } catch (e) {}
    }
  }

  private setupUnlockListeners() {
    const unlock = () => {
      this.ensureContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };

    window.addEventListener('click', unlock);
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  private ensureContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.90;
        this.masterGain.connect(this.ctx.destination);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.35; // Comfortable, ambient background volume
        this.musicGain.connect(this.masterGain);

        this.loadWebAudioBuffers();
      } catch (err) {
        console.warn('Web Audio API not supported, using HTMLAudioElement fallback:', err);
      }
    }
    return this.ctx;
  }

  private async loadWebAudioBuffers() {
    if (!this.ctx) return;
    for (const [key, url] of Object.entries(this.soundUrls)) {
      try {
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const arrayBuf = await resp.arrayBuffer();
        const audioBuf = await this.ctx.decodeAudioData(arrayBuf);
        this.soundBuffers.set(key, audioBuf);
      } catch (err) {
        console.warn(`Buffer decode failed for ${key}, using element fallback:`, err);
      }
    }
  }

  /**
   * Starts looping the childish war background music
   */
  public startBackgroundMusic() {
    if (this.isMusicPlaying || !this.enabled) return;
    this.isMusicPlaying = true;

    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const bgBuffer = this.soundBuffers.get('war_bg');
    if (ctx && this.musicGain && bgBuffer) {
      try {
        this.bgMusicSource = ctx.createBufferSource();
        this.bgMusicSource.buffer = bgBuffer;
        this.bgMusicSource.loop = true;
        this.bgMusicSource.connect(this.musicGain);
        this.bgMusicSource.start(0);
        return;
      } catch (e) {}
    }

    // Fallback: HTML5 Audio Element Loop
    if (this.bgMusicElement) {
      this.bgMusicElement.volume = 0.35;
      this.bgMusicElement.play().catch(() => {});
    }
  }

  public stopBackgroundMusic() {
    this.isMusicPlaying = false;
    if (this.bgMusicSource) {
      try {
        this.bgMusicSource.stop();
        this.bgMusicSource.disconnect();
      } catch (e) {}
      this.bgMusicSource = null;
    }
    if (this.bgMusicElement) {
      this.bgMusicElement.pause();
      this.bgMusicElement.currentTime = 0;
    }
  }

  /**
   * Plays a game sound effect with pitch randomization and instant playback
   */
  public play(
    name: 'click' | 'scratch' | 'dot' | 'fold' | 'rub' | 'slap' | 'unfold' | 'kill' | 'smudge' | 'bell',
    pitchVariance = 0.08,
    volume = 1.0
  ) {
    if (!this.enabled) return;

    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Method 1: Web Audio Buffer (Best Quality + Pitch Modulation)
    const buffer = this.soundBuffers.get(name);
    if (ctx && this.masterGain && buffer) {
      try {
        const source = ctx.createBufferSource();
        source.buffer = buffer;

        if (pitchVariance > 0) {
          const semitoneShift = (Math.random() * 2 - 1) * pitchVariance;
          source.playbackRate.value = Math.pow(2, semitoneShift / 12);
        }

        const gain = ctx.createGain();
        gain.gain.value = volume;
        source.connect(gain);
        gain.connect(this.masterGain);
        source.start(0);
        return;
      } catch (e) {}
    }

    // Method 2: HTML5 Audio Element Fallback
    const elem = this.audioElements.get(name);
    if (elem) {
      try {
        const clone = elem.cloneNode(true) as HTMLAudioElement;
        clone.volume = Math.max(0, Math.min(1, volume * 0.9));
        clone.play().catch(() => {});
        return;
      } catch (e) {}
    }
  }

  public toggleMute(): boolean {
    this.enabled = !this.enabled;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.enabled ? 0.90 : 0.0, this.ctx.currentTime);
    }
    if (this.bgMusicElement) {
      this.bgMusicElement.muted = !this.enabled;
    }
    return this.enabled;
  }

  public isMuted(): boolean {
    return !this.enabled;
  }
}

export const soundManager = new SoundManager();
