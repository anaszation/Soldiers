"""
Advanced Tactile ASMR & Childish War Audio Generator for Soldiers
Uses pure Python standard math, struct, random, and wave modules.
Generates:
1. Authentic tactile pen & paper sound effects (pen click, scratches, paper rub, fold, slap, unfold)
2. Comedic comic hit explosions & miss sounds
3. Childish war background music loop (toy march snare, cute mouth pew-pew pops, playground war ambiance)
"""

import wave
import struct
import math
import random
import os

AUDIO_DIR = os.path.abspath("public/audio")
os.makedirs(AUDIO_DIR, exist_ok=True)
SAMPLE_RATE = 44100

def write_wav(filename, samples, sample_rate=SAMPLE_RATE):
    filepath = os.path.join(AUDIO_DIR, filename)
    with wave.open(filepath, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(sample_rate)
        raw = bytearray()
        for s in samples:
            clamped = max(-1.0, min(1.0, s))
            raw.extend(struct.pack('<h', int(clamped * 32767.0)))
        f.writeframes(raw)
    print(f"--> Generated: {filename} ({len(samples)/sample_rate:.2f}s)")

# 1. Authentic Retractable Ballpoint Pen Click (Click-Clack)
def gen_pen_click():
    duration = 0.16
    samples = []
    num = int(SAMPLE_RATE * duration)
    for i in range(num):
        t = i / SAMPLE_RATE
        s = 0.0
        # First sharp latch click at t = 0
        if t < 0.04:
            s += math.sin(2 * math.pi * 2800 * t) * math.exp(-t * 220.0) * 0.9
            s += (random.random() * 2 - 1) * math.exp(-t * 300.0) * 0.5
        # Secondary spring release clack at t = 0.05
        if t >= 0.05 and t < 0.12:
            t2 = t - 0.05
            s += math.sin(2 * math.pi * 1900 * t2) * math.exp(-t2 * 180.0) * 0.7
            s += math.sin(2 * math.pi * 950 * t2) * math.exp(-t2 * 120.0) * 0.4
        samples.append(s)
    write_wav("pen_click.wav", samples)

# 2. Gritty Ballpoint Pen Scratch
def gen_pen_scratch():
    duration = 0.28
    samples = []
    num = int(SAMPLE_RATE * duration)
    prev = 0.0
    for i in range(num):
        t = i / SAMPLE_RATE
        env = math.sin(math.pi * (i / num)) ** 0.6
        white = random.uniform(-1.0, 1.0)
        # High-pass filter for sharp rollerball paper friction
        filtered = white - 0.82 * prev
        prev = white
        # Micro clicks of rollerball turning
        micro_click = 0.0
        if random.random() < 0.035:
            micro_click = random.uniform(-0.6, 0.6)
        # 1200Hz paper vibration resonance
        resonance = math.sin(2 * math.pi * 1250 * t) * 0.15
        samples.append((filtered * 0.4 + micro_click + resonance) * env)
    write_wav("pen_scratch.wav", samples)

# 3. Firm Dot Press on Notebook Paper
def gen_pen_dot():
    duration = 0.12
    samples = []
    num = int(SAMPLE_RATE * duration)
    for i in range(num):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 55.0)
        # Initial sharp nib impact (2400 Hz) + wood desk body (160 Hz)
        tip = math.sin(2 * math.pi * 2400 * t) * math.exp(-t * 140.0) * 0.7
        thud = math.sin(2 * math.pi * 160 * t) * 0.65
        paper_crack = (random.random() * 2 - 1) * math.exp(-t * 200.0) * 0.35
        samples.append((tip + thud + paper_crack) * env)
    write_wav("pen_dot.wav", samples)

# 4. Realistic Paper Fold Whoosh
def gen_paper_fold():
    duration = 0.55
    samples = []
    num = int(SAMPLE_RATE * duration)
    smooth = 0.0
    for i in range(num):
        t = i / SAMPLE_RATE
        env = math.sin(math.pi * (i / num)) ** 1.3
        white = random.uniform(-1.0, 1.0)
        smooth = 0.90 * smooth + 0.10 * white
        # Paper crinkle micro-flutter
        flutter = math.sin(2 * math.pi * 24 * t) * 0.2
        crinkle = 0.0
        if random.random() < 0.012:
            crinkle = random.uniform(-0.4, 0.4)
        samples.append((smooth * (0.7 + flutter) + crinkle) * env * 1.1)
    write_wav("paper_fold.wav", samples)

