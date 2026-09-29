export function drawAscentLines(ctx, width, height, playerX, time) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 34; i++) {
    const length = 14 + i * 17 % 40;
    const speed = (280 + i * 47 % 360) * 2;
    const period = height + length * 2;
    const phase = time * speed + i * 79;
    const cycle = Math.floor(phase / period);
    const x = Math.round(((i * 137 + cycle * 53) % 997) / 997 * width);
    // Deixa a silhueta e as chamas legíveis no centro do voo.
    if (Math.abs(x - playerX) < 28) continue;
    const y = Math.round(phase % period - length);
    const fade = Math.max(0, Math.min(1, (y + length) / 28, (height - y) / 28));
    const thickness = i % 5 === 0 ? 2 : 1;
    ctx.fillStyle = i % 3 ? '#ffe4b7' : '#b8eaff';
    ctx.globalAlpha = fade * 0.18;
    ctx.fillRect(x, y, thickness, length);
    ctx.globalAlpha = fade * 0.5;
    ctx.fillRect(x, y + Math.round(length * 0.55), thickness, Math.round(length * 0.45));
    ctx.globalAlpha = fade * 0.75;
    ctx.fillRect(x, y + length - 3, thickness, 3);
  }
  ctx.restore();
}

export function drawDiscoveryFx(ctx, width, height, x, y, charge, burstTime, time) {
  const burst = burstTime >= 0 ? Math.max(0, 1 - burstTime / 1.1) : 0;
  if (charge <= 0 && burst <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const power = Math.max(charge * 0.55, burst);
  const radius = 32 + charge * 64 + (burst ? burstTime * 240 : 0);
  const light = ctx.createRadialGradient(x, y, 2, x, y, radius);
  light.addColorStop(0, `rgba(220,245,255,${power * 0.8})`);
  light.addColorStop(0.30, `rgba(86,204,255,${power * 0.48})`);
  light.addColorStop(0.65, `rgba(151,68,255,${power * 0.32})`);
  light.addColorStop(1, 'rgba(92,32,180,0)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, width, height);
  // Luz no chão e nas fachadas próximas aos pés.
  ctx.globalAlpha = power * 0.28;
  ctx.fillStyle = '#b279ff';
  ctx.fillRect(Math.round(x - radius * 0.6), Math.round(y + 8), Math.round(radius * 1.2), 3);
  ctx.globalAlpha = 1;
  const count = burst ? 34 : 14;
  for (let i = 0; i < count; i++) {
    const angle = i * Math.PI * 2 / count + (burst ? i * 0.61 : time * 1.5);
    const distance = burst ? 12 + burstTime * (70 + i % 5 * 25)
      : 12 + (1 - (time * 0.8 + i / count) % 1) * radius * 0.55;
    ctx.globalAlpha = burst ? burst : charge;
    ctx.fillStyle = i % 3 ? '#8beaff' : '#f7efff';
    const px = Math.round(x + Math.cos(angle) * distance);
    const py = Math.round(y + Math.sin(angle) * distance);
    ctx.fillRect(px, py, burst ? 3 : 2, burst ? 3 : 2);
    if (burst && i % 3 === 0) ctx.fillRect(px, py - 5, 1, 5);
  }
  if (burst) {
    ctx.globalAlpha = burst * 0.75;
    const waveRadius = 10 + burstTime * 250;
    for (let i = 0; i < 96; i++) {
      const angle = i * Math.PI / 48;
      ctx.fillStyle = i % 2 ? '#e7efff' : '#a891ff';
      ctx.fillRect(Math.round(x + Math.cos(angle) * waveRadius),
        Math.round(y + Math.sin(angle) * waveRadius), 2, 2);
    }
    ctx.globalAlpha = Math.max(0, 1 - burstTime / 0.14) * 0.55;
    ctx.fillStyle = '#e4f5ff';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
}

export function drawChargeBar(ctx, width, height, charge, dialogue) {
  const w = Math.min(170, Math.floor(width - 24));
  const x = Math.round((width - w) / 2);
  const y = Math.round(height - 26);
  ctx.fillStyle = '#080813';
  ctx.fillRect(x - 3, y - 3, w + 6, 17);
  ctx.fillStyle = '#6e445f';
  ctx.fillRect(x - 2, y - 2, w + 4, 15);
  ctx.fillStyle = '#e8b977';
  ctx.fillRect(x, y - 2, w, 1);
  ctx.fillRect(x, y + 12, w, 1);
  ctx.fillStyle = '#1b142b';
  ctx.fillRect(x, y, w, 11);
  const fill = Math.round(w * charge);
  ctx.fillStyle = '#9556df';
  ctx.fillRect(x, y, fill, 11);
  ctx.fillStyle = '#8eefff';
  ctx.fillRect(x, y, fill, 3);
  ctx.fillStyle = '#c9a7ff';
  ctx.fillRect(x, y + 9, fill, 2);
  dialogue.drawPrompt(ctx, `CARGA ${Math.round(charge * 100)}%`, width / 2, y - 12, width);
}
