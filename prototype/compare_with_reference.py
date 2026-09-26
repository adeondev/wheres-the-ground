from PIL import Image
import os

names = ['idle', 'run_1', 'run_2', 'jump', 'boost', 'fly', 'land']

os.makedirs('prototype/comparisons', exist_ok=True)
ref_dir = r'C:/Users/Deon/.gemini/antigravity/brain/fe65eed8-2384-4d78-8be7-9bb172d4fbf3/prototype'

for name in names:
    rendered = Image.open(f'prototype/renders/{name}_10x.png')
    ref = Image.open(f'{ref_dir}/ref_preview_{name}.png')
    
    # Create side-by-side: Rendered (left) vs Reference (right)
    comp = Image.new('RGBA', (480 * 2 + 20, 320), (240, 240, 245, 255))
    comp.paste(rendered, (0, 0), rendered)
    comp.paste(ref, (480 + 20, 0))
    comp.save(f'prototype/comparisons/comp_{name}.png')

print("Saved all 7 side-by-side comparisons to prototype/comparisons/")
