export const CITY_RUN_DURATION = 240;
let runnerPortrait;
export function loadRunnerPortrait() {
  return new Promise(resolve => {
    const image = new Image(); image.onload = () => { runnerPortrait = image; resolve(); };
    image.onerror = resolve; image.src = 'assets/sprites/ui/dialog/characters/gabriel.png?v=expressions-8';
  });
}

// The timed route starts after the last lesson, and survives checkpoint retries.
export function createCityRun(world, { onStart = () => {}, duration = CITY_RUN_DURATION } = {}) {
  let started = false, finished = false, expired = false, elapsed = 0, progress = 0;
  const startX = world.runStartX;
  const finishX = world.finishX;
  return {
    get state() { return { started, finished, expired, elapsed, remaining: Math.max(0, duration - elapsed), progress }; },
    update(dt, player, { free = false, paused = false } = {}) {
      if (!free || paused || finished || expired) return;
      if (!started) { started = true; onStart(); }
      elapsed = Math.min(duration, elapsed + dt);
      progress = Math.max(0, Math.min(1, (player.x + player.w / 2 - startX) / (finishX - startX)));
      const lastRoof = world.buildings.at(-1);
      if (player.onGround && player.x + player.w / 2 >= finishX &&
          player.x < lastRoof.x + lastRoof.w && player.y + player.h >= lastRoof.y - 40) {
        finished = true; progress = 1;
      }
      if (!finished && elapsed >= duration - 1e-8) { elapsed = duration; expired = true; }
    },
  };
}

export function formatRunTime(seconds) {
  const total = Math.floor(seconds * 100);
  return `${String(Math.floor(total / 6000)).padStart(2, '0')}:${String(Math.floor(total / 100) % 60).padStart(2, '0')}.${String(total % 100).padStart(2, '0')}`;
}

export function drawCityRunHud(ctx, state, width, drawText) {
  const w = Math.min(176, width - 16), x = Math.round((width - w) / 2), y = 7;
  const left = x + 12, right = x + w - 14, trackY = y + 18;
  ctx.save();
  const seconds = Math.ceil(state.remaining ?? Math.max(0, CITY_RUN_DURATION - state.elapsed));
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  drawText(ctx, clock, width / 2, y + 4, width, 1);
  ctx.fillStyle = '#0f0508'; ctx.fillRect(left - 3, trackY - 2, right - left + 6, 7);
  ctx.fillStyle = '#267b95'; ctx.fillRect(left - 2, trackY - 1, right - left + 4, 5);
  ctx.fillStyle = '#102d48'; ctx.fillRect(left, trackY, right - left, 3);
  ctx.fillStyle = '#b2f6ff'; ctx.fillRect(left, trackY - 1, right - left, 1);
  const marker = Math.round(left + (right - left) * state.progress);
  ctx.fillStyle = '#54e6ee'; ctx.fillRect(left, trackY, marker - left, 3);
  ctx.fillStyle = '#091126'; ctx.fillRect(marker - 6, trackY - 6, 13, 13);
  ctx.fillStyle = '#54e6ee'; ctx.fillRect(marker - 5, trackY - 5, 11, 11);
  if (runnerPortrait) ctx.drawImage(runnerPortrait, 0, 0, 32, 32, marker - 5, trackY - 5, 11, 11);
  // Checkered goal flag and its pole.
  ctx.fillStyle = '#f6e1c5'; ctx.fillRect(right, trackY - 7, 1, 12); ctx.fillRect(right + 1, trackY - 7, 7, 5);
  ctx.fillStyle = '#35253e'; ctx.fillRect(right + 1, trackY - 7, 2, 2); ctx.fillRect(right + 5, trackY - 7, 2, 2); ctx.fillRect(right + 3, trackY - 5, 2, 2);
  ctx.restore();
}
