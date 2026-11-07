"""
Procedural Tactile ASMR Sound Generator for Soldiers (Paper War 1v1)
Uses standard Python math, struct, and wave modules. Zero dependencies!
Generates authentic physical sounds:
- Pen scratches & dot presses
- Paper folds, slaps, and unfolds
- Soldier kill snaps
- Victory school chime
"""

import wave
import struct
import math
import random
import os

AUDIO_DIR = os.path.abspath("public/audio")
os.makedirs(AUDIO_DIR, exist_ok=True)
SAMPLE_RATE = 44100

def save_wav(filename, samples):
    filepath = os.path.join(AUDIO_DIR, filename)
    with wave.open(filepath, 'w') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(SAMPLE_RATE)
        # Clamp & pack
        raw_data = bytearray()
        for s in samples:
            clamped = max(-1.0, min(1.0, s))
            val = int(clamped * 32767.0)
            raw_data.extend(struct.pack('<h', val))
        wav_file.writeframes(raw_data)
    print(f"--> Generated Audio: {filename} ({len(samples)/SAMPLE_RATE:.2f}s)")

def generate_pen_scratch():
    # Friction noise: filtered white noise with rapid micro amplitude variations
    duration = 0.35
    num_samples = int(SAMPLE_RATE * duration)
    samples = []
    prev = 0.0
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        env = math.sin(math.pi * (i / num_samples)) ** 0.5  # smooth envelope
        white = random.uniform(-1.0, 1.0)
        # High-pass filter for paper friction 'scratch'
        filtered = white - 0.85 * prev
        prev = white
        # Add intermittent micro clicks
        click = 0.0
        if random.random() < 0.015:
            click = random.uniform(-0.5, 0.5)
        samples.append((filtered * 0.35 + click) * env)
    save_wav("pen_scratch.wav", samples)

def generate_pen_dot():
    # Quick solid tap: low frequency pop + high paper friction click
    duration = 0.12
    num_samples = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 45.0)  # fast decay
        # Solid wood/paper tap (180 Hz) + tip click (1200 Hz)
        tap = math.sin(2 * math.pi * 180 * t) * 0.7
        click = math.sin(2 * math.pi * 1250 * t) * 0.4
        noise = random.uniform(-0.15, 0.15)
        samples.append((tap + click + noise) * env)
    save_wav("pen_dot.wav", samples)

def generate_paper_fold():
    # Soft rushing whoosh + subtle paper crinkles
    duration = 0.65
    num_samples = int(SAMPLE_RATE * duration)
    samples = []
    smooth_noise = 0.0
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        env = math.sin(math.pi * (i / num_samples)) ** 1.5
        # Low-pass noise for paper moving through air
        white = random.uniform(-1.0, 1.0)
        smooth_noise = 0.92 * smooth_noise + 0.08 * white
        # Paper crinkle pop
        crinkle = 0.0
        if random.random() < 0.008:
            crinkle = random.uniform(-0.4, 0.4)
        samples.append((smooth_noise * 0.8 + crinkle) * env)
    save_wav("paper_fold.wav", samples)

def generate_paper_slap():
    # Firm table slap / paper pressing down firmly
    duration = 0.28
    num_samples = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 22.0)
        # Deep wood desk resonance (120 Hz) + sharp slap (800 Hz)
        desk_thud = math.sin(2 * math.pi * 110 * t) * 0.8
        slap_high = math.sin(2 * math.pi * 750 * t) * 0.4
        flesh_press = random.uniform(-0.3, 0.3) * math.exp(-t * 60.0)
        samples.append((desk_thud + slap_high + flesh_press) * env)
    save_wav("paper_slap.wav", samples)

def generate_paper_unfold():
    # Crisp peel opening with flutter
    duration = 0.45
    num_samples = int(SAMPLE_RATE * duration)
    samples = []
    smooth = 0.0
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        env = math.sin(math.pi * (i / num_samples))
        white = random.uniform(-1.0, 1.0)
        smooth = 0.88 * smooth + 0.12 * white
        flutter = math.sin(2 * math.pi * 18 * t) * 0.2  # 18 Hz paper flutter
        samples.append(smooth * (0.6 + flutter) * env)
    save_wav("paper_unfold.wav", samples)

def generate_hit_kill():
    # Sharp pencil snap / ink tear + aggressive scribble
    duration = 0.50
    num_samples = int(SAMPLE_RATE * duration)
    samples = []
    prev = 0.0
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        # Initial sharp snap (first 40ms)
        snap = 0.0
        if t < 0.04:
            snap = math.sin(2 * math.pi * 1400 * t) * math.exp(-t * 120.0) * 1.5
        # Followed by aggressive scribble scratch
        white = random.uniform(-1.0, 1.0)
        scratch = white - 0.7 * prev
        prev = white
        scribble_mod = math.sin(2 * math.pi * 12 * t)  # back and forth scribble
        env = math.exp(-t * 6.0)
        samples.append((snap + scratch * 0.5 * abs(scribble_mod)) * env)
    save_wav("hit_kill.wav", samples)

def generate_victory_bell():
    # Playful brass desk bell / chime (two harmonic rings: 880Hz A5 + 1320Hz E6)
    duration = 1.2
    num_samples = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 3.5)
        chime1 = math.sin(2 * math.pi * 880 * t) * 0.6
        chime2 = math.sin(2 * math.pi * 1320 * t) * 0.3
        chime3 = math.sin(2 * math.pi * 2640 * t) * 0.1
        samples.append((chime1 + chime2 + chime3) * env)
    save_wav("victory_bell.wav", samples)

if __name__ == "__main__":
    print("=== Generating Procedural ASMR Audio Assets ===")
    generate_pen_scratch()
    generate_pen_dot()
    generate_paper_fold()
    generate_paper_slap()
    generate_paper_unfold()
    generate_hit_kill()
    generate_victory_bell()
    print("=== All Audio Assets Generated Successfully! ===")
