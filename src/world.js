export const CLASSROOM_SCALE = 2;

const ROOM_PATH = 'assets/rooms/classroom/';
const ROOM_WIDTH = 244 * CLASSROOM_SCALE;
const FLOOR_Y = 112 * CLASSROOM_SCALE;
const FLOOR_HEIGHT = 8 * CLASSROOM_SCALE;
const DESKS = [32, 66, 100, 134];

const images = {};
for (const [name, file] of Object.entries({
  background: 'room_background.png',
  floor: 'floor_tile.png',
  studentDesk: 'chair_table.png',
  teacherDesk: 'professor_chair_table.png',
  sideDesk: 'decorative_side_desk.png',
})) {
  const image = new Image();
  image.src = ROOM_PATH + file;
  images[name] = image;
}

export function createWorld() {
  return {
    width: ROOM_WIDTH,
    groundY: FLOOR_Y,
    allowPowers: false,
    blocks: [{ x: 0, y: FLOOR_Y, w: ROOM_WIDTH, h: FLOOR_HEIGHT }],
  };
}

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function inVacuum(world, player) {
  if (!world.vacuum) return false;
  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2;
  const zone = world.vacuum;
  return cx >= zone.x && cx < zone.x + zone.w && cy >= zone.y && cy < zone.y + zone.h;
}

export function solidBlocks(world) {
  return world.blocks;
}

function drawSprite(ctx, image, x, y, cameraX) {
  if (!image.complete || !image.naturalWidth) return;
  ctx.drawImage(image, Math.round(x * CLASSROOM_SCALE - cameraX), y * CLASSROOM_SCALE,
    image.width * CLASSROOM_SCALE, image.height * CLASSROOM_SCALE);
}

export function drawWorld(ctx, world, cameraX, viewWidth, viewHeight, overscan = 0) {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#101417';
  ctx.fillRect(-overscan, -overscan, viewWidth + overscan * 2, viewHeight + overscan * 2);

  ctx.save();
  ctx.beginPath();
  ctx.rect(Math.round(-cameraX), 0, ROOM_WIDTH, FLOOR_Y + FLOOR_HEIGHT);
  ctx.clip();
  drawSprite(ctx, images.background, 0, 0, cameraX);
  for (let x = 0; x < 244; x += 16) drawSprite(ctx, images.floor, x, 112, cameraX);
  for (const x of DESKS) drawSprite(ctx, images.studentDesk, x, 94, cameraX);
  drawSprite(ctx, images.teacherDesk, 176, 80, cameraX);
  drawSprite(ctx, images.sideDesk, 208, 64, cameraX);
  ctx.restore();
}
