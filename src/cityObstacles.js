import { createRoofDebris, updateRoofDebris, drawRoofDebris } from './roofDebris.js?v=route-obstacles';
// Environmental obstacles share the normal roof surfaces and collision bodies.
export function createCityObstacles(buildings) {
  const winds = [7, 8, 10, 11, 13, 14, 15, 16].map((index, order) => {
    const left = buildings[index], right = buildings[index + 1];
    const gap = right.x - left.x - left.w;
    return { building: index, x: left.x + left.w - 64, w: gap + 128,
      y: -960, h: Math.max(left.y, right.y) + 1400,
      anchorX: left.x + left.w - 28, anchorY: left.y + left.roofOffsets.at(-1),
      direction: order % 2 ? 1 : -1, time: 0, phase: order * .8,
      period: 5.2, warningDuration: .65, activeDuration: 3.3, active: false, warning: false, encountered: false };
  });
  const fragileRoofs = [8, 9, 11, 12, 14, 15, 16].map(index => {
    const building = buildings[index], offset = (building.w / 32 - 11) * 32;
    return { building: index, x: building.x + offset, offset, w: 128,
      y: building.y + building.roofOffsets[offset], depth: index === 8 ? 96 : 128,
      state: 'intact', time: 0, warningDuration: .5,
      offsets: building.roofOffsets.slice(offset, offset + 128),
      debris: [] };
  });
  return { winds, fragileRoofs };
}

export function rooftopWindForce(world, player) {
  if (world.id !== 'rooftops' || player.onGround) return 0;
  const cx = player.x + player.w / 2, cy = player.y + player.h / 2;
  let force = 0;
  for (const wind of world.winds ?? []) {
    if (!wind.active || cx < wind.x || cx > wind.x + wind.w || cy < wind.y || cy > wind.y + wind.h) continue;
    const edge = Math.min(1, (cx - wind.x) / 48, (wind.x + wind.w - cx) / 48);
    const cycle = (wind.time + wind.phase) % wind.period;
    const envelope = Math.min(1, (cycle - wind.warningDuration) / .3,
      (wind.warningDuration + wind.activeDuration - cycle) / .3);
    force += wind.direction * 360 * Math.max(0, edge * envelope);
  }
  return force;
}

function replaceRoofBody(world, roof) {
  const result = [];
  for (const block of world.blocks) {
    if (block.kind !== 'building' || block.building !== roof.building || block.x >= roof.x + roof.w || block.x + block.w <= roof.x) {
      result.push(block); continue;
    }
    const left = Math.max(block.x, roof.x), right = Math.min(block.x + block.w, roof.x + roof.w);
    if (block.x < left) result.push({ ...block, w: left - block.x });
    if (right < block.x + block.w) result.push({ ...block, x: right, w: block.x + block.w - right });
    const top = Math.max(block.y, roof.y + roof.depth);
    if (top < block.y + block.h) result.push({ ...block, x: left, y: top, w: right - left, h: block.y + block.h - top });
  }
  world.blocks = result;
}

