"""Build a forward-leaning, layered run cycle from Gabriel's in-game sprite."""

import json
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/sprites/player/spr_gabriel/spritesheet.png"
DEST = ROOT / "assets/sprites/player/spr_gabriel_run"
FRAME_W, FRAME_H = 24, 29

source = Image.open(SOURCE).convert("RGBA")
assert source.size == (114, 29)
original = source.crop((19, 0, 38, 29))

OUTLINE = (15, 5, 8, 255)
PANTS = (63, 54, 54, 255)
PANTS_BACK = (41, 34, 36, 255)
PURPLE = (134, 32, 196, 255)
PURPLE_BACK = (95, 24, 143, 255)
SKIN = (248, 166, 88, 255)
WHITE = (248, 246, 247, 255)

# Every pose specifies a foot plant or passing pose, plus counter-swinging arms.
# The far limbs are drawn behind the torso; near limbs cover it at the shoulder.
POSES = [
    dict(bob=0, far=((9, 23), (7, 25), (4, 25)), near=((16, 23), (17, 25), (14, 25)),
         far_arm=((10, 16), (7, 18), (8, 20)), near_arm=((12, 16), (17, 18), (17, 16))),
    dict(bob=0, far=((9, 23), (8, 24), (5, 24)), near=((15, 23), (15, 25), (12, 25)),
         far_arm=((10, 16), (8, 18), (8, 21)), near_arm=((12, 16), (17, 18), (17, 20))),
    dict(bob=-1, far=((10, 23), (9, 24), (6, 24)), near=((16, 22), (16, 23), (14, 23)),
         far_arm=((10, 16), (13, 18), (16, 19)), near_arm=((12, 16), (15, 19), (13, 21))),
    dict(bob=0, far=((16, 23), (17, 25), (14, 25)), near=((9, 23), (7, 25), (4, 25)),
         far_arm=((12, 16), (17, 18), (17, 16)), near_arm=((10, 16), (7, 18), (8, 20))),
    dict(bob=0, far=((15, 23), (15, 25), (12, 25)), near=((9, 23), (8, 24), (5, 24)),
         far_arm=((12, 16), (17, 18), (17, 20)), near_arm=((10, 16), (8, 18), (8, 21))),
    dict(bob=-1, far=((16, 22), (16, 23), (14, 23)), near=((10, 23), (9, 24), (6, 24)),
         far_arm=((12, 16), (13, 19), (13, 21)), near_arm=((10, 16), (15, 18), (17, 19))),
]


def offset(points, dy):
    return [(x, y + dy) for x, y in points]


def dim(image):
    image = image.copy()
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            if a:
                pixels[x, y] = (round(r * .60), round(g * .60), round(b * .60), a)
    return image


BACK_SHOE = dim(original.crop((1, 25, 8, 29)))
FRONT_SHOE = original.crop((10, 25, 17, 29))


def draw_leg(frame, hip, knee, ankle, shoe_xy, front):
    draw = ImageDraw.Draw(frame)
    path = [hip, knee, ankle]
    draw.line(path, fill=OUTLINE, width=5 if front else 4, joint="curve")
    draw.line(path, fill=PANTS if front else PANTS_BACK, width=3 if front else 2, joint="curve")
    frame.alpha_composite(FRONT_SHOE if front else BACK_SHOE, shoe_xy)


def draw_arm(frame, shoulder, elbow, fist, front):
    draw = ImageDraw.Draw(frame)
    path = [shoulder, elbow, fist]
    draw.line(path, fill=OUTLINE, width=4, joint="curve")
    draw.line(path, fill=PURPLE if front else PURPLE_BACK, width=2, joint="curve")
    x, y = fist
    draw.rectangle((x - 1, y - 1, x + 1, y + 1), fill=OUTLINE)
    draw.point((x - 1, y), fill=WHITE)  # cuff
    draw.rectangle((x, y, x + 1, y + 1), fill=SKIN)


