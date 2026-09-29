const sheet = typeof Image === 'undefined' ? null : new Image();
let ready = false;
if (sheet) {
  sheet.onload = () => { ready = true; };
  sheet.src = 'assets/sprites/objects/sprisheet_helicopter.png?v=helicopters';
}

// Five square frames; the transparent lower half preserves the artist's alignment.
export function drawHelicopter(ctx, x, y, time, { scale = 1, facing = 1, opacity = 1, bank = 0 } = {}) {
  if (!ready) return;
  const frame = Math.floor(time * 14) % 5;
  ctx.save();
  ctx.globalAlpha *= opacity;
  ctx.imageSmoothingEnabled = false;
  ctx.filter = 'brightness(.72) saturate(.65)';
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(bank);
  ctx.scale(facing * scale, scale);
  ctx.drawImage(sheet, frame * 64, 0, 64, 64, -32, -28, 64, 64);
  ctx.restore();
}

export function helicopterPatrolPose(light) {
  const phase = light.time * .35 + light.phase;
  const forward = Math.cos(phase);
  return {
    x: light.x + (light.side ? 210 : -210) + Math.sin(phase) * 110,
    y: light.building.y - 135 + Math.cos(phase) * 14 + Math.sin(light.time * .9) * 2,
    // Hover and strafe facing the patrol area, without faking a 3D turn in a side sprite.
    facing: light.side ? -1 : 1,
    bank: forward * .045 + Math.sin(phase) * .025,
  };
}

export function helicopterSocket(pose, scale) {
  // Pixel (57, 31): the lamp at the lower front of the nose, mirrored with the sprite.
  const dx = 25 * pose.facing * scale, dy = 3 * scale;
  return { x: pose.x + dx * Math.cos(pose.bank) - dy * Math.sin(pose.bank),
    y: pose.y + dx * Math.sin(pose.bank) + dy * Math.cos(pose.bank) };
}