# 5. Hand / Pen Rubbing over the Crease to Transfer Ink
def gen_paper_rub():
    duration = 0.42
    samples = []
    num = int(SAMPLE_RATE * duration)
    prev = 0.0
    for i in range(num):
        t = i / SAMPLE_RATE
        # Three rhythmic back-and-forth rubs
        rub_mod = abs(math.sin(2 * math.pi * 7.5 * t))
        white = random.uniform(-1.0, 1.0)
        friction = white - 0.75 * prev
        prev = white
        # Warm paper rubbing bandpass
        body = math.sin(2 * math.pi * 320 * t) * 0.25
        samples.append((friction * 0.45 + body) * rub_mod * math.sin(math.pi * (i / num)))
    write_wav("paper_rub.wav", samples)

# 6. Table Slap (Fold Contact Press)
def gen_paper_slap():
    duration = 0.25
    samples = []
    num = int(SAMPLE_RATE * duration)
    for i in range(num):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 26.0)
        # Deep desk impact
        wood = math.sin(2 * math.pi * 95 * t) * 0.8
        paper_slap = math.sin(2 * math.pi * 650 * t) * 0.45 * math.exp(-t * 60.0)
        flesh = (random.random() * 2 - 1) * math.exp(-t * 80.0) * 0.3
        samples.append((wood + paper_slap + flesh) * env)
    write_wav("paper_slap.wav", samples)

# 7. Paper Unfold & Peel Open
def gen_paper_unfold():
    duration = 0.48
    samples = []
    num = int(SAMPLE_RATE * duration)
    smooth = 0.0
    for i in range(num):
        t = i / SAMPLE_RATE
        env = math.sin(math.pi * (i / num))
        white = random.uniform(-1.0, 1.0)
        smooth = 0.86 * smooth + 0.14 * white
        peel = math.sin(2 * math.pi * 32 * t) * 0.25
        samples.append(smooth * (0.65 + peel) * env)
    write_wav("paper_unfold.wav", samples)

# 8. Childish Battle Hit: Comic Mouth "KABOOM!" + Ink Splatter Scribble
def gen_hit_kill():
    duration = 0.65
    samples = []
    num = int(SAMPLE_RATE * duration)
    prev = 0.0
    for i in range(num):
        t = i / SAMPLE_RATE
        # 1. Initial comic pop & mouth explosion: low punch (80Hz) + crunchy noise
        pop = math.sin(2 * math.pi * 90 * t) * math.exp(-t * 14.0) * 1.1
        mouth_boom = (random.random() * 2 - 1) * math.exp(-t * 18.0) * 0.8
        # 2. Comic cartoon boing / high ping (480 Hz decaying to 240 Hz)
        boing_freq = 480.0 - t * 300.0
        boing = math.sin(2 * math.pi * max(100.0, boing_freq) * t) * math.exp(-t * 8.0) * 0.4
        # 3. Aggressive ink scribble scratch
        white = random.uniform(-1.0, 1.0)
        scratch = (white - 0.7 * prev) * 0.35 * math.sin(2 * math.pi * 14 * t)
        prev = white
        samples.append((pop + mouth_boom + boing + scratch) * math.exp(-t * 4.5))
    write_wav("hit_kill.wav", samples)

# 9. Comical Miss: Cartoon Slide-Whistle Down + Soft Smudge
def gen_miss_smudge():
    duration = 0.40
    samples = []
    num = int(SAMPLE_RATE * duration)
    for i in range(num):
        t = i / SAMPLE_RATE
        # Slide whistle down: 800 Hz down to 250 Hz
        freq = 800.0 - t * 1400.0
        if freq > 150:
            whistle = math.sin(2 * math.pi * freq * t) * math.exp(-t * 6.0) * 0.4
        else:
            whistle = 0.0
        # Soft ink smudge plop at the end (t = 0.2)
        plop = 0.0
        if t >= 0.18:
            t2 = t - 0.18
            plop = math.sin(2 * math.pi * 140 * t2) * math.exp(-t2 * 40.0) * 0.6
        samples.append(whistle + plop)
    write_wav("miss_smudge.wav", samples)

# 10. Victory School Chime
def gen_victory_bell():
    duration = 1.4
    samples = []
    num = int(SAMPLE_RATE * duration)
    for i in range(num):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 2.8)
        # Brass bell harmonic triad (880Hz A5, 1108Hz C#6, 1320Hz E6)
        c1 = math.sin(2 * math.pi * 880 * t) * 0.55
        c2 = math.sin(2 * math.pi * 1108 * t) * 0.35
        c3 = math.sin(2 * math.pi * 1320 * t) * 0.25
        c4 = math.sin(2 * math.pi * 2640 * t) * 0.1
        samples.append((c1 + c2 + c3 + c4) * env)
    write_wav("victory_bell.wav", samples)

