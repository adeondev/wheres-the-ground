function halfBounds(part) {
  const c = Math.abs(Math.cos(part.angle)), s = Math.abs(Math.sin(part.angle));
  return { x: (part.w * c + part.h * s) / 2, y: (part.h * c + part.w * s) / 2 };
}

function dust(roof, x, y, amount) {
  for (let i = 0; i < amount; i++) roof.dust.push({ x, y,
    vx: (i - (amount - 1) / 2) * 22, vy: -16 - i % 3 * 10,
    age: 0, life: .35 + i % 3 * .08, size: 4 + i % 3 * 2 });
}

export function createRoofDebris(world, roof) {
  roof.debris = [];
  roof.dust = [];
  const building = world.buildings[roof.building];
  const tiles = building.tiles.filter(({ tile, x, y }) => tile.role === 'platform' &&
    y === roof.y && x >= roof.x && x < roof.x + roof.w);
  for (const [tileIndex, { tile, x, flipX }] of tiles.entries()) {
    for (let column = 0; column < 2; column++) {
      const index = roof.debris.length;
      const split = tileIndex % 2 ? 10 : 6;
      const sourceStart = column ? split : 0, sourceWidth = column ? tile.source.w - split : split;
      const sourceX = flipX ? tile.source.w - sourceStart - sourceWidth : sourceStart;
      roof.debris.push({ x: x + sourceStart * 2 + sourceWidth, y: roof.y + 16, w: sourceWidth * 2, h: 32,
        source: { x: tile.source.x + sourceX,
          y: tile.source.y, w: sourceWidth, h: tile.source.h }, flipX, seed: index,
        vx: (index - 3.5) * 3, vy: 8 + index % 3 * 7,
        angle: 0, spin: Math.sin(index * 4.7 + .6) * 1.9,
        fractured: false, settled: false, bounces: 0 });
    }
  }
  // Collision bodies are the same ones used by Gabriel, including the pit floor and walls.
  roof.rubbleSolids = world.blocks.filter(block => block.x < roof.x + roof.w + 64 &&
    block.x + block.w > roof.x - 64 && block.y < roof.y + roof.depth + 64 &&
    block.y + block.h > roof.y - 32);
  dust(roof, roof.x + roof.w / 2, roof.y, 5);
}

function fracture(roof, part, floor, next) {
  roof.impactEnergy = Math.max(roof.impactEnergy, Math.min(1, part.vy / 320));
  const split = part.seed % 2 ? 10 : 6;
  for (let row = 0; row < 2; row++) {
    const sourceHeight = row ? part.source.h - split : split;
    const child = { ...part, w: part.w, h: sourceHeight * 2,
      source: { ...part.source, y: part.source.y + (row ? split : 0), h: sourceHeight },
      x: part.x + (row ? 3 : -3), angle: part.angle + (row ? .2 : -.2),
      vx: part.vx + (row ? 24 : -24), vy: -65 - row * 16,
      spin: Math.sin(part.seed * 3.7 + row * 2 + .8) * 4, fractured: true, settled: false, bounces: 0 };
    const bounds = halfBounds(child);
    child.y = floor - bounds.y - 1;
    next.push(child);
  }
  dust(roof, part.x, floor - 3, 4);
}

