import { drawHelicopter, helicopterPatrolPose, helicopterSocket } from './helicopters.js?v=helicopter-nose';

// Searchlights scan the facade vertically. A captured beam shuts down before controls return.
export function createNightSurveillance(world) {
  const lights = (world.nightBuildings ?? []).filter((_, i) => i > 0 && i < 17 && i % 3 !== 0).map((b, i) => ({
    building: b, x: b.x + b.w * .60, roofY: b.y + b.roofOffsets[Math.floor(b.w * .60)],
    horizontal: i % 3 !== 0, side: i % 2, phase: i * 1.7, time: 0, radius: 76, disabled: 0, aim: null,
  }));
  let capture = null, elapsed = 0, previous = null;
  const reactions = ['Ow!', 'Ai!', 'Meu olho!', 'Que luz!', 'Minha vista!', 'Pega leve!', 'Ai, meus olhos!', 'Ah, não!'];
  let lastReaction = -1;
  let lightCanvas, lightCtx, lightPixels;
  function helicopterPosition(light) {
    return helicopterPatrolPose(light);
  }
  function surfaceAt(x) {
    const b = world.buildings?.find(b => x >= b.x && x < b.x + b.w && !b.riseOffset) ??
      lights.find(light => x >= light.building.x && x < light.building.x + light.building.w)?.building;
    if (!b) return null;
    const local = Math.max(0, Math.min(b.w - 1, Math.floor(x - b.x)));
    let y = b.y + b.roofOffsets[local];
    for (const block of world.blocks ?? [])
      if (block.kind === 'obstacle' && x >= block.x && x < block.x + block.w) y = Math.min(y, block.y);
    return y;
  }
  function patrol(light) {
    const x = light.x + Math.sin(light.time * (light.horizontal ? .62 : .32) + light.phase) *
      (light.horizontal ? Math.max(80, light.building.w * .4 - 160) : 38);
    const local = Math.max(0, Math.min(light.building.w - 1, Math.floor(x - light.building.x)));
    const roof = surfaceAt(x) ?? light.building.y + light.building.roofOffsets[local];
    return { x, y: roof + Math.sin(light.time * .84 + light.phase) * (light.horizontal ? 4 : 14) };
  }
  for (const light of lights) light.aim = patrol(light);
  function target(light) { return light.aim; }
  function footprintDistance(x, y, spot, radius) {
    const ground = surfaceAt(x);
    if (ground == null) return Infinity;
    const depth = y - ground;
    return ((x - spot.x) / radius) ** 2 + (depth / (depth < 0 ? 18 : 34)) ** 2;
  }
  return {
    get caught() { return capture !== null; },
    get trackingPoint() { return capture ? { ...capture.light.aim } : null; },
    get reactionTime() { return capture?.time ?? 0; },
    get reaction() {
      if (!capture || capture.time >= 1.6) return null;
      return { text: reactions[capture.reaction], time: capture.time,
        opacity: Math.min(1, capture.time / .08, (1.6 - capture.time) / .3) };
    },
    get shakeX() { return capture ? Math.round(Math.sin(elapsed * 113) * 2) : 0; },
    get shakeY() { return capture ? Math.round(Math.cos(elapsed * 97)) : 0; },
    // Stop the powers, but airborne momentum and gravity continue through normal physics.
    hold(player) {
      if (player.onGround) player.vx = player.vy = 0;
      player.boosting = player.dashing = player.megaCharging = player.megaBoosting = player.recovering = player.reserveBoosting = false;
      player.dashTime = player.reserveTime = player.megaCarryTime = player.landSlideTime = player.dashStretch = 0;
      player.landImpactTime = player.turnSquashTime = 0;
    },
    update(dt, player, enabled = true) {
      elapsed += dt;
      const feet = { x: player.x + player.w / 2, y: player.y + player.h };
      if (!enabled && capture) { capture.light.disabled = 5; capture = null; }
      for (const light of lights) {
        light.time += dt; light.disabled = Math.max(0, light.disabled - dt);
        const wanted = capture?.light === light ? feet : patrol(light);
        const dx = wanted.x - light.aim.x, dy = wanted.y - light.aim.y;
        const distance = Math.hypot(dx, dy);
        const follow = Math.min(1 - Math.exp(-5 * dt), 420 * dt / (distance || 1));
        light.aim.x += dx * follow; light.aim.y += dy * follow;
      }
      if (capture) {
        capture.time += dt;
        if (capture.time >= 3.6) { capture.light.disabled = 5; capture = null; }
      } else if (enabled) {
        for (const light of lights) {
          if (light.disabled > 0) continue;
          const spot = target(light);
          // Only the visible footprint can capture; the cone above it is decorative.
          const from = previous && Math.hypot(previous.x - feet.x, previous.y - feet.y) < 160 ? previous : feet;
          const steps = Math.max(1, Math.ceil(Math.hypot(feet.x - from.x, feet.y - from.y) / 4));
          let touches = false;
          for (let step = 0; step <= steps && !touches; step++) {
            const t = step / steps;
            const cx = from.x + (feet.x - from.x) * t, y = from.y + (feet.y - from.y) * t;
            for (let offset = -player.w / 2 + 1; offset < player.w / 2; offset += 3) {
              if (footprintDistance(cx + offset, y, spot, light.radius) < 1) { touches = true; break; }
            }
          }
          if (touches) {
            const choices = reactions.length - (lastReaction < 0 ? 0 : 1);
            let reaction = Math.floor(Math.random() * choices);
            if (lastReaction >= 0 && reaction >= lastReaction) reaction++;
            lastReaction = reaction;
            capture = { light, time: 0, reaction }; this.hold(player); break;
          }
        }
      }
      previous = feet;
    },
    drawBackground(ctx, cameraX, cameraY, width, height) {
      for (const light of lights) {
        const helicopter = helicopterPosition(light);
        const x = helicopter.x - cameraX, y = helicopter.y - cameraY;
        if (x < -170 || x > width + 170 || y < -120 || y > height + 120) continue;
        drawHelicopter(ctx, x, y, elapsed + light.phase,
          { scale: 2.6, facing: helicopter.facing, bank: helicopter.bank, opacity: .85 });
      }
    },
    draw(ctx, cameraX, cameraY, width, height) {
      const grid = 2, originX = Math.floor(cameraX / grid) * grid, originY = Math.floor(cameraY / grid) * grid;
      const columns = Math.ceil(width / grid) + 2, rows = Math.ceil(height / grid) + 2;
      if (!lightCanvas) { lightCanvas = document.createElement('canvas'); lightCtx = lightCanvas.getContext('2d'); }
      if (lightCanvas.width !== columns || lightCanvas.height !== rows) {
        lightCanvas.width = columns; lightCanvas.height = rows;
        lightPixels = lightCtx.createImageData(columns, rows);
      }
      const pixels = lightPixels.data; pixels.fill(0);
      const surfaces = Array.from({ length: columns }, (_, col) => surfaceAt(originX + (col + .5) * grid));
      for (const light of lights) {
        if (light.disabled >= .7) continue;
        const aim = target(light);
        let floor = surfaceAt(aim.x), beam = { x: aim.x, y: floor ?? aim.y };
        const r = light.radius, haloRadius = r + 38;
        // Both the beam and the animated cabin use the same world-space socket.
        const helicopter = helicopterSocket(helicopterPosition(light), 2.6);
        const sourceX = helicopter.x, sourceY = helicopter.y;
        const left = Math.max(0, Math.floor((Math.min(beam.x - haloRadius, sourceX - 16) - originX) / grid));
        const right = Math.min(columns, Math.ceil((Math.max(beam.x + haloRadius, sourceX + 16) - originX) / grid));
        const top = Math.max(0, Math.floor((Math.min(beam.y - r, sourceY) - originY) / grid));
        const footprintGrounds = surfaces.slice(Math.max(0, Math.floor((beam.x - haloRadius - originX) / grid)),
          Math.min(columns, Math.ceil((beam.x + haloRadius - originX) / grid))).filter(y => y != null);
        const bottom = Math.min(rows, Math.ceil((Math.max(beam.y + r, ...footprintGrounds.map(y => y + 46)) - originY) / grid));
        if (left >= right || top >= bottom) continue;
        const returnFade = Math.max(0, Math.min(1, 1 - light.disabled / .7));
        const fade = (capture?.light === light ? Math.max(0, Math.min(1, (3.6 - capture.time) / .45)) : 1) * returnFade;
        for (let row = top; row < bottom; row++) {
          const py = originY + (row + .5) * grid;
          for (let col = left; col < right; col++) {
            const px = originX + (col + .5) * grid;
            const ground = surfaces[col], horizontal = ((px - beam.x) / r) ** 2;
            const depth = ground == null ? Infinity : py - ground;
            const spot = horizontal + (depth / (depth < 0 ? 18 : 34)) ** 2;
            // The footprint follows the local roof, ramp and vent top at every column.
            let strength = ground != null && spot < 1 ? .36 * (1 - spot) ** .9 : 0;
            // A soft visual spill blends across adjacent sprites; it never expands capture.
            const halo = ((px - beam.x) / haloRadius) ** 2 + (depth / (depth < 0 ? 28 : 44)) ** 2;
            if (ground != null && halo < 1) strength = Math.max(strength, .075 * (1 - halo) ** 1.4);
            if (ground != null && horizontal < 1 && Math.abs(depth) < 3)
              strength = Math.max(strength, .48 * (1 - horizontal));
            // The cone has one axis. Surface height clips its light, never bends the axis.
            const t = (py - sourceY) / Math.max(1, beam.y - sourceY);
            const surfaceFade = ground == null ? 1 : Math.max(0, Math.min(1, (ground + 8 - py) / 16));
            if (t > 0 && t <= 1.01 && surfaceFade > 0) {
              const axisX = sourceX + (beam.x - sourceX) * t;
              const halfWidth = 4 * (1 - Math.min(1, t)) + r * Math.min(1, t);
              const distance = Math.abs(px - axisX);
              // Keep light visible at the socket instead of fading from zero below the aircraft.
              const intensity = .6 + .4 * Math.min(1, t * 4);
              if (distance < halfWidth) strength = Math.max(strength, .22 * (1 - distance / halfWidth) ** .65 * intensity * surfaceFade);
              const softWidth = halfWidth + 8 + 30 * Math.min(1, t);
              if (distance < softWidth) strength = Math.max(strength, .075 * (1 - distance / softWidth) ** 1.4 * intensity * surfaceFade);
            }
            const index = (row * columns + col) * 4;
            // One light field: neither the beam/spot nor different lamps add opacity together.
            const alpha = Math.round(strength * fade * 255);
            if (alpha > pixels[index + 3]) { pixels[index] = 184; pixels[index + 1] = 218; pixels[index + 2] = 240; pixels[index + 3] = alpha; }
          }
        }
      }
      lightCtx.putImageData(lightPixels, 0, 0);
      ctx.save(); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(lightCanvas, originX - cameraX, originY - cameraY, columns * grid, rows * grid);
      ctx.restore();
    },
  };
}
