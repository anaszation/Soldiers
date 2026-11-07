/**
 * Tactile ASMR Foley Audio Engine
 * Uses Web Audio API for positional audio, realistic pitch micro-variations,
 * and seamless playback of procedural paper & pen audio effects.
 */

export class SoundManager {
  private ctx: AudioContext | null = null;
  private soundBuffers: Map<string, AudioBuffer> = new Map();
  private enabled: boolean = true;
  private masterGain: GainNode | null = null;

  private soundUrls: Record<string, string> = {
    scratch: '/audio/pen_scratch.wav',
    dot: '/audio/pen_dot.wav',
    fold: '/audio/paper_fold.wav',
    slap: '/audio/paper_slap.wav',
    unfold: '/audio/paper_unfold.wav',
    kill: '/audio/hit_kill.wav',
    bell: '/audio/victory_bell.wav',
  };

  constructor() {
    // Lazy initialize on first user gesture
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.85;
      this.masterGain.connect(this.ctx.destination);
      this.loadAllSounds();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private async loadAllSounds() {
    if (!this.ctx) return;
    for (const [key, url] of Object.entries(this.soundUrls)) {
      try {
        const resp = await fetch(url);
        const arrayBuf = await resp.arrayBuffer();
        const audioBuf = await this.ctx.decodeAudioData(arrayBuf);
        this.soundBuffers.set(key, audioBuf);
      } catch (err) {
        console.warn(`Could not preload audio "${key}":`, err);
      }
    }
  }

  public play(name: 'scratch' | 'dot' | 'fold' | 'slap' | 'unfold' | 'kill' | 'bell', pitchVariance = 0.08, volume = 1.0) {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const buffer = this.soundBuffers.get(name);
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    // Pitch randomization for human tactile foley feel
    if (pitchVariance > 0) {
      const semitoneShift = (Math.random() * 2 - 1) * pitchVariance;
      source.playbackRate.value = Math.pow(2, semitoneShift / 12);
    }

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(this.masterGain);

    source.start(0);
  }

  public toggleMute(): boolean {
    this.enabled = !this.enabled;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.enabled ? 0.85 : 0.0, this.ctx.currentTime);
    }
    return this.enabled;
  }

  public isMuted(): boolean {
    return !this.enabled;
  }
}

export const soundManager = new SoundManager();