# 11. Childish War Background Music Loop (8.0 Seconds Seamless Loop)
def gen_childish_war_bg():
    duration = 8.0  # 8-second seamless loop at 120 BPM (16 beats, 0.5s per beat)
    samples = [0.0] * int(SAMPLE_RATE * duration)
    num = len(samples)

    # A. Snare Drum Marching Cadence (Playful toy soldier drums)
    # Rhythms on 16th notes: beat accents on 0, 1.5, 2, 3, 3.5
    for beat in range(16):
        t_start = beat * 0.5
        # Drum pattern: hit on main beats + playful double-taps on 2 and 6
        sub_beats = [0.0]
        if beat % 2 == 1:
            sub_beats.extend([0.16, 0.32]) # marching roll
        for offset in sub_beats:
            hit_t = t_start + offset
            idx_start = int(hit_t * SAMPLE_RATE)
            decay_len = int(SAMPLE_RATE * 0.08)
            for j in range(decay_len):
                idx = idx_start + j
                if idx < num:
                    t_j = j / SAMPLE_RATE
                    noise = (random.random() * 2 - 1) * math.exp(-t_j * 40.0) * 0.22
                    tone = math.sin(2 * math.pi * 180 * t_j) * math.exp(-t_j * 30.0) * 0.18
                    samples[idx] += noise + tone

    # B. Playful Childish Mouth "Pew-Pew!" Laser / Toy Rifle Pops
    # Placed on beats 2, 6, 10, 14
    pew_times = [1.0, 3.0, 5.0, 7.0]
    for pt in pew_times:
        idx_start = int(pt * SAMPLE_RATE)
        pew_len = int(SAMPLE_RATE * 0.14)
        for j in range(pew_len):
            idx = idx_start + j
            if idx < num:
                t_j = j / SAMPLE_RATE
                # Laser pitch sweep 1600Hz down to 300Hz
                f = 1600.0 - t_j * 9000.0
                f = max(200.0, f)
                s = math.sin(2 * math.pi * f * t_j) * math.exp(-t_j * 22.0) * 0.28
                samples[idx] += s

    # C. Playful Toy Bugle / Whistle Melody (Childish battle fanfare)
    # Notes: C5 (523), E5 (659), G5 (784), C6 (1046) - classic bugle call!
    bugle_notes = [
        (0.0, 0.35, 523.25), # C5
        (0.5, 0.35, 659.25), # E5
        (1.0, 0.70, 784.00), # G5
        (2.0, 0.35, 659.25), # E5
        (2.5, 0.35, 784.00), # G5
        (3.0, 0.90, 1046.5), # C6 high
        (4.0, 0.35, 784.00), # G5
        (4.5, 0.35, 659.25), # E5
        (5.0, 0.70, 784.00), # G5
        (6.0, 0.35, 659.25), # E5
        (6.5, 0.35, 523.25), # C5
        (7.0, 0.85, 523.25), # C5
    ]
    for (start_t, note_dur, freq) in bugle_notes:
        idx_start = int(start_t * SAMPLE_RATE)
        dur_samples = int(note_dur * SAMPLE_RATE)
        for j in range(dur_samples):
            idx = idx_start + j
            if idx < num:
                t_j = j / SAMPLE_RATE
                env = math.sin(math.pi * (j / dur_samples)) ** 0.8
                # Toy trumpet sound: sine + 2nd + 3rd harmonic
                tone = (
                    math.sin(2 * math.pi * freq * t_j) * 0.16 +
                    math.sin(2 * math.pi * freq * 2 * t_j) * 0.08 +
                    math.sin(2 * math.pi * freq * 3 * t_j) * 0.04
                )
                samples[idx] += tone * env

    # D. Master normalization to prevent clipping and ensure smooth looping
    max_val = max(abs(s) for s in samples)
    if max_val > 0.95:
        samples = [s * (0.92 / max_val) for s in samples]

    write_wav("childish_war_bg.wav", samples)

if __name__ == "__main__":
    print("=== Synthesizing Tactile ASMR & Childish War Audio ===")
    gen_pen_click()
    gen_pen_scratch()
    gen_pen_dot()
    gen_paper_fold()
    gen_paper_rub()
    gen_paper_slap()
    gen_paper_unfold()
    gen_hit_kill()
    gen_miss_smudge()
    gen_victory_bell()
    gen_childish_war_bg()
    print("=== All Sounds Synthesized Successfully! ===")
