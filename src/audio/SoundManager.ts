/**
 * Bulletproof Tactile ASMR Foley Audio Engine
 * Supports:
 * 1. Preloaded Web Audio API buffers with pitch randomization.
 * 2. Instant HTML5 Audio element fallback.
 * 3. Real-time procedural Web Audio oscillator/noise synthesis fallback.
 * 4. Automatic AudioContext unlocking on any user gesture.
 */

export class SoundManager {
  private ctx: AudioContext | null = null;
  private soundBuffers: Map<string, AudioBuffer> = new Map();
  private audioElements: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private masterGain: GainNode | null = null;
  private isUnlocked: boolean = false;

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
    this.initAudioElements();
    this.setupUnlockListeners();
  }

  private initAudioElements() {
    for (const [key, url] of Object.entries(this.soundUrls)) {
      try {
        const audio = new Audio(url);
        audio.preload = 'auto';
        this.audioElements.set(key, audio);
      } catch (e) {
        // Fallback available
      }
    }
  }

  private setupUnlockListeners() {
    const unlock = () => {
      this.ensureContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.isUnlocked = true;
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
        this.masterGain.gain.value = 0.85;
        this.masterGain.connect(this.ctx.destination);
        this.loadWebAudioBuffers();
      } catch (err) {
        console.warn('Web Audio API not supported, falling back to Audio elements:', err);
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
        console.warn(`Buffer decode failed for ${key}, will use element fallback:`, err);
      }
    }
  }

  public play(name: 'scratch' | 'dot' | 'fold' | 'slap' | 'unfold' | 'kill' | 'bell', pitchVariance = 0.08, volume = 1.0) {
    if (!this.enabled) return;

    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Method 1: Play via Web Audio Buffer (Best Quality + Pitch Modulation)
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
      } catch (e) {
        // Fall through to fallback
      }
    }

    // Method 2: Fallback to HTML5 Audio Element
    const elem = this.audioElements.get(name);
    if (elem) {
      try {
        const clone = elem.cloneNode(true) as HTMLAudioElement;
        clone.volume = Math.max(0, Math.min(1, volume * 0.85));
        clone.play().catch(() => {
          // If browser blocked audio element, synthesize procedurally
          this.synthesizeProceduralSound(name, volume);
        });
        return;
      } catch (e) {
        // Fall through to procedural
      }
    }

    // Method 3: Infallible Procedural Web Audio Synthesis
    this.synthesizeProceduralSound(name, volume);
  }

  /**
   * Procedural Audio Synthesis Fallback using pure Web Audio Oscillators
   * Guarantees tactile feedback even if audio files failed to load.
   */
  private synthesizeProceduralSound(name: string, volume: number) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.connect(this.masterGain);
    osc.connect(gain);

    if (name === 'dot') {
      // Short firm tap: 150 Hz decaying fast
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.08);
      gain.gain.setValueAtTime(volume * 0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.start(t);
      osc.stop(t + 0.09);
    } else if (name === 'slap') {
      // Solid table thud: 110 Hz
      osc.frequency.setValueAtTime(110, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.18);
      gain.gain.setValueAtTime(volume * 0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(t);
      osc.stop(t + 0.19);
    } else if (name === 'bell') {
      // High chime bell
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t);
      gain.gain.setValueAtTime(volume * 0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      osc.start(t);
      osc.stop(t + 0.85);
    } else {
      // White noise scratch / fold simulation
      try {
        const bufferSize = ctx.sampleRate * 0.2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = name === 'scratch' ? 'highpass' : 'bandpass';
        filter.frequency.value = name === 'scratch' ? 1200 : 600;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(volume * 0.4, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        whiteNoise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        whiteNoise.start(t);
        whiteNoise.stop(t + 0.22);
      } catch (err) {}
    }
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
