let hudAtlas = null;
let hudLoading;
let boostFill, boostActiveFill, reserveFill, reserveActiveFill;

function tintedMeter(image, sourceX, sourceY, width, height, active = false) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, sourceX, sourceY, width, height, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    if (!pixels.data[i + 3]) continue;
    const bright = pixels.data[i] > 80, outline = pixels.data[i] < 20;
    const color = active
      ? outline ? [40, 84, 105] : bright ? [217, 255, 247] : [141, 234, 255]
      : outline ? [111, 68, 51] : bright ? [255, 230, 173] : [230, 173, 113];
    pixels.data[i] = color[0]; pixels.data[i + 1] = color[1]; pixels.data[i + 2] = color[2];
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}
export function loadRooftopHud() {
  return hudLoading ??= new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      hudAtlas = image;
      boostFill = tintedMeter(image, 56, 0, 5, 38);
      boostActiveFill = tintedMeter(image, 56, 0, 5, 38, true);
      reserveFill = tintedMeter(image, 62, 29, 5, 9);
      reserveActiveFill = tintedMeter(image, 62, 29, 5, 9, true);
      resolve(image);
    };
    image.onerror = () => reject(new Error('Não foi possível carregar a UI de mapa e combustível'));
    image.src = 'assets/sprites/ui/game_info.png?v=full-meter';
  });
}

function drawFrame(ctx, x, y, scale) {
  if (hudAtlas) ctx.drawImage(hudAtlas, 0, 0, 54, 38, x, y, 54 * scale, 38 * scale);
  else {
    ctx.fillStyle = '#6848ad'; ctx.fillRect(x, y, 54 * scale, 38 * scale);
    ctx.fillStyle = '#120c20'; ctx.fillRect(x + 2 * scale, y + 2 * scale, 50 * scale, 34 * scale);
  }

}

function drawPowerBars(ctx, x, y, scale, player, options) {
  if (!hudAtlas || !options.showPowers) return;
  ctx.drawImage(hudAtlas, 56, 0, 5, 38, x + 56 * scale, y, 5 * scale, 38 * scale);
  const height = Math.max(0, Math.min(38, Math.ceil(player.fuel / options.maxFuel * 38)));
  if (height) {
    const top = 38 - height;
    ctx.drawImage(player.boosting ? boostActiveFill : boostFill, 0, top, 5, height,
      x + 56 * scale, y + top * scale, 5 * scale, height * scale);
  }
  if (!options.showReserve) return;
  ctx.drawImage(hudAtlas, 62, 29, 5, 9, x + 62 * scale, y + 29 * scale, 5 * scale, 9 * scale);
  if (player.reserveReady || player.reserveBoosting) {
    ctx.drawImage(player.reserveBoosting || options.reserveCue ? reserveActiveFill : reserveFill,
      x + 62 * scale, y + 29 * scale, 5 * scale, 9 * scale);
  }
}

// Visão dos telhados próximos, independente da altura da câmera do jogo.
export function drawRooftopMinimap(ctx, world, player, viewWidth, viewHeight = 240, options = {}) {
  if (world.id !== 'rooftops') return;
  const scale = 1;
  const width = 54 * scale, height = 38 * scale;
  const x = 8, y = Math.max(8, Math.floor(viewHeight - height - 8));
  const inner = { x: x + 3 * scale, y: y + 7 * scale, w: 48 * scale, h: 26 * scale };
  const centerX = player.x + player.w / 2;
  const spanX = Math.min(2048, world.width);
  const left = Math.max(0, Math.min(world.width - spanX, centerX - spanX * 0.42));
  const top = Math.min(-80, player.y - 80);
  const bottom = Math.max(world.height + 80, player.y + player.h + 40);
  const scaleX = inner.w / spanX;
  const scaleY = inner.h / (bottom - top);
  const mapX = position => inner.x + Math.round((position - left) * scaleX);
  const mapY = position => inner.y + Math.round((position - top) * scaleY);
  const underPlayer = world.buildings.find(building =>
    centerX >= building.x && centerX <= building.x + building.w);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  drawFrame(ctx, x, y, scale);
  drawPowerBars(ctx, x, y, scale, player, options);
  ctx.beginPath();
  ctx.rect(inner.x, inner.y, inner.w, inner.h);
  ctx.clip();
  for (const building of world.buildings) {
    if (building.x + building.w < left || building.x > left + spanX) continue;
    for (let offset = 0; offset < building.w; offset += 32) {
      const bx = mapX(building.x + offset);
      const by = mapY(building.y + (building.roofOffsets?.[offset] ?? 0));
      const bw = Math.max(1, mapX(building.x + Math.min(building.w, offset + 32)) - bx);
      const bh = Math.max(1, mapY(building.y + building.h) - by);
      ctx.fillStyle = building === underPlayer ? '#756580' : '#494351';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = building === underPlayer ? '#ffe0a3' : '#d78b61';
      ctx.fillRect(bx, by, bw, 1);
    }
  }
  const px = Math.max(inner.x + 2, Math.min(inner.x + inner.w - 3, mapX(centerX)));
  const py = Math.max(inner.y + 2, Math.min(inner.y + inner.h - 3, mapY(player.y + player.h / 2)));
  const floorY = underPlayer ? underPlayer.y + (underPlayer.roofOffsets?.[Math.floor(centerX - underPlayer.x)] ?? 0) : null;
  if (underPlayer && player.y + player.h < floorY) {
    ctx.fillStyle = '#81b4c3';
    for (let dotY = py + 4; dotY < mapY(floorY); dotY += 3) ctx.fillRect(px, dotY, 1, 1);
  }
  ctx.fillStyle = '#10131b';
  ctx.fillRect(px - 2, py - 2, 5, 5);
  ctx.fillStyle = '#8deaff';
  ctx.fillRect(px - 1, py - 1, 3, 3);
  ctx.restore();
}
