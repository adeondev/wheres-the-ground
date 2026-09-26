export function createWorld(viewWidth, viewHeight) {
  const groundY = viewHeight - 28;
  const width = Math.max(2400, viewWidth + 400);
  return {
    width,
    groundY,
    blocks: [{ x: 0, y: groundY, w: width, h: 28 }],
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

function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

export function drawWorld(ctx, world, cameraX, viewWidth, viewHeight, overscan = 0) {
  rect(ctx, -overscan, -overscan, viewWidth + overscan * 2, viewHeight + overscan * 2, '#263b55');
  rect(ctx, -overscan, Math.round(world.groundY * 0.65), viewWidth + overscan * 2, viewHeight + overscan, '#1e3149');

  for (const block of world.blocks) {
    const x = Math.round(block.x - cameraX);
    if (x + block.w < 0 || x > viewWidth) continue;
    const drawX = x <= 0 ? -overscan : x;
    const drawW = block.w + x - drawX + (x + block.w >= viewWidth ? overscan : 0);
    rect(ctx, drawX, block.y, drawW, block.h + overscan, '#534c56');
    rect(ctx, drawX, block.y, drawW, 4, '#85ba9c');
    rect(ctx, drawX, block.y + 4, drawW, 2, '#5c8d7f');
    for (let tile = 0; tile < block.w; tile += 16) {
      if (x + tile < -16 || x + tile > viewWidth) continue;
      rect(ctx, x + tile + 4, block.y + 8, 4, 2, '#79636a');
      if (block.h > 16) rect(ctx, x + tile + 10, block.y + 19, 4, 2, '#3d3d4b');
    }
  }

}
