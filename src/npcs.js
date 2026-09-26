const milenioImage = new Image();
milenioImage.src = 'assets/sprites/npc/milenio/spritesheet_idle.png';
const FRAME_WIDTH = 29;
const FRAME_HEIGHT = 37;
const FRAME_COUNT = 6;
const JUMP_DURATION = 0.4;

export function startNpcInteraction(npc, player) {
  npc.facing = player.x + player.w / 2 < npc.x ? -1 : 1;
  npc.jumpTime = JUMP_DURATION;
  npc.surpriseTime = 0.9;
}

export function updateNpcs(world, dt) {
  for (const npc of world.npcs ?? []) {
    npc.jumpTime = Math.max(0, (npc.jumpTime ?? 0) - dt);
    npc.surpriseTime = Math.max(0, (npc.surpriseTime ?? 0) - dt);
  }
}

export function npcJumpOffset(npc) {
  const progress = 1 - (npc.jumpTime ?? 0) / JUMP_DURATION;
  return 12 * 4 * progress * (1 - progress);
}

export function nearbyNpc(world, player) {
  return world.npcs?.find(npc =>
    Math.abs(player.x + player.w / 2 - npc.x) <= 70 &&
    Math.abs(player.y + player.h - npc.y) <= 28) ?? null;
}

export function drawNpcs(ctx, world, cameraX, time) {
  if (!milenioImage.complete || !milenioImage.naturalWidth) return;
  const idleFrame = Math.floor(time * 3) % FRAME_COUNT;
  for (const npc of world.npcs ?? []) {
    if (npc.id !== 'milenio') continue;
    const frame = npc.surpriseTime > 0 ? 0 : idleFrame;
    ctx.save();
    ctx.translate(Math.round(npc.x - cameraX), Math.round(npc.y - npcJumpOffset(npc)));
    ctx.scale(npc.facing ?? 1, 1);
    ctx.drawImage(milenioImage, frame * FRAME_WIDTH, 0, FRAME_WIDTH, FRAME_HEIGHT,
      -npc.w / 2, -npc.h, npc.w, npc.h);
    ctx.restore();
  }
}
