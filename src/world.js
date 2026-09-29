import { drawRooftops } from './rooftops.js?v=route-obstacles';
import { NORMAL_MOVEMENT } from './config.js';

export const CLASSROOM_SCALE = 2;
export const STATION_SCALE = CLASSROOM_SCALE;

const ROOM_PATH = 'assets/rooms/classroom/';
const STATION_PATH = 'assets/rooms/cops_area/';
const ROOM_WIDTH = 244 * CLASSROOM_SCALE;
const FLOOR_Y = 112 * CLASSROOM_SCALE;
const FLOOR_HEIGHT = 8 * CLASSROOM_SCALE;
const STATION_WIDTH = 122 * STATION_SCALE;
const STATION_HEIGHT = 61 * STATION_SCALE;
const STATION_FLOOR_Y = 55 * STATION_SCALE;
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
for (const [name, file] of Object.entries({
  stationBackground: 'cops_area.png',
  stationForeground: 'cops_area_up.png',
})) {
  const image = new Image();
  image.src = STATION_PATH + file;
  images[name] = image;
}

export function createWorld() {
  return {
    id: 'classroom',
    width: ROOM_WIDTH,
    height: FLOOR_Y + FLOOR_HEIGHT,
    groundY: FLOOR_Y,
    ...NORMAL_MOVEMENT,
    allowPowers: false,
    npcs: [{ id: 'milenio', name: 'Milênio', x: 224 * CLASSROOM_SCALE,
      y: FLOOR_Y, w: 29 * CLASSROOM_SCALE, h: 37 * CLASSROOM_SCALE }],
    blocks: [{ x: 0, y: FLOOR_Y, w: ROOM_WIDTH, h: FLOOR_HEIGHT }],
  };
}

export function createStationWorld() {
  return {
    id: 'station',
    width: STATION_WIDTH,
    height: STATION_HEIGHT,
    groundY: STATION_FLOOR_Y,
    ...NORMAL_MOVEMENT,
    moveSpeed: NORMAL_MOVEMENT.moveSpeed / 2,
    allowPowers: false,
    allowTools: false,
    // O policial fica mais baixo atrás do balcão; a parte inferior do sprite é ocultada.
    npcs: [{ id: 'policial', name: 'Policial', facing: 1, x: 70 * STATION_SCALE,
      y: STATION_FLOOR_Y + 7 * STATION_SCALE, w: 40 * STATION_SCALE, h: 48 * STATION_SCALE }],
    blocks: [{ x: 0, y: STATION_FLOOR_Y, w: STATION_WIDTH, h: STATION_HEIGHT - STATION_FLOOR_Y }],
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
  if (world.id === 'rooftops') {
    ctx.clearRect(0, 0, viewWidth, viewHeight);
    drawRooftops(ctx, world, cameraX, viewWidth);
    return;
  }
  if (world.id === 'station') {
    ctx.fillStyle = '#c4c5cb';
    ctx.fillRect(-overscan, -overscan, viewWidth + overscan * 2, viewHeight + overscan * 2);
    if (images.stationBackground.complete && images.stationBackground.naturalWidth) {
      ctx.drawImage(images.stationBackground, -Math.round(cameraX), 0, STATION_WIDTH, STATION_HEIGHT);
    }
    return;
  }
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

export function drawStationForeground(ctx, screenX, screenY, zoom) {
  const image = images.stationForeground;
  if (image.complete && image.naturalWidth) {
    ctx.drawImage(image, screenX, screenY, STATION_WIDTH * zoom, STATION_HEIGHT * zoom);
  }
}