def draw_torso(frame, bob):
    # Shear each original row toward the facing direction. The head sits four
    # pixels ahead of the hips, while every visible source pixel keeps its color.
    upper = original.crop((0, 0, 19, 21))
    for y in range(15, 21):
        for x in range(19):
            if x < 6 or x > 13:
                upper.putpixel((x, y), (0, 0, 0, 0))
    for y in range(21):
        dest_y = y + bob
        if not 0 <= dest_y < FRAME_H:
            continue
        lean = round(4 * (20 - y) / 20)
        for x in range(19):
            pixel = upper.getpixel((x, y))
            if pixel[3]:
                frame.putpixel((x + 2 + lean, dest_y), pixel)


def make_frame(pose):
    bob = pose["bob"]
    frame = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    far_knee, far_ankle, far_shoe = pose["far"]
    near_knee, near_ankle, near_shoe = pose["near"]
    draw_leg(frame, (10, 20 + bob), far_knee, far_ankle, far_shoe, False)
    draw_arm(frame, *offset(pose["far_arm"], bob), False)
    draw_torso(frame, bob)
    draw_leg(frame, (14, 20 + bob), near_knee, near_ankle, near_shoe, True)
    draw_arm(frame, *offset(pose["near_arm"], bob), True)
    return frame


DEST.mkdir(parents=True, exist_ok=True)
frames = [make_frame(pose) for pose in POSES]
sheet = Image.new("RGBA", (FRAME_W * len(frames), FRAME_H), (0, 0, 0, 0))
for index, frame in enumerate(frames):
    sheet.alpha_composite(frame, (index * FRAME_W, 0))

sheet.save(DEST / "spritesheet-v4.png")
preview_frames = [f.resize((FRAME_W * 10, FRAME_H * 10), Image.Resampling.NEAREST) for f in frames]
preview_frames[0].save(DEST / "preview-v4.webp", save_all=True,
                       append_images=preview_frames[1:], duration=85, loop=0, lossless=True)
sheet.resize((sheet.width * 8, sheet.height * 8), Image.Resampling.NEAREST).save(DEST / "sheet-preview-v4.png")
game_previews = []
for frame in preview_frames:
    backdrop = Image.new("RGBA", (FRAME_W * 10, (FRAME_H + 4) * 10), "#1e3149")
    backdrop.alpha_composite(frame)
    draw = ImageDraw.Draw(backdrop)
    draw.rectangle((0, FRAME_H * 10, backdrop.width, backdrop.height), fill="#534c56")
    draw.rectangle((0, FRAME_H * 10, backdrop.width, FRAME_H * 10 + 9), fill="#85ba9c")
    game_previews.append(backdrop)
game_previews[0].save(DEST / "preview-v4-game.webp", save_all=True,
                      append_images=game_previews[1:], duration=85, loop=0, lossless=True)
game_sheet = Image.new("RGBA", (sheet.width * 8, (FRAME_H + 4) * 8), "#1e3149")
game_sheet.alpha_composite(sheet.resize((sheet.width * 8, FRAME_H * 8), Image.Resampling.NEAREST))
game_draw = ImageDraw.Draw(game_sheet)
game_draw.rectangle((0, FRAME_H * 8, game_sheet.width, game_sheet.height), fill="#534c56")
game_draw.rectangle((0, FRAME_H * 8, game_sheet.width, FRAME_H * 8 + 7), fill="#85ba9c")
game_sheet.save(DEST / "sheet-preview-v4-game.png")
(DEST / "metadata.json").write_text(json.dumps({
    "type": "animation", "prompt": "Gabriel correndo inclinado", "width": sheet.width,
    "height": sheet.height, "frame_w": FRAME_W, "frame_h": FRAME_H,
    "frame_count": len(frames), "fps": 12,
    "preview": "preview-v4.webp", "spritesheet": "spritesheet-v4.png"
}, indent=2) + "\n", encoding="utf-8")