function stepDebris(roof, dt) {
  const next = [];
  for (const part of roof.debris) {
    if (part.settled) { next.push(part); continue; }
    part.angle += part.spin * dt;
    const bounds = halfBounds(part);
    const oldX = part.x;
    part.x += part.vx * dt;
    for (const block of roof.rubbleSolids) {
      if (part.y + bounds.y <= block.y || part.y - bounds.y >= block.y + block.h ||
        part.x + bounds.x <= block.x || part.x - bounds.x >= block.x + block.w) continue;
      if (oldX <= block.x) part.x = block.x - bounds.x;
      else if (oldX >= block.x + block.w) part.x = block.x + block.w + bounds.x;
      else continue;
      part.vx *= -.25; part.spin *= -.45;
    }
    part.vy += 1050 * dt;
    const oldY = part.y;
    part.y += part.vy * dt;
    let floor = null;
    for (const block of roof.rubbleSolids) {
      if (part.x + bounds.x <= block.x || part.x - bounds.x >= block.x + block.w ||
        part.y + bounds.y <= block.y || part.y - bounds.y >= block.y + block.h) continue;
      if (part.vy > 0 && oldY < block.y) {
        part.y = block.y - bounds.y;
        floor = block.y;
        break;
      }
      if (part.vy < 0 && oldY > block.y + block.h) {
        part.y = block.y + block.h + bounds.y; part.vy *= -.2;
      }
    }
    if (floor !== null) {
      if (!part.fractured && part.vy > 100) { fracture(roof, part, floor, next); continue; }
      part.bounces++;
      if (part.vy > 70) roof.impactEnergy = Math.max(roof.impactEnergy, Math.min(.3, part.vy / 640));
      if (part.vy < 45 || part.bounces >= 3) {
        part.vx = part.vy = part.spin = 0; part.settled = true;
      } else {
        part.vy *= -.25; part.vx *= .6; part.spin *= .45;
      }
    }
    next.push(part);
  }
  roof.debris = next;
}

export function updateRoofDebris(roof, dt) {
  roof.impactEnergy = 0;
  if (!roof.rubbleSolids) return;
  // Small physics steps keep impacts and rebounds consistent at different frame rates.
  const steps = Math.max(1, Math.ceil(dt * 120)), step = dt / steps;
  for (let i = 0; i < steps; i++) stepDebris(roof, step);
  for (const puff of roof.dust) {
    puff.x += puff.vx * dt; puff.y += puff.vy * dt;
    puff.vy += 25 * dt; puff.age += dt;
  }
  roof.dust = roof.dust.filter(puff => puff.age < puff.life);
}

export function drawRoofDebris(ctx, roof, cameraX, atlas, nightAtlas, night = 0) {
  for (const part of roof.debris) {
    ctx.save(); ctx.translate(Math.round(part.x - cameraX), Math.round(part.y)); ctx.rotate(part.angle);
    if (part.flipX) ctx.scale(-1, 1);
    // Small broken corners expose the interior while preserving the actual roof texture.
    const left = -part.w / 2, top = -part.h / 2;
    ctx.beginPath(); ctx.moveTo(left + 2, top); ctx.lineTo(left + part.w, top);
    ctx.lineTo(left + part.w, top + part.h - 2); ctx.lineTo(left + part.w - 2, top + part.h);
    ctx.lineTo(left, top + part.h); ctx.lineTo(left, top + 2); ctx.closePath(); ctx.clip();
    if (atlas) {
      const src = part.source;
      ctx.drawImage(atlas, src.x, src.y, src.w, src.h, left, top, part.w, part.h);
      if(nightAtlas&&night>0){ctx.globalAlpha=night;ctx.drawImage(nightAtlas,src.x,src.y,src.w,src.h,left,top,part.w,part.h);ctx.globalAlpha=1;}
    } else { ctx.fillStyle = '#756478'; ctx.fillRect(left, top, part.w, part.h); }
    if (part.fractured) {
      ctx.fillStyle = `rgb(${Math.round(173-57*night)},${Math.round(139+19*night)},${Math.round(134+83*night)})`; ctx.fillRect(left, top, part.w, 2);
      ctx.fillStyle = '#34283d'; ctx.fillRect(left, top + part.h - 2, part.w, 2);
    }
    ctx.restore();
  }
  for (const puff of roof.dust ?? []) {
    const size = puff.size + Math.floor(puff.age * 10) * 2;
    ctx.globalAlpha = .32 * (1 - puff.age / puff.life);
    ctx.fillStyle = '#be9a8e';
    const x = Math.round(puff.x - cameraX - size / 2), y = Math.round(puff.y - size / 2);
    ctx.fillRect(x + 2, y, size - 4, size); ctx.fillRect(x, y + 2, size, size - 4);
  }
  ctx.globalAlpha = 1;
}