export function updateCityObstacles(world, player, dt) {
  world.roofShake = { strain: 0, collapse: false, impact: 0 };
  for (const wind of world.winds ?? []) {
    const approaching=player.x+player.w>=wind.x-220&&player.x<=wind.x+wind.w+220;
    if(approaching&&!wind.encountered){wind.encountered=true;wind.phase=0;wind.time=0;}
    wind.time += dt;
    const cycle = (wind.time + wind.phase) % wind.period;
    wind.warning = cycle < wind.warningDuration;
    wind.active = cycle >= wind.warningDuration && cycle < wind.warningDuration + wind.activeDuration;
  }
  for (const roof of world.fragileRoofs ?? []) {
    const onRoof = player.onGround && player.x + player.w > roof.x && player.x < roof.x + roof.w &&
      Math.abs(player.y + player.h - roof.y) < 2;
    if (roof.state === 'intact' && onRoof) { roof.state = 'warning'; roof.time = 0; }
    if (roof.state !== 'intact') roof.time += dt;
    const nearby = Math.abs(player.x + player.w / 2 - roof.x - roof.w / 2) < 350 &&
      Math.abs(player.y + player.h - roof.y) < 300;
    if (nearby && roof.state === 'warning') world.roofShake.strain = Math.max(world.roofShake.strain, (roof.time / roof.warningDuration) ** 3);
    if (roof.state === 'warning' && roof.time >= roof.warningDuration) {
      roof.state = 'collapsed'; roof.time = 0;
      const building = world.buildings[roof.building];
      for (let i = 0; i < roof.w; i++) building.roofOffsets[roof.offset + i] = roof.offsets[i] + roof.depth;
      replaceRoofBody(world, roof);
      createRoofDebris(world, roof);
      if (nearby) world.roofShake.collapse = true;
      if (onRoof) {
        // Remove support, never move Gabriel: the following physics steps perform the fall.
        player.onGround = false; player.landLockTime = 0; player.landSlideTime = 0;
        player.airApexY = player.y;
      }
    }
    updateRoofDebris(roof, dt);
    if (nearby) world.roofShake.impact = Math.max(world.roofShake.impact, roof.impactEnergy ?? 0);

  }
}

