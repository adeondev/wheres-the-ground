const milenioImage = new Image();
milenioImage.src = 'assets/sprites/npc/milenio/spritesheet_idle.png';
const FRAME_WIDTH = 29;
const FRAME_HEIGHT = 37;
const FRAME_COUNT = 6;

export function nearbyNpc(world, player) {
  return world.npcs?.find(npc =>
    Math.abs(player.x + player.w / 2 - npc.x) <= 70 &&
    Math.abs(player.y + player.h - npc.y) <= 28) ?? null;
}

export function drawNpcs(ctx, world, cameraX, time) {
  if (!milenioImage.complete || !milenioImage.naturalWidth) return;
  const frame = Math.floor(time * 8) % FRAME_COUNT;
  for (const npc of world.npcs ?? []) {
    if (npc.id !== 'milenio') continue;
    ctx.drawImage(milenioImage, frame * FRAME_WIDTH, 0, FRAME_WIDTH, FRAME_HEIGHT,
      Math.round(npc.x - cameraX - npc.w / 2), npc.y - npc.h, npc.w, npc.h);
  }
}
