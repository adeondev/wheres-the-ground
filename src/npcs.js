const milenioImage = new Image();
milenioImage.src = 'assets/sprites/npc/milenio/spritesheet_idle.png';
const FRAME_WIDTH = 29;
const FRAME_HEIGHT = 37;
const FRAME_COUNT = 6;
const JUMP_DURATION = 0.22;

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

export function npcAirShake(npc) {
  if (!(npc.jumpTime > 0)) return { x: 0, y: 0, angle: 0 };
  const progress = 1 - npc.jumpTime / JUMP_DURATION;
  const strength = Math.sin(progress * Math.PI);
  const shake = Math.sin(progress * Math.PI * 8) * strength;
  return { x: shake * 1.1, y: Math.cos(progress * Math.PI * 10) * strength * 0.35, angle: 0 };
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
    const shake = npcAirShake(npc);
    ctx.save();
    ctx.translate(Math.round(npc.x - cameraX + shake.x), Math.round(npc.y - npcJumpOffset(npc) + shake.y));
    ctx.scale(npc.facing ?? 1, 1);
    ctx.drawImage(milenioImage, frame * FRAME_WIDTH, 0, FRAME_WIDTH, FRAME_HEIGHT,
      -npc.w / 2, -npc.h, npc.w, npc.h);
    ctx.restore();
  }
}
