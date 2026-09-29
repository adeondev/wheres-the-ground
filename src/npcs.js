const milenioImage = new Image();
milenioImage.src = 'assets/sprites/npc/milenio/spritesheet_idle.png';
const milenioAgulhaImage = new Image();
milenioAgulhaImage.src = 'assets/sprites/npc/milenio/spritesheet_agulha.png';
const copImage = new Image();
copImage.src = 'assets/sprites/npc/policial/spritesheet_cop.png';
const FRAME_WIDTH = 29;
const FRAME_HEIGHT = 37;
const FRAME_COUNT = 6;
const COP_FRAME_WIDTH = 40;
const COP_FRAME_HEIGHT = 48;
const COP_FRAME_COUNT = 7;
export const JUMP_DURATION = 0.48;
export const SETTLE_DELAY = 1.2;
export const JUMP_HEIGHT = 26;

export function startNpcInteraction(npc, player) {
  npc.facing = player.x + player.w / 2 < npc.x ? -1 : 1;
  npc.jumpTime = JUMP_DURATION;
  npc.settleDelay = SETTLE_DELAY;
  npc.surpriseTime = JUMP_DURATION + SETTLE_DELAY;
}

export function updateNpcs(world, dt) {
  for (const npc of world.npcs ?? []) {
    npc.jumpTime = Math.max(0, (npc.jumpTime ?? 0) - dt);
    npc.surpriseTime = Math.max(0, (npc.surpriseTime ?? 0) - dt);
  }
}

export function npcJumpOffset(npc) {
  if (!(npc.jumpTime > 0)) return 0;
  const progress = 1 - npc.jumpTime / JUMP_DURATION;
  return JUMP_HEIGHT * 4 * progress * (1 - progress);
}

export function npcAirShake(npc) {
  if (!(npc.jumpTime > 0)) return { x: 0, y: 0, angle: 0 };
  const progress = 1 - npc.jumpTime / JUMP_DURATION;
  // Tremer APENAS enquanto sobe (antes de atingir o topo / metade do pulo)
  if (progress >= 0.5) return { x: 0, y: 0, angle: 0 };

  const ascentProgress = progress / 0.5;
  const strength = Math.sin(ascentProgress * Math.PI);
  // Tremor bem sutil e suave apenas na subida
  const x = Math.sin(ascentProgress * Math.PI * 3) * 0.4 * strength;
  const angle = Math.sin(ascentProgress * Math.PI * 2) * 0.03 * strength;
  return { x, y: 0, angle };
}

export function nearbyNpc(world, player) {
  return world.npcs?.find(npc =>
    Math.abs(player.x + player.w / 2 - npc.x) <= 70 &&
    Math.abs(player.y + player.h - npc.y) <= 28) ?? null;
}

export function drawNpcs(ctx, world, cameraX, time) {
  const idleFrame = Math.floor(time * 3) % FRAME_COUNT;
  for (const npc of world.npcs ?? []) {
    if (npc.id === 'policial') {
      if (!copImage.complete || !copImage.naturalWidth) continue;
      const frame = Math.floor(time * 5) % COP_FRAME_COUNT;
      const pixelScale = npc.h / COP_FRAME_HEIGHT;
      const visiblePixels = Math.max(0, Math.min(COP_FRAME_HEIGHT,
        Math.floor((world.groundY - npc.y + npc.h) / pixelScale)));
      if (!visiblePixels) continue;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(npc.x - cameraX), Math.round(npc.y));
      ctx.scale(npc.facing ?? 1, 1);
      ctx.drawImage(copImage, frame * COP_FRAME_WIDTH, 0, COP_FRAME_WIDTH, visiblePixels,
        -npc.w / 2, -npc.h, npc.w, visiblePixels * pixelScale);
      ctx.restore();
      continue;
    }
    if (npc.id !== 'milenio') continue;
    const isAgulha = Boolean(npc.hasAgulha);
    const img = isAgulha ? milenioAgulhaImage : milenioImage;
    if (!img.complete || !img.naturalWidth) continue;

    const frameW = isAgulha ? 32 : FRAME_WIDTH;
    const frameH = 37;
    const frame = isAgulha ? 0 : (npc.surpriseTime > 0 ? 0 : idleFrame);
    const drawW = isAgulha ? Math.round(npc.w * (32 / 29)) : npc.w;
    const shake = npcAirShake(npc);
    const jumpOffset = npcJumpOffset(npc);

    let scaleX = npc.facing ?? 1;
    let scaleY = 1;

    if (npc.jumpTime > 0) {
      const p = 1 - npc.jumpTime / JUMP_DURATION;
      if (p < 0.22) {
        const stretch = Math.sin((p / 0.22) * Math.PI) * 0.08;
        scaleY = 1 + stretch;
        scaleX = (npc.facing ?? 1) * (1 - stretch * 0.5);
      }
    } else if ((npc.settleDelay ?? 0) > 0) {
      const timeOnGround = SETTLE_DELAY - npc.settleDelay;
      const squashDuration = 0.15;
      if (timeOnGround >= 0 && timeOnGround < squashDuration) {
        const t = timeOnGround / squashDuration;
        const squash = Math.sin(t * Math.PI) * 0.08 * (1 - t * 0.5);
        scaleY = 1 - squash;
        scaleX = (npc.facing ?? 1) * (1 + squash * 0.4);
      }
    }

    ctx.save();
    ctx.translate(Math.round(npc.x - cameraX + shake.x), Math.round(npc.y - jumpOffset + shake.y));
    ctx.scale(scaleX, scaleY);
    if (shake.angle !== 0) {
      ctx.translate(0, -npc.h * 0.5);
      ctx.rotate(shake.angle);
      ctx.translate(0, npc.h * 0.5);
    }
    ctx.drawImage(img, frame * frameW, 0, frameW, frameH,
      -npc.w / 2, -npc.h, drawW, npc.h);
    ctx.restore();
  }
}
