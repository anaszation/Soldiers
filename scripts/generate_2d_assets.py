"""
Procedural 2D Asset Generator for Soldiers (Paper War 1v1)
Generates:
1. 10 Blue and 10 Red Hand-Drawn Doodle Soldiers (SVG with rough pen aesthetic)
2. Rock-Paper-Scissors doodles
3. Ink hit crossout & miss smudge marks
4. Seamless quad-ruled notebook paper texture & paper fiber normal map
"""

import os
import math

DOODLES_DIR = os.path.abspath("public/doodles")
TEXTURES_DIR = os.path.abspath("public/textures")
os.makedirs(DOODLES_DIR, exist_ok=True)
os.makedirs(TEXTURES_DIR, exist_ok=True)

# Colors
BLUE_INK = "#1138a6"
RED_INK = "#ba1825"
PENCIL_INK = "#2a2d34"

def make_svg_wrapper(width, height, content):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">
  <defs>
    <filter id="rough-ink" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </defs>
  <g filter="url(#rough-ink)" stroke-linecap="round" stroke-linejoin="round">
{content}
  </g>
</svg>'''

def get_soldier_svg_content(soldier_type, color):
    # Returns inner SVG elements matching a handwritten ballpoint pen doodle
    sw = "3"  # stroke width
    
    if soldier_type == "rifleman":
        return f'''
    <!-- Helmet -->
    <path d="M 50 32 C 45 20, 75 20, 70 32 Z" fill="none" stroke="{color}" stroke-width="{sw}" />
    <!-- Head -->
    <circle cx="60" cy="35" r="9" fill="none" stroke="{color}" stroke-width="{sw}" />
    <circle cx="63" cy="34" r="1.5" fill="{color}" />
    <!-- Body -->
    <line x1="60" y1="44" x2="60" y2="78" stroke="{color}" stroke-width="{sw}" />
    <!-- Legs -->
    <polyline points="60,78 48,105 42,107" fill="none" stroke="{color}" stroke-width="{sw}" />
    <polyline points="60,78 72,105 78,107" fill="none" stroke="{color}" stroke-width="{sw}" />
    <!-- Arms holding rifle -->
    <polyline points="60,54 48,65 72,62" fill="none" stroke="{color}" stroke-width="{sw}" />
    <!-- Rifle & Bayonet -->
    <line x1="38" y1="67" x2="98" y2="58" stroke="{color}" stroke-width="3.5" />
    <line x1="98" y1="58" x2="108" y2="56" stroke="{color}" stroke-width="2" /> <!-- Bayonet -->
    <line x1="52" y1="65" x2="48" y2="74" stroke="{color}" stroke-width="2.5" /> <!-- Rifle stock -->
    '''

    elif soldier_type == "bazooka":
        return f'''
    <!-- Head & Helmet -->
    <circle cx="50" cy="38" r="9" fill="none" stroke="{color}" stroke-width="{sw}" />
    <path d="M 40 34 C 40 22, 60 22, 60 34 Z" fill="none" stroke="{color}" stroke-width="{sw}" />
    <!-- Body crouching -->
    <polyline points="50,47 52,75 42,102" fill="none" stroke="{color}" stroke-width="{sw}" />
    <polyline points="52,75 68,90 68,104" fill="none" stroke="{color}" stroke-width="{sw}" />
    <!-- Bazooka Tube -->
    <rect x="22" y="42" width="86" height="11" rx="2" fill="none" stroke="{color}" stroke-width="{sw}" />
    <line x1="108" y1="40" x2="114" y2="47" stroke="{color}" stroke-width="2.5" />
    <line x1="114" y1="47" x2="108" y2="55" stroke="{color}" stroke-width="2.5" />
    <line x1="22" y1="39" x2="16" y2="47" stroke="{color}" stroke-width="2.5" />
    <line x1="16" y1="47" x2="22" y2="56" stroke="{color}" stroke-width="2.5" />
    <!-- Arms holding tube -->
    <polyline points="50,56 62,64 74,53" fill="none" stroke="{color}" stroke-width="{sw}" />
    '''

    elif soldier_type == "sniper":
        return f'''
    <!-- Prone / Kneeling Sniper -->
    <circle cx="45" cy="48" r="8" fill="none" stroke="{color}" stroke-width="{sw}" />
    <!-- Ghillie cap with grass lines -->
    <path d="M 38 45 Q 45 38 52 45" stroke="{color}" stroke-width="{sw}" fill="none" />
    <line x1="42" y1="40" x2="40" y2="34" stroke="{color}" stroke-width="2" />
    <line x1="47" y1="39" x2="48" y2="33" stroke="{color}" stroke-width="2" />
    <!-- Torso leaning forward -->
    <polyline points="45,56 60,68 85,82" fill="none" stroke="{color}" stroke-width="{sw}" />
    <!-- Legs prone -->
    <polyline points="85,82 105,92 115,90" fill="none" stroke="{color}" stroke-width="{sw}" />
    <polyline points="85,82 98,98 108,102" fill="none" stroke="{color}" stroke-width="{sw}" />
    <!-- Long Sniper Rifle with Bipod & Scope -->
    <line x1="28" y1="62" x2="10" y2="60" stroke="{color}" stroke-width="3" />
    <line x1="28" y1="62" x2="8" y2="60" stroke="{color}" stroke-width="3" />
    <rect x="22" y="54" width="16" height="5" fill="none" stroke="{color}" stroke-width="2" /> <!-- Scope -->
    <!-- Bipod legs -->
    <polyline points="14,60 10,75" stroke="{color}" stroke-width="2" />
    <polyline points="14,60 18,75" stroke="{color}" stroke-width="2" />
    '''

    elif soldier_type == "tank":
        return f'''
    <!-- Tank Tracks -->
    <rect x="20" y="70" width="85" height="24" rx="12" fill="none" stroke="{color}" stroke-width="{sw}" />
    <circle cx="34" cy="82" r="6" fill="none" stroke="{color}" stroke-width="2" />
    <circle cx="50" cy="82" r="6" fill="none" stroke="{color}" stroke-width="2" />
    <circle cx="66" cy="82" r="6" fill="none" stroke="{color}" stroke-width="2" />
    <circle cx="82" cy="82" r="6" fill="none" stroke="{color}" stroke-width="2" />
    <line x1="20" y1="82" x2="28" y2="82" stroke="{color}" stroke-width="2" />
    <line x1="88" y1="82" x2="105" y2="82" stroke="{color}" stroke-width="2" />
    <!-- Tank Hull -->
    <polygon points="25,70 35,52 82,52 92,70" fill="none" stroke="{color}" stroke-width="{sw}" />
    <!-- Turret & Cannon -->
    <path d="M 42 52 C 42 38, 72 38, 72 52 Z" fill="none" stroke="{color}" stroke-width="{sw}" />
    <line x1="72" y1="44" x2="114" y2="44" stroke="{color}" stroke-width="4.5" />
    <rect x="110" y="41" width="5" height="6" stroke="{color}" stroke-width="2" fill="none" />
    <!-- Antenna & Little Flag -->
    <line x1="45" y1="40" x2="45" y2="22" stroke="{color}" stroke-width="1.8" />
    <polygon points="45,22 55,26 45,30" fill="{color}" stroke="{color}" />
    '''

    elif soldier_type == "commander":
        return f'''
    <!-- Commander with Peaked Cap & Megaphone / Sword -->
    <circle cx="60" cy="38" r="8" fill="none" stroke="{color}" stroke-width="{sw}" />
    <!-- Peaked Officer Cap -->
    <path d="M 50 32 L 72 32 L 76 26 L 46 26 Z" fill="none" stroke="{color}" stroke-width="{sw}" />
    <line x1="46" y1="32" x2="42" y2="35" stroke="{color}" stroke-width="2.5" />
    <!-- Torso -->
    <line x1="60" y1="46" x2="60" y2="78" stroke="{color}" stroke-width="{sw}" />
    <polygon points="56,52 64,52 60,60" fill="none" stroke="{color}" stroke-width="2" /> <!-- Tie/medal -->
    <!-- Legs -->
    <polyline points="60,78 48,106 44,107" fill="none" stroke="{color}" stroke-width="{sw}" />
    <polyline points="60,78 72,106 76,107" fill="none" stroke="{color}" stroke-width="{sw}" />
    <!-- Raised Arm with Sabre / Sword -->
    <polyline points="60,54 80,48 95,30" fill="none" stroke="{color}" stroke-width="{sw}" />
    <line x1="90" y1="34" x2="98" y2="28" stroke="{color}" stroke-width="2.5" /> <!-- Crossguard -->
    <!-- Other Arm with Binoculars -->
    <polyline points="60,54 48,58 54,42" fill="none" stroke="{color}" stroke-width="{sw}" />
    '''

    elif soldier_type == "scout":
        return f'''
    <!-- Scout running with backpack & walkie-talkie -->
    <circle cx="68" cy="34" r="8" fill="none" stroke="{color}" stroke-width="{sw}" />
    <!-- Running Torso angled -->
    <line x1="65" y1="42" x2="55" y2="72" stroke="{color}" stroke-width="{sw}" />
    <!-- Backpack -->
    <rect x="42" y="48" width="13" height="20" rx="3" fill="none" stroke="{color}" stroke-width="{sw}" />
    <line x1="48" y1="48" x2="48" y2="26" stroke="{color}" stroke-width="2" /> <!-- Whip antenna -->
    <!-- Running Legs -->
    <polyline points="55,72 38,82 28,102" fill="none" stroke="{color}" stroke-width="{sw}" />
    <polyline points="55,72 75,85 92,90" fill="none" stroke="{color}" stroke-width="{sw}" />
    <!-- Running Arms -->
    <polyline points="62,50 48,60 52,70" fill="none" stroke="{color}" stroke-width="{sw}" />
    <polyline points="62,50 82,48 90,38" fill="none" stroke="{color}" stroke-width="{sw}" />
    '''

    elif soldier_type == "machinegun":
        return f'''
    <!-- Heavy Machine Gunner behind tripod -->
    <circle cx="38" cy="42" r="8" fill="none" stroke="{color}" stroke-width="{sw}" />
    <polyline points="38,50 44,72 34,98" fill="none" stroke="{color}" stroke-width="{sw}" />
    <polyline points="44,72 56,92" fill="none" stroke="{color}" stroke-width="{sw}" />
    <!-- Hands gripping twin spade grips -->
    <polyline points="40,56 50,56 54,54" fill="none" stroke="{color}" stroke-width="{sw}" />
    <!-- Machine Gun Body & Heavy Barrel -->
    <rect x="52" y="48" width="38" height="10" fill="none" stroke="{color}" stroke-width="{sw}" />
    <line x1="90" y1="53" x2="114" y2="53" stroke="{color}" stroke-width="4" />
    <!-- Tripod Legs -->
    <line x1="72" y1="58" x2="62" y2="92" stroke="{color}" stroke-width="{sw}" />
    <line x1="72" y1="58" x2="88" y2="92" stroke="{color}" stroke-width="{sw}" />
    <!-- Ammo Belt curving out -->
    <path d="M 64 58 Q 62 76 52 82" stroke="{color}" stroke-width="3" fill="none" stroke-dasharray="2,3" />
    '''

    elif soldier_type == "mortar":
        return f'''
    <!-- Mortar Operator Crouched -->
    <circle cx="35" cy="54" r="8" fill="none" stroke="{color}" stroke-width="{sw}" />
    <polyline points="35,62 42,78 30,96" fill="none" stroke="{color}" stroke-width="{sw}" />
    <polyline points="42,78 52,94" fill="none" stroke="{color}" stroke-width="{sw}" />
    <!-- Hands dropping shell in tube -->
    <polyline points="38,68 56,58 64,48" fill="none" stroke="{color}" stroke-width="{sw}" />
    <ellipse cx="66" cy="44" rx="3" ry="5" fill="{color}" /> <!-- Mortar shell -->
    <!-- Mortar Tube angled at 60 degrees -->
    <line x1="58" y1="94" x2="82" y2="52" stroke="{color}" stroke-width="5" />
    <!-- Baseplate -->
    <line x1="48" y1="96" x2="68" y2="96" stroke="{color}" stroke-width="4" />
    <!-- Bipod Stand -->
    <line x1="70" y1="73" x2="84" y2="94" stroke="{color}" stroke-width="2.5" />
    '''

    elif soldier_type == "radio":
        return f'''
    <!-- Radio Squad with headset -->
    <circle cx="56" cy="36" r="8" fill="none" stroke="{color}" stroke-width="{sw}" />
    <!-- Headset arc and earcups -->
    <path d="M 48 36 C 48 24, 64 24, 64 36" stroke="{color}" stroke-width="2.5" fill="none" />
    <circle cx="48" cy="36" r="2.5" fill="{color}" />
    <circle cx="64" cy="36" r="2.5" fill="{color}" />
    <!-- Body -->
    <line x1="56" y1="44" x2="56" y2="76" stroke="{color}" stroke-width="{sw}" />
    <polyline points="56,76 46,104" fill="none" stroke="{color}" stroke-width="{sw}" />
    <polyline points="56,76 66,104" fill="none" stroke="{color}" stroke-width="{sw}" />
    <!-- Massive Field Radio on Back -->
    <rect x="62" y="44" width="22" height="28" rx="2" fill="none" stroke="{color}" stroke-width="{sw}" />
    <line x1="74" y1="44" x2="78" y2="16" stroke="{color}" stroke-width="2.5" /> <!-- Antenna -->
    <!-- Hand holding phone handset to ear -->
    <polyline points="56,52 46,58 48,40" fill="none" stroke="{color}" stroke-width="{sw}" />
    '''

    elif soldier_type == "bunker":
        return f'''
    <!-- Fortified Sandbag Bunker / Pillbox -->
    <!-- Sandbag rows -->
    <path d="M 22 92 Q 40 88 58 92 Q 76 88 94 92" stroke="{color}" stroke-width="4" fill="none" />
    <path d="M 26 82 Q 44 78 62 82 Q 80 78 98 82" stroke="{color}" stroke-width="4" fill="none" />
    <path d="M 30 72 Q 48 68 66 72 Q 84 68 102 72" stroke="{color}" stroke-width="4" fill="none" />
    <!-- Bunker Roof Slab -->
    <polygon points="18,62 108,62 100,50 26,50" fill="none" stroke="{color}" stroke-width="{sw}" />
    <!-- Machine Gun Vision Slit with gun barrel poking out -->
    <rect x="42" y="56" width="36" height="5" fill="{color}" />
    <line x1="60" y1="58" x2="78" y2="58" stroke="{color}" stroke-width="3" />
    <!-- Signal Flag on Roof -->
    <line x1="32" y1="50" x2="32" y2="24" stroke="{color}" stroke-width="2" />
    <polygon points="32,24 48,28 32,34" fill="{color}" stroke="{color}" />
    '''
    return ""

def generate_soldier_doodles():
    soldiers = [
        "rifleman", "bazooka", "sniper", "tank", "commander",
        "scout", "machinegun", "mortar", "radio", "bunker"
    ]
    for s in soldiers:
        # Blue version
        blue_svg = make_svg_wrapper(128, 128, get_soldier_svg_content(s, BLUE_INK))
        with open(os.path.join(DOODLES_DIR, f"soldier_{s}_blue.svg"), "w", encoding="utf-8") as f:
            f.write(blue_svg)

        # Red version
        red_svg = make_svg_wrapper(128, 128, get_soldier_svg_content(s, RED_INK))
        with open(os.path.join(DOODLES_DIR, f"soldier_{s}_red.svg"), "w", encoding="utf-8") as f:
            f.write(red_svg)
    print("--> Generated 20 Soldier SVGs (10 Blue, 10 Red)")

def generate_rps_doodles():
    # Rock (clenched fist)
    rock = make_svg_wrapper(128, 128, f'''
    <!-- Clenched Fist Doodle -->
    <circle cx="64" cy="64" r="32" fill="none" stroke="{PENCIL_INK}" stroke-width="3.5" />
    <path d="M 44 56 C 48 48 68 48 76 56" stroke="{PENCIL_INK}" stroke-width="3" fill="none" />
    <path d="M 42 66 C 46 58 72 58 84 66" stroke="{PENCIL_INK}" stroke-width="3" fill="none" />
    <path d="M 44 76 C 48 70 70 70 82 76" stroke="{PENCIL_INK}" stroke-width="3" fill="none" />
    <polyline points="40,84 34,102 74,106 82,90" stroke="{PENCIL_INK}" stroke-width="3.5" fill="none" />
    ''')
    with open(os.path.join(DOODLES_DIR, "rps_rock.svg"), "w", encoding="utf-8") as f:
        f.write(rock)

    # Paper (open hand)
    paper = make_svg_wrapper(128, 128, f'''
    <!-- Open Hand Doodle -->
    <path d="M 36 98 L 36 68 L 30 62 C 24 56 34 46 40 52 L 48 58 L 48 30 C 48 22 58 22 58 30 L 58 54 L 62 26 C 62 18 72 18 72 26 L 72 54 L 76 34 C 76 26 86 26 86 34 L 86 62 L 90 48 C 90 40 98 42 98 48 L 94 76 C 90 94 78 102 60 102 Z" fill="none" stroke="{PENCIL_INK}" stroke-width="3" />
    ''')
    with open(os.path.join(DOODLES_DIR, "rps_paper.svg"), "w", encoding="utf-8") as f:
        f.write(paper)

    # Scissors (peace / cutting sign)
    scissors = make_svg_wrapper(128, 128, f'''
    <!-- Scissors Peace / Cut Doodle -->
    <path d="M 42 98 L 42 72 L 52 26 C 54 18 64 22 62 30 L 56 62 L 74 34 C 78 28 88 34 84 42 L 68 70 L 82 72 C 88 72 88 84 80 84 L 74 84 C 76 96 66 102 52 100 Z" fill="none" stroke="{PENCIL_INK}" stroke-width="3" />
    ''')
    with open(os.path.join(DOODLES_DIR, "rps_scissors.svg"), "w", encoding="utf-8") as f:
        f.write(scissors)
    print("--> Generated 3 Rock-Paper-Scissors Doodles")

def generate_ink_effects():
    # Hit Crossout: Violent scribbled X with splatters
    hit_crossout = make_svg_wrapper(128, 128, f'''
    <!-- Aggressive Kill Crossout Scribble -->
    <line x1="22" y1="24" x2="106" y2="104" stroke="#d01824" stroke-width="6" />
    <line x1="26" y1="20" x2="102" y2="108" stroke="#a0101a" stroke-width="3.5" />
    <line x1="104" y1="24" x2="24" y2="104" stroke="#d01824" stroke-width="6" />
    <line x1="108" y1="20" x2="20" y2="108" stroke="#a0101a" stroke-width="3.5" />
    <!-- Ink droplets & splatter dots -->
    <circle cx="64" cy="64" r="5" fill="#ba1825" />
    <circle cx="52" cy="50" r="3" fill="#ba1825" />
    <circle cx="78" cy="74" r="3.5" fill="#ba1825" />
    <circle cx="36" cy="38" r="2.5" fill="#ba1825" />
    <circle cx="92" cy="90" r="2.8" fill="#ba1825" />
    <circle cx="95" cy="35" r="2.2" fill="#ba1825" />
    <circle cx="32" cy="88" r="2" fill="#ba1825" />
    <!-- Scribble loop -->
    <path d="M 40 64 Q 64 45 88 64 Q 64 85 40 64" fill="none" stroke="#ba1825" stroke-width="2.5" />
    ''')
    with open(os.path.join(DOODLES_DIR, "ink_hit_crossout.svg"), "w", encoding="utf-8") as f:
        f.write(hit_crossout)

    # Miss Smudge: Soft ballpoint transfer blot
    miss_smudge = make_svg_wrapper(128, 128, f'''
    <!-- Transferred Ink Blot / Smudge -->
    <ellipse cx="64" cy="64" rx="9" ry="8" fill="#1840a0" opacity="0.85" />
    <circle cx="64" cy="64" r="4.5" fill="#082060" />
    <ellipse cx="68" cy="62" rx="14" ry="4" fill="#2050b0" opacity="0.3" transform="rotate(25 68 62)" />
    <!-- Micro fiber bleed hairs -->
    <line x1="64" y1="55" x2="63" y2="50" stroke="#1840a0" stroke-width="1.2" opacity="0.6" />
    <line x1="72" y1="64" x2="78" y2="65" stroke="#1840a0" stroke-width="1.2" opacity="0.6" />
    <line x1="64" y1="73" x2="65" y2="79" stroke="#1840a0" stroke-width="1.2" opacity="0.6" />
    <line x1="55" y1="64" x2="50" y2="63" stroke="#1840a0" stroke-width="1.2" opacity="0.6" />
    ''')
    with open(os.path.join(DOODLES_DIR, "ink_miss_smudge.svg"), "w", encoding="utf-8") as f:
        f.write(miss_smudge)
    print("--> Generated Ink Hit & Miss FX SVGs")

def generate_notebook_grid_svg():
    # Standard French ruled / 5mm quad notebook page with center crease
    w, h = 1000, 700
    grid_size = 20
    content = []
    
    # Paper base color
    content.append(f'<rect width="{w}" height="{h}" fill="#fbfaf6" />')
    
    # 5mm quad grid lines in pale cyan/blue notebook ink
    for x in range(grid_size, w, grid_size):
        content.append(f'<line x1="{x}" y1="0" x2="{x}" y2="{h}" stroke="#d6e4f0" stroke-width="0.8" />')
    for y in range(grid_size, h, grid_size):
        content.append(f'<line x1="0" y1="{y}" x2="{w}" y2="{y}" stroke="#d6e4f0" stroke-width="0.8" />')
    
    # Center Crease / Fold Guide (Vertical line right in the middle at x = 500)
    content.append(f'<line x1="500" y1="0" x2="500" y2="{h}" stroke="#c0392b" stroke-width="1.6" stroke-dasharray="6,4" />')
    
    # Red margin guides on both sides
    content.append(f'<line x1="60" y1="0" x2="60" y2="{h}" stroke="#e74c3c" stroke-width="1.2" opacity="0.6" />')
    content.append(f'<line x1="940" y1="0" x2="940" y2="{h}" stroke="#e74c3c" stroke-width="1.2" opacity="0.6" />')
    
    # Subtle player header labels in handwritten style
    content.append('<text x="250" y="35" font-family="monospace" font-size="14" fill="#2980b9" text-anchor="middle" font-weight="bold">PLAYER 1 (BLUE)</text>')
    content.append('<text x="750" y="35" font-family="monospace" font-size="14" fill="#c0392b" text-anchor="middle" font-weight="bold">PLAYER 2 (RED)</text>')
    content.append('<text x="500" y="680" font-family="monospace" font-size="11" fill="#7f8c8d" text-anchor="middle">--- FOLD ALONG THIS LINE ---</text>')

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">
{''.join(content)}
</svg>'''
    with open(os.path.join(TEXTURES_DIR, "notebook_grid.svg"), "w", encoding="utf-8") as f:
        f.write(svg)
    print("--> Generated Quad Notebook Grid Texture SVG")

if __name__ == "__main__":
    print("=== Generating 2D Hand-Drawn Assets ===")
    generate_soldier_doodles()
    generate_rps_doodles()
    generate_ink_effects()
    generate_notebook_grid_svg()
    print("=== All 2D Assets Generated Successfully! ===")
