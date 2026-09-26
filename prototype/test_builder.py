import numpy as np
from PIL import Image

PALETTE = {
    ' ': (0, 0, 0, 0),             # Transparent
    '#': (34, 18, 22, 255),        # Outline (near black / dark warm brown)
    'H': (48, 30, 34, 255),        # Dark hair base
    'h': (68, 44, 48, 255),        # Hair mid
    'L': (88, 58, 62, 255),        # Hair light / highlight
    's': (251, 170, 95, 255),      # Face skin base
    'S': (226, 132, 64, 255),      # Face skin shadow
    'e': (20, 12, 14, 255),        # Eye pupil
    'W': (255, 255, 255, 255),    # White (chest logo, cuffs, sneaker toe/sole, eye shine)
    'w': (225, 228, 235, 255),    # Off-white / light gray sole
    'P': (138, 37, 205, 255),      # Purple hoodie
    'D': (96, 22, 146, 255),       # Dark purple shadow
    'l': (208, 148, 220, 255),     # Light purple highlight
    'p': (44, 34, 40, 255),        # Pants dark
    'g': (72, 62, 68, 255),        # Pants highlight / crease
    'Y': (255, 214, 38, 255),      # Yellow thruster flame / backpack core
    'O': (254, 138, 34, 255),      # Orange thruster flame
    'R': (244, 86, 26, 255),       # Red-orange thruster flame tip/sparks
    'v': (202, 182, 236, 255),     # Jump thruster purple particle
    'V': (226, 212, 248, 255),     # Jump thruster light streak
    'd': (208, 208, 214, 255),     # Land dust puff
    'k': (170, 170, 178, 255),     # Land dust shadow
}

def render_frame(lines):
    assert len(lines) == 32, f"Expected 32 lines, got {len(lines)}"
    arr = np.zeros((32, 48, 4), dtype=np.uint8)
    for y, line in enumerate(lines):
        assert len(line) == 48, f"Row {y} has length {len(line)}, expected 48"
        for x, char in enumerate(line):
            arr[y, x] = PALETTE[char]
    return Image.fromarray(arr, 'RGBA')

print("Builder helper loaded successfully")