export function drawCityObstacles(ctx, world, cameraX, viewWidth, atlas, nightAtlas) {
  ctx.save();
  for (const wind of world.winds ?? []) {
    if (wind.x + wind.w < cameraX - 40 || wind.anchorX > cameraX + viewWidth) continue;
    const x = Math.round(wind.anchorX - cameraX), y = wind.anchorY;
    ctx.fillStyle = '#191526'; ctx.fillRect(x - 2, y - 64, 4, 64);
    ctx.fillStyle = '#c5a995'; ctx.fillRect(x - 1, y - 64, 1, 63);
    const length = wind.active ? 36 : wind.warning ? 28 : 18;
    for (let offset = 0; offset < length; offset += 2) {
      const ratio = offset / length;
      const sway = wind.active || wind.warning ? Math.round(Math.sin(wind.time * 9 - ratio * 4) * ratio * 2) * 2 : Math.round(ratio * 8);
      const thickness = 12 - Math.floor(ratio * 4) * 2;
      const clothX = x + wind.direction * offset - (wind.direction < 0 ? 2 : 0);
      const clothY = y - 62 + sway;
      ctx.fillStyle = '#4a3541'; ctx.fillRect(clothX, clothY - 2, 2, thickness + 4);
      ctx.fillStyle = Math.floor(offset / 6) % 2 ? '#e9c79a' : '#c87859';
      ctx.fillRect(clothX, clothY, 2, thickness);
      ctx.fillStyle = '#f5d8b1'; ctx.fillRect(clothX, clothY, 2, 2);
    }

  }
  for (const roof of world.fragileRoofs ?? []) {
    if (roof.x + roof.w < cameraX || roof.x > cameraX + viewWidth) continue;
    if (roof.state !== 'collapsed') {
      const warning=roof.state==='warning', strength=warning?Math.min(1,roof.time/roof.warningDuration):0;
      const rx=Math.round(roof.x-cameraX);
      ctx.globalAlpha=warning?.48:.22;ctx.fillStyle=warning?'#ff3b45':'#e5ad4f';
      ctx.fillRect(rx,roof.y,roof.w,32);ctx.globalAlpha=1;
      ctx.fillStyle=warning?'#ff6972':'#e8bf68';ctx.fillRect(rx,roof.y-2,roof.w,3);
      for(let i=0;i<roof.w;i+=16){ctx.fillStyle='#302334';ctx.fillRect(rx+i,roof.y+2,8,4);}
      for(let i=0;i<4;i++){
        const cx=rx+12+i*28;ctx.fillStyle='#211724';ctx.fillRect(cx,roof.y+6,3,10+Math.round(strength*12));
        ctx.fillRect(cx-5,roof.y+12,8,3);ctx.fillRect(cx+3,roof.y+21,6,3);
      }
    } else {
      ctx.fillStyle='#723346';
      ctx.fillRect(Math.round(roof.x-cameraX)-3,roof.y,3,18);
      ctx.fillRect(Math.round(roof.x+roof.w-cameraX),roof.y,3,18);
    }
    drawRoofDebris(ctx, roof, cameraX, atlas, nightAtlas, world.nightBlend ?? 0);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
// World-anchored dust and tapered streaks stay coherent as the camera follows a flight.
export function drawWindGusts(ctx, world, cameraX, cameraY, width, height) {
  const noise = seed => { const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
  ctx.save();
  for (const wind of world.winds ?? []) {
    const left = Math.max(0, wind.x - cameraX), right = Math.min(width, wind.x + wind.w - cameraX);
    const top = Math.max(0, wind.y - cameraY), bottom = Math.min(height, wind.y + wind.h - cameraY);
    if (right <= left || bottom <= top) continue;
    ctx.save(); ctx.beginPath(); ctx.rect(left, top, right - left, bottom - top); ctx.clip();
    const cycle = (wind.time + wind.phase) % wind.period;
    const ramp = Math.max(0, Math.min(1, (cycle - wind.warningDuration) / .3,
      (wind.warningDuration + wind.activeDuration - cycle) / .35));
    const strength = wind.active ? .35 + ramp * .65 : wind.warning ? .25 : .08;
    const speed = wind.active ? 300 + ramp * 160 : wind.warning ? 180 : 65;
    const firstRow = Math.floor((top + cameraY) / 24) - 1;
    const lastRow = Math.ceil((bottom + cameraY) / 24);
    for (let row = firstRow; row <= lastRow; row++) {
      for (let item = 0; item < 2; item++) {
        const seed = row * 11 + item * 53 + wind.building * 7;
        const offset = noise(seed), drift = noise(seed + 2);
        const travel = ((wind.time * speed * (.7 + drift * .6) / wind.w + offset) % 1 + 1) % 1;
        const fade = Math.sin(travel * Math.PI) ** 2;
        const x = Math.round(wind.x + (wind.direction > 0 ? travel : 1 - travel) * wind.w - cameraX);
        const y = Math.round(row * 24 + noise(seed + 1) * 23 + Math.sin(wind.time * 1.8 + seed) * 3 - cameraY);
        const length = Math.round(4 + strength * (8 + drift * 18));
        // A faint tail dissolves into a small warm speck, rather than outlining the air.
        ctx.fillStyle = '#ffe1b1';
        for (let tail = 3; tail > 0; tail--) {
          ctx.globalAlpha = strength * fade * (.09 + (3 - tail) * .055);
          ctx.fillRect(x - wind.direction * Math.round(length * tail / 3), y, Math.ceil(length / 3), 1);
        }
        ctx.globalAlpha = strength * fade * (.3 + drift * .25);
        ctx.fillStyle = item ? '#e2b887' : '#fff0d0';
        ctx.fillRect(x, y, drift > .65 ? 2 : 1, 1);
        if (drift > .8) ctx.fillRect(x, y + 1, 1, 1);
      }
      // Sparse elongated wisps indicate the direction without crowding the skyline.
      if (((row % 4) + 4) % 4 === 0 && strength > .1) {
        const seed = row * 19 + wind.building;
        const travel = ((wind.time * speed * .8 / wind.w + noise(seed)) % 1 + 1) % 1;
        const x = Math.round(wind.x + (wind.direction > 0 ? travel : 1 - travel) * wind.w - cameraX);
        const y = Math.round(row * 24 + noise(seed + 3) * 24 - cameraY);
        const length = Math.round(32 + noise(seed + 1) * 40);
        ctx.fillStyle = '#ffe9c7';
        for (let part = 0; part < 8; part++) {
          ctx.globalAlpha = .24 * strength * Math.sin(travel * Math.PI) ** 2 * Math.sin((part + .5) / 8 * Math.PI);
          ctx.fillRect(x - wind.direction * Math.round(part * length / 8), y, Math.ceil(length / 8), 1);
        }
      }
    }
    ctx.restore();
  }
  ctx.restore();
}
