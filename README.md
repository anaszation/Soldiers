# 📝 SOLDIERS (Paper War 1v1)

> A nostalgic, tactile 1v1 paper & ballpoint pen duel game. Set on a wooden school desk, featuring dynamic paper-folding physics, hand-drawn ink doodles, and authentic tactile ASMR.

---

## 🎮 The Nostalgic Gameplay Loop

Remember folding school notebook paper in half, drawing a blind dot with a ballpoint pen, folding the paper over, and rubbing the back to mirror the ink hit onto your friend's side? That classic school desk duel is now brought to life with modern 3D dynamics and tactile physics.

```
+-----------------------------------+-----------------------------------+
|          PLAYER 1 (BLUE)          |          PLAYER 2 (RED)           |
|                                   |                                   |
|       (10 Soldier Doodles)        |       (10 Soldier Doodles)        |
|                                   |                                   |
|   Target Point ⦿                 |   Hidden until hit                |
|   (Aim on own half)               |                                   |
+-----------------------------------+-----------------------------------+
                  \                                   /
                   \_______ THE PAPER FOLD __________/
                      (Ink mirrors across crease)
```

### 1. Phase 1: Secret Deployment
- Each player gets 10 hand-drawn doodle soldiers (infantry, snipers, tanks, bazooka squads).
- Players secretly place their 10 soldiers across their half of the notebook sheet. Fog of war prevents the opponent from seeing placements.

### 2. Phase 2: Rock-Paper-Scissors Initiative
- Quick hand-drawn Rock, Paper, Scissors showdown to decide who strikes first.

### 3. Phase 3: The Blind Strike & The Paper Fold
- The active player chooses a spot on their own side of the paper and presses their pen to draw a solid ink dot.
- **The Fold:** The 3D paper lifts from the table, bends along the center crease, and presses down onto the opponent's side.
- **The Mirror Hit:** The fresh ink transfers onto the enemy's coordinates ($x' = 2 \cdot x_{center} - x$).
  - **Direct Hit:** Opponent's soldier is scratched out with an aggressive ink doodle / splatter!
  - **Miss:** An ink smudge remains on the paper, giving both players tactical history of previous shots.

### 4. Phase 4: Turn Rotation & Victory
- Turns alternate until one player eliminates all 10 enemy soldiers.

---

## 🎨 Art Direction: Real Tactile Environment, Zero "AI Slop"

- **The Setting:** A warm, nostalgic wooden study desk with subtle scratches, pencil shavings, an eraser, and a desk lamp casting dynamic shadows.
- **The Paper:** Realistic quad-ruled notebook paper with authentic fiber texture, edge creases, and volumetric shadow when folded.
- **The Ink:** Fluid ballpoint pen behavior (Bic blue and red hues), pressure-sensitive ink deposits, and slight drying smudge.
- **The Audio (ASMR):**
  - Crisp pen scratches on notebook paper.
  - Soft paper lift and crease flutter.
  - Heavy paper press and table tap.
  - Squeaky eraser and celebratory pencil snap.

---

## 🛠 Recommended Modern Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **3D Rendering** | Three.js / React Three Fiber (R3F) | Dynamic 60fps desk environment, PBR materials, real-time lighting |
| **Paper Physics / Fold** | GLSL Vertex Shader or Bone Mesh | Curvature deformation simulating paper bending and pressing |
| **Dynamic Drawing** | Offscreen HTML5 Canvas Texture | Real-time pen drawing, ink bleeding, and cross-out animations |
| **Build Tool** | Vite + TypeScript | Lightning-fast development & clean modular code |
| **Audio Engine** | Howler.js / Web Audio API | Positional tactile ASMR sound effects |
| **Multiplayer** | PeerJS (WebRTC) / PartyKit | Zero-latency peer-to-peer 1v1 paper duel |
| **3D Asset Pipeline** | Blender 3D (glTF/GLB) | Custom desk props, ballpoint pens, and paper rigs |

---

## 📂 Repository Structure

```
Soldiers/
├── public/                 # Static assets (audio, textures, icons)
│   ├── audio/              # ASMR pen scratches, paper folds, hits
│   ├── models/             # Blender GLTF models (desk, pens, props)
│   └── textures/           # Notebook grid, paper normal maps, wood desk
├── src/
│   ├── assets/             # Hand-drawn soldier sprites & SVGs
│   ├── components/         # 3D canvas, UI overlays, desk controls
│   ├── game/               # Core state machine (deployment, RPS, fold, hit)
│   ├── shaders/            # Custom GLSL paper fold & ink shader
│   └── audio/              # Spatial sound effects engine
├── docs/                   # Design roadmap, math models, Blender specs
└── package.json
```

---

## 🚀 Quick Start (Once Git & Node are setup)

```bash
git clone https://github.com/anaszation/Soldiers.git
cd Soldiers
npm install
npm run dev
```
