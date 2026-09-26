import os
from PIL import Image
import numpy as np

folder = os.path.dirname(os.path.abspath(__file__))

print(f"Checking folder: {folder}")

# 1. Check sprite_sheet.png
sheet_path = os.path.join(folder, 'sprite_sheet.png')
assert os.path.exists(sheet_path), f'sprite_sheet.png does not exist at {sheet_path}'
sheet = Image.open(sheet_path)
print(f'sprite_sheet size: {sheet.size}, format: {sheet.format}, mode: {sheet.mode}')
assert sheet.size == (336, 32), f'Sprite sheet size {sheet.size} != (336, 32)'
assert sheet.mode == 'RGBA', f'Sprite sheet mode {sheet.mode} != RGBA'

sheet_arr = np.array(sheet)
sheet_alphas = np.unique(sheet_arr[:, :, 3])
print(f'Sprite sheet unique alpha values: {sheet_alphas}')
for a in sheet_alphas:
    assert a in (0, 255), f'Found non-binary alpha {a} in sprite sheet'

# 2. Check each frame
names = ['idle', 'run_1', 'run_2', 'jump', 'boost', 'fly', 'land']
for i, name in enumerate(names):
    frame_path = os.path.join(folder, f'{name}.png')
    assert os.path.exists(frame_path), f'{name}.png does not exist'
    frame = Image.open(frame_path)
    print(f'{name:6s} size: {frame.size}, mode: {frame.mode}')
    assert frame.size == (48, 32), f'{name}.png size {frame.size} != (48, 32)'
    assert frame.mode == 'RGBA', f'{name}.png mode {frame.mode} != RGBA'
    
    f_arr = np.array(frame)
    f_alphas = np.unique(f_arr[:, :, 3])
    for a in f_alphas:
        assert a in (0, 255), f'{name} has non-binary alpha: {a}'
        
    cell_slice = sheet_arr[:, i*48 : (i+1)*48, :]
    assert np.array_equal(cell_slice, f_arr), f'Sprite sheet slice for {name} does not match {name}.png!'

# 3. Check 10x preview
preview_path = os.path.join(folder, 'sprite_sheet_preview_10x.png')
assert os.path.exists(preview_path), 'sprite_sheet_preview_10x.png does not exist'
preview = Image.open(preview_path)
print(f'preview size: {preview.size}, format: {preview.format}, mode: {preview.mode}')
assert preview.size == (3360, 320), f'Preview size {preview.size} != (3360, 320)'

# 4. Check palette.txt
pal_path = os.path.join(folder, 'palette.txt')
assert os.path.exists(pal_path), 'palette.txt does not exist'
with open(pal_path, 'r', encoding='utf-8') as f:
    pal_content = f.read()
print(f'palette.txt total lines: {len(pal_content.splitlines())}')

# 5. Check draw_sprites.py
script_path = os.path.join(folder, 'draw_sprites.py')
assert os.path.exists(script_path), 'draw_sprites.py does not exist'
print(f'draw_sprites.py file size: {os.path.getsize(script_path)} bytes')

print('\n======================================================')
print('SUCCESS: ALL AUTOMATED VERIFICATION CHECKS PASSED!')
print('======================================================')
