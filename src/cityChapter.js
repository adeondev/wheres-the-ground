import { appendNightDistrict } from './rooftops.js?v=route-obstacles';

let portrait;
export function loadCallerPortrait() {
  return new Promise(resolve => {
    const image = new Image(); image.onload = () => { portrait = image; resolve(); };
    image.onerror = resolve; image.src = 'assets/sprites/ui/dialog/characters/milenio.png';
  });
}
const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

export function createCityChapter(world, { onAnswer = () => {}, onRing = () => {}, onReady = () => {}, night = false } = {}) {
  let phase = night ? 'free' : 'route', time = 0, ringTime = 0, cameraOffset = 0;
  let phoneBounds = null;
  return {
    get phase() { return phase; },
    get showObjective() { return phase === 'free' && time < 4; },
    get locked() { return ['incoming', 'talking', 'reveal', 'complete'].includes(phase); },
    get cameraOffset() { return cameraOffset; },
    complete() { if (phase === 'free') { phase = 'complete'; time = 0; } },
    ring() { if (phase !== 'route') return; phase = 'incoming'; time = ringTime = 0; onRing(); },
    answer() { if (phase !== 'incoming' || time < .25) return false; phase = 'talking'; time = 0; onAnswer(); return true; },
    hitPhone(x, y) { return phoneBounds && x >= phoneBounds.x && x <= phoneBounds.x + phoneBounds.w && y >= phoneBounds.y && y <= phoneBounds.y + phoneBounds.h; },
    finishCall() {
      if (phase !== 'talking') return;
      appendNightDistrict(world); phase = 'reveal'; time = 0;
    },
    update(dt) {
      time += dt;
      if (phase === 'incoming') { ringTime += dt; if (ringTime >= 2.6) { ringTime = 0; onRing(); } }
      if (phase === 'reveal') {
        world.nightBlend = smooth(time / 6.5);
        // A restrained camera lead keeps Gabriel visible while revealing the next roof.
        cameraOffset = 112 * smooth(time / 2) * (1 - smooth((time - 4.3) / 2));
        world.nightBuildings.forEach((building, index) => {
          const progress = smooth((time - index * .08) / 3.8);
          building.riseOffset = Math.round((world.height + 200 - building.y) * (1 - progress));
          if (progress === 1 && building.pendingSolids) { world.blocks.push(...building.pendingSolids); building.pendingSolids = null; }
        });
        if (time >= 6.5) { phase = 'free'; time = 0; cameraOffset = 0; world.nightBlend = 1; world.goalVisible = true; onReady(); }
      }
    },
    drawPhone(ctx, width, height, drawText) {
      if (!['incoming', 'talking'].includes(phase) || phase === 'talking' && time > .45) { phoneBounds = null; return; }
      const w = 82, h = 124;
      const enter = phase === 'incoming' ? smooth(time / .4) : 1 - smooth(time / .45);
      const vibration = phase === 'incoming' && ringTime % 2.6 < .5 ? Math.round(Math.sin(time * 48)) : 0;
      const x = Math.round(width - w - 10 + vibration), y = Math.round(height - h - 9 + (1 - enter) * (h + 20));
      phoneBounds = { x, y, w, h };
      ctx.save(); ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#080913'; ctx.fillRect(x + 3, y, w - 6, h); ctx.fillRect(x, y + 4, w, h - 8);
      ctx.fillStyle = '#6848ad'; ctx.fillRect(x + 2, y + 5, w - 4, h - 10);
      ctx.fillStyle = '#12132b'; ctx.fillRect(x + 4, y + 9, w - 8, h - 19);
      ctx.fillStyle = '#aca3c4'; ctx.fillRect(x + 29, y + 4, 12, 1);
      ctx.fillStyle = '#a3c8cb'; for (let i = 0; i < 3; i++) ctx.fillRect(x + 9 + i * 3, y + 15 - i * 2, 2, 2 + i * 2);
      ctx.fillStyle = '#6c55a1'; ctx.fillRect(x + 53, y + 13, 9, 4); ctx.fillRect(x + 62, y + 14, 1, 2);
      ctx.beginPath(); ctx.rect(x + 5, y + 10, w - 10, h - 21); ctx.clip();
      drawText(ctx, 'Milênio', x + w / 2, y + 24, width, 1);
      ctx.fillStyle = '#26243d'; ctx.fillRect(x + 23, y + 39, 36, 36);
      if (portrait) ctx.drawImage(portrait, 0, 0, 32, 32, x + 25, y + 41, 32, 32);
      drawText(ctx, phase === 'incoming' ? 'Chamando' : 'Em chamada', x + w / 2, y + 80, width, 1);
      ctx.fillStyle = '#78c39b'; ctx.fillRect(x + 34, y + 90, 5, 7); ctx.fillRect(x + 44, y + 90, 5, 7); ctx.fillRect(x + 37, y + 95, 9, 3);
      if (phase === 'incoming') drawText(ctx, 'Z / Enter', x + w / 2, y + 102, width, 1);
      ctx.restore();
    },
  };
}
