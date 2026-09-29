import { makeNightSprite } from './nightPalette.js?v=route-obstacles';
import { createCityObstacles, updateCityObstacles, drawCityObstacles } from './cityObstacles.js?v=no-roof-notices';
// Percurso provisório: apenas prédios feitos com as peças do catálogo 16×16.
const TILE_SCALE = 2;
const TILE_SIZE = 16 * TILE_SCALE;
// Subidas alternadas com patamares para pousar e recuperar combustível.
const ROOFTOP_HEIGHTS = [1120, 1088, 960, 1024, 640, 896, 544, 736,
  1088, 704, 384, 736, 608, 960, 640, 320, 672, 576, 960, 576, 256, 608, 288, 608];
const ROOFTOP_COLUMNS = [24, 14, 10, 18, 12, 16, 10, 20,
  12, 14, 10, 18, 12, 16, 10, 14, 18, 12, 16, 10, 14, 18, 10, 20];
const ROOFTOP_GAPS = [160, 192, 224, 192, 256, 160, 224, 288,
  192, 256, 160, 224, 288, 192, 256, 192, 288, 224, 192, 288, 160, 256, 224, 0];
let atlas;
let nightAtlas;
let metadata;
let loading;

export function loadRooftopAssets() {
  if (!loading) {
    loading = Promise.all([
      fetch('assets/sprites/tilesets/open_world_tileset.metadata.json?v=route-obstacles').then(response => {
        if (!response.ok) throw new Error('Não foi possível carregar a metadata dos prédios');
        return response.json();
      }),
      new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Não foi possível carregar o tileset dos prédios'));
        image.src = 'assets/sprites/tilesets/open_world_tileset.png?v=route-obstacles';
      }),
    ]).then(([catalog, image]) => { metadata = catalog; atlas = image; nightAtlas = makeNightSprite(image); });
  }
  return loading;
}

export function createRooftopWorld({ tutorial = false } = {}) {
  const byId = new Map(metadata.tiles.map(tile => [tile.id, tile]));
  const recipes = new Map(metadata.assemblies.map(recipe => [recipe.id, recipe]));
  const buildings = [], blocks = [], hazards = [];
  const height = 1920;
  let x = 0;
  // Large apartment blocks, a tower and a broad avenue create real crossings.
  const lessonHeights = { 2: 1280, 3: 480, 4: 960, 5: 1184, 6: 768, 7: 1024, 8: 544, 9: 800, 10: 384, 11: 736, 12: 512 };
  const lessonColumns = { 1: 40, 2: 32, 3: 44, 4: 42, 5: 40, 6: 32, 7: 44, 8: 34, 9: 41, 10: 36, 11: 40, 12: 32 };
  const lessonGaps = { 1: 288, 2: 256, 3: 384, 4: 1472, 5: 416, 6: 608, 7: 448, 8: 736, 9: 384, 10: 640, 11: 512 };
  for (let index = 0; index < 18; index++) {
    const template = index % ROOFTOP_HEIGHTS.length;
    const ramped = index >= 2 && index % 3 !== 1 && !(tutorial && index < 6);
    const cols = tutorial && lessonColumns[index] ? lessonColumns[index] : index < 2 ? ROOFTOP_COLUMNS[template]
      : Math.max(ramped ? 30 : 28, ROOFTOP_COLUMNS[template] + 12 + (index >= 24 ? 2 : 0));
    const y = tutorial ? lessonHeights[index] ?? ROOFTOP_HEIGHTS[template] : ROOFTOP_HEIGHTS[template];
    const rows = (height - y) / TILE_SIZE;
    const rampStart = 6, rampEnd = 14;
    const flipped = index % 2 === 1;
    const rampRecipe = recipes.get('rampa');
    const roofOffsets = Array(cols * TILE_SIZE).fill(0);
    if (ramped) {
      for (let pixel = 0; pixel < roofOffsets.length; pixel++) {
        const local = pixel - rampStart * TILE_SIZE;
        roofOffsets[pixel] = local < 0 ? (flipped ? 96 : 0) : local >= 256 ? (flipped ? 0 : 96)
          : Math.min(96, rampRecipe.surface.heights[flipped ? 127 - Math.floor(local / 2) : Math.floor(local / 2)] * TILE_SCALE);
      }
    }
    const roofAt = col => y + roofOffsets[Math.min(roofOffsets.length - 1, Math.max(0, Math.floor(col * TILE_SIZE)))];
    const cells = new Map();
    const putAt = (col, py, id, layer = byId.get(id).layer, flipX = false) => {
      if (!id) return;
      const tile = byId.get(id);
      cells.set(`${col},${py},${layer},${tile.assembly?.family}`, { tile, layer, flipX, x: x + col * TILE_SIZE, y: py });
    };
    const put = (col, row, id, layer, flipX) => putAt(col, y + row * TILE_SIZE, id, layer, flipX);
    const recipe = recipes.get('predio');
    for (let col = 0; col < cols; col++) {
      const inRamp = ramped && col >= rampStart && col < rampEnd;
      const roofRow = Math.round((roofAt(col) - y) / TILE_SIZE);
      if (!inRamp) put(col, roofRow, col === 0 ? recipe.roof.left : col === cols - 1 ? recipe.roof.right
        : recipe.roof.middle[(col - 1) % recipe.roof.middle.length]);
      const startRow = inRamp ? 4 : roofRow + 1;
      for (let row = startRow; row < rows; row++) {
        const band = row === startRow && !inRamp ? recipe.wall.top : row === rows - 1 ? recipe.wall.bottom : recipe.wall.middle;
        put(col, row, col === 0 ? band.left : col === cols - 1 ? band.right : band.middle[(col - 1) % band.middle.length]);
      }
    }
    if (ramped) rampRecipe.rows.forEach((row, dy) => row.forEach((id, dx) => {
      // The source's first column is an outer cap. Interior ramps join to middle tiles instead.
      const joinTile = rampRecipe.interiorJoin?.replacements[id];
      if (id) put(rampStart + (flipped ? 7 - dx : dx), dy, joinTile ?? id, 2, joinTile ? false : flipped);
    }));
    for (let col = 2; col + 1 < cols - 1; col += 4) {
      if (ramped && col < rampEnd && col + 1 >= rampStart) continue;
      const floorRow = Math.round((roofAt(col) - y) / TILE_SIZE);
      recipe.window.forEach((row, dy) => row.forEach((id, dx) => put(col + dx, floorRow + 1 + dy, id)));
    }
    const horizontal = (id, start, length) => {
      if (length < 2) return;
      const strip = recipes.get(id);
      for (let offset = 0; offset < length; offset++) {
        const tileId = offset === 0 ? strip.left : offset === length - 1 ? strip.right : strip.middle[(offset - 1) % strip.middle.length];
        putAt(start + offset, roofAt(start) - TILE_SIZE, tileId, 0, offset === 0 && Boolean(strip.flipLeft));
      }
    };
    if (ramped) {
      horizontal('mureta', 1, 4);
      horizontal('corrimao', rampEnd, Math.max(4, cols - rampEnd - 1));
    } else {
      const railStart = Math.floor(cols * 0.5), railLength = Math.max(4, Math.floor(cols * 0.25));
      horizontal('mureta', 1, railStart - 1);
      horizontal('corrimao', railStart, railLength);
      horizontal('mureta', railStart + railLength, cols - 1 - railStart - railLength);
    }
    const pattern = (id, start, floor = roofAt(start)) => {
      const shape = recipes.get(id);
      shape.rows.forEach((row, dy) => row.forEach((tileId, dx) => {
        if (tileId) putAt(start + dx, floor + (dy - shape.defaultHeight) * TILE_SIZE, tileId);
      }));
    };
    const entrance = index >= 2 && index % 3 === 2 ? 'acesso_caixa' : 'acesso';
    pattern(entrance, ramped ? 1 : index % 3 === 1 ? cols - 5 : 1);
    const freeStart = ramped ? rampEnd + 1 : Math.max(6, Math.floor(cols * 0.5) - 3);
    if (index >= 2) {
      if (index % 4 === 0) pattern('antena', freeStart);
      else if (index % 4 === 1) pattern('varal', freeStart);
      else {
        const tank = recipes.get('caixa_dagua');
        const bands = [tank.top, tank.middle, ...(index % 4 === 3 ? [tank.middle] : []), tank.bottom];
        bands.forEach((band, dy) => band.forEach((id, dx) => putAt(freeStart + dx, roofAt(freeStart) + (dy - bands.length) * TILE_SIZE, id)));
      }
      const placeVent = (ventStart, sharedVaral=false) => {
        const shape=recipes.get('bloco_telhado');
        if(sharedVaral)pattern('bloco_telhado',ventStart-1);
        else shape.rows[0].slice(1).forEach((id,dx)=>putAt(ventStart+dx,roofAt(ventStart)-TILE_SIZE,id));
        const behavior=shape.hazard;
        blocks.push({kind:'obstacle', x:x+ventStart*TILE_SIZE, y:roofAt(ventStart)-TILE_SIZE,
          w:3*TILE_SIZE, h:TILE_SIZE});
        if(!tutorial||index>5)hazards.push({building:index,x:x+(ventStart+1)*TILE_SIZE,
          y:roofAt(ventStart)-TILE_SIZE+(behavior.emitter?.offsetY??1)*TILE_SCALE,
          phase:index*.71,time:0,puffTimer:0,puffs:[],behavior});
      };
      if(cols-freeStart>=7&&index%4===1)placeVent(freeStart+4,true);
      else if([6,12].includes(index))placeVent(cols-6);
      else pattern('respiro',cols-2);
      // Keep the landing area and final goal clear; place extra vents on the far plateau.
      if (index >= 6 && index < 17 && ![6, 12].includes(index)) placeVent(index % 3 === 1 ? 8 : cols - 6);
    } else pattern('ventilacao', index === 0 ? 7 : 3);
    const pipeColumns = new Set([1, cols - 2]);
    for (let col = 5; col < cols - 4; col += 4) pipeColumns.add(col);
    for (const col of pipeColumns) {
      const startRow = ramped && col >= rampStart && col < rampEnd ? 4 : Math.round((roofAt(col) - y) / TILE_SIZE);
      for (let row = startRow; row < rows - 1; row++) put(col, row, 'cano_pendente', 4);
    }
    const building = { x, y, w: cols * TILE_SIZE, h: height - y, index, roofOffsets,
      tiles: [...cells.values()].sort((a, b) => a.layer - b.layer) };
    buildings.push(building);
    if (!ramped) blocks.push({ kind:'building', building:index, x, y, w: building.w, h: height - y });
    else {
      const leftY = roofAt(0), rightY = roofAt(cols - 1);
      blocks.push({ kind:'building', building:index, x, y: leftY, w: rampStart * TILE_SIZE, h: height - leftY },
        { kind:'building', building:index, x: x + rampEnd * TILE_SIZE, y: rightY, w: (cols - rampEnd) * TILE_SIZE, h: height - rightY },
        { kind:'building', building:index, x: x + rampStart * TILE_SIZE, y: y + 128, w: 256, h: height - y - 128 });
    }
    // Keep both tutorial rooftops and their crossing distance intact.
    const gap = tutorial && index === 0 ? 320 : tutorial && lessonGaps[index] ? lessonGaps[index] : (ROOFTOP_GAPS[template] || 224) * 2;
    x += building.w + gap;
  }
  const first = buildings[0];
  return {
    id: 'rooftops', width: buildings.at(-1).x + buildings.at(-1).w + 192, height,
    runStartX: buildings[5].x + 160, finishX: buildings.at(-1).x + buildings.at(-1).w - 96,
    groundY: first.y, deathY: height + 80, allowPowers: true, animationRate: 1,
    cameraZoom: 0.75, moveSpeed: 330, runAnimationRate: 1.20,
    landing: { minHeight: 192, minSpeed: 360, lockDuration: 0.30 },
    powers: { boostKick: 480, boostCruise: 420, boostCost: 60, boostDelay: 0,
      refill: 40, dashSpeed: 600, dashDuration: 0.14, dashCost: 8, dashCooldown: 0.4,
      maxRiseSpeed: 500, maxSpeed: 500, impulseDrag: 550,
      reserveKick: 600, reserveDuration: 0.18,
      megaChargeDuration: 0.48, megaSpeed: 900, megaDuration: 0.22,
      megaCost: 32, megaMinHeight: 96, megaLift: 55,
      reboundSpeed: 480, reboundJump: 360, reboundDuration: 0.22,
      reboundCost: 14, reboundWindow: 0.35 },
    stepSound: 'concrete', buildings,
    spawn: { x: 192, y: first.y }, checkpoint: { x: 192, y: first.y, building: 0 },
    npcs: [{ id: 'milenio', name: 'Milênio', x: 144, y: first.y, w: 58, h: 74,
      facing: 1, firstTalked: true }],
    blocks, hazards, hazardCooldown: 0, ...createCityObstacles(buildings),
  };
}

export function rooftopSurfaceY(world, positionX) {
  const building = world.buildings?.find(part => positionX >= part.x && positionX < part.x + part.w);
  if (!building) return null;
  return building.y + (building.roofOffsets?.[Math.min(building.w - 1, Math.max(0, Math.floor(positionX - building.x)))] ?? 0);
}

export function updateRooftopHazards(world, player, dt) {
  if (world.id !== 'rooftops') return;
  updateCityObstacles(world, player, dt);
  world.hazardCooldown = Math.max(0, world.hazardCooldown - dt);
  for (const vent of world.hazards) {
    vent.time += dt;
    const cycle = (vent.time + vent.phase) % vent.behavior.period;
    vent.active = cycle < vent.behavior.activeDuration;
    vent.warning = cycle >= vent.behavior.period - .65;
    vent.puffTimer -= dt;
    if (vent.active && vent.puffTimer <= 0) {
      vent.puffTimer = 0.065;
      vent.puffs.push({ x: vent.x + (Math.random() - 0.5) * 22, y: vent.y - 3,
        life: 1.1, dx: (Math.random() - 0.5) * 18 });
    }
    for (const puff of vent.puffs) { puff.y -= 90 * dt; puff.x += puff.dx * dt; puff.life -= dt; }
    vent.puffs = vent.puffs.filter(puff => puff.life > 0);
    if (vent.active && cycle > 0.18 && world.hazardCooldown <= 0 &&
        player.x + player.w > vent.x - 22 && player.x < vent.x + 22 &&
        player.y + player.h > vent.y - 96 && player.y < vent.y) {
      const force = vent.behavior.knockback;
      player.vx = (player.x + player.w / 2 < vent.x ? -1 : 1) * force.horizontal;
      player.vy = force.vertical;
      player.knockbackTime = 0.28;
      player.onGround = player.landed = player.landedHard = false;
      player.dashing = player.megaBoosting = player.megaCharging = player.boosting = false;
      player.dashTime = player.landLockTime = 0;
      player.reserveTime = 0;
      player.reserveBoosting = false;
      player.airApexY = player.y;
      world.hazardCooldown = force.cooldown;
    }
  }
}

export function rooftopGroundY(world, player) {
  const centerX = player.x + player.w / 2;
  const current = world.buildings.find(building => centerX >= building.x && centerX < building.x + building.w);
  if (current) return rooftopSurfaceY(world, centerX);
  const next = world.buildings.findIndex(building => building.x > centerX);
  if (next <= 0) return world.buildings[next === 0 ? 0 : world.buildings.length - 1].y;
  // Nos vãos, enquadrar os dois telhados para enxergar onde pousar.
  const left = world.buildings[next - 1], right = world.buildings[next];
  return Math.max(rooftopSurfaceY(world, left.x + left.w - 1), rooftopSurfaceY(world, right.x));
}

export function drawRooftops(ctx, world, cameraX, viewWidth) {
  if (!atlas) return;
  for (const building of world.buildings) {
    if (building.x + building.w < cameraX || building.x > cameraX + viewWidth) continue;
    for (const { tile, x, y, flipX } of building.tiles) {
      if (x + TILE_SIZE < cameraX || x > cameraX + viewWidth) continue;
      let drawY=y + (building.riseOffset ?? 0);
      const broken=world.fragileRoofs?.find(roof=>roof.building===building.index&&roof.state==='collapsed'&&
        x>=roof.x&&x<roof.x+roof.w&&y>=roof.y-TILE_SIZE&&y<roof.y+roof.depth);
      if(broken) continue;
      const straining = world.fragileRoofs?.find(roof => roof.building === building.index && roof.state === 'warning' &&
        y === roof.y && x >= roof.x && x < roof.x + roof.w);
      if (straining) drawY += Math.round(Math.sin(straining.time * 65 + x) * (straining.time / straining.warningDuration) * 2);
      const source = tile.source;
      if (flipX) {
        ctx.save();
        ctx.translate(Math.round(x - cameraX) + TILE_SIZE, drawY);
        ctx.scale(-1, 1);
        ctx.drawImage(atlas, source.x, source.y, source.w, source.h, 0, 0, TILE_SIZE, TILE_SIZE);
        if (nightAtlas && world.nightBlend > 0) {
          ctx.globalAlpha = world.nightBlend;
          ctx.drawImage(nightAtlas, source.x, source.y, source.w, source.h, 0, 0, TILE_SIZE, TILE_SIZE);
          if (tile.id.includes('janela') && nightAtlas.lightMask) {
            ctx.filter='blur(3px)';ctx.globalAlpha=world.nightBlend*.25;
            ctx.drawImage(nightAtlas.lightMask,source.x,source.y,source.w,source.h,0,0,TILE_SIZE,TILE_SIZE);
            ctx.filter='none';
          }
          ctx.globalAlpha = 1;
        }
        ctx.restore();
      } else {
        ctx.drawImage(atlas, source.x, source.y, source.w, source.h,
          Math.round(x - cameraX), drawY, TILE_SIZE, TILE_SIZE);
        if (nightAtlas && world.nightBlend > 0) {
          ctx.globalAlpha = world.nightBlend;
          ctx.drawImage(nightAtlas, source.x, source.y, source.w, source.h,
            Math.round(x - cameraX), drawY, TILE_SIZE, TILE_SIZE);
          if (tile.id.includes('janela') && nightAtlas.lightMask) {
            ctx.filter='blur(3px)';ctx.globalAlpha=world.nightBlend*.25;
            ctx.drawImage(nightAtlas.lightMask,source.x,source.y,source.w,source.h,Math.round(x-cameraX),drawY,TILE_SIZE,TILE_SIZE);
            ctx.filter='none';
          }
          ctx.globalAlpha = 1;
        }
      }
    }
  }
  for (const vent of world.hazards ?? []) {
    if (vent.x < cameraX - 64 || vent.x > cameraX + viewWidth + 64) continue;
    if(vent.warning) {
      const rim=Math.round(vent.x-cameraX), blink=Math.floor(vent.time*9)%2;
      ctx.fillStyle=blink?'#f5bd79':'#996352';ctx.fillRect(rim-9,vent.y-1,18,2);
      ctx.fillStyle='#bfb4b7';ctx.fillRect(rim-2,vent.y-7,3,3);
    }
    for (const puff of vent.puffs) {
      const size = 6 + Math.round((1 - puff.life / 1.1) * 14);
      const px = Math.round(puff.x - cameraX - size / 2), py = Math.round(puff.y - size / 2);
      ctx.globalAlpha = Math.min(0.8, puff.life);
      ctx.fillStyle = '#b9a9ba'; ctx.fillRect(px, py, size, size);
      ctx.fillStyle = '#e3d3cf'; ctx.fillRect(px + 2, py + 2, size - 4, 4);
    }
  }
  ctx.globalAlpha = 1;
  drawCityObstacles(ctx,world,cameraX,viewWidth,atlas,nightAtlas);
  if(world.goalVisible !== false && world.finishX >= cameraX-24 && world.finishX <= cameraX+viewWidth+24) {
    const flagX=Math.round(world.finishX-cameraX), floor=rooftopSurfaceY(world,world.finishX);
    ctx.fillStyle='#171020';ctx.fillRect(flagX-2,floor-66,6,66);
    ctx.fillStyle='#e3bb87';ctx.fillRect(flagX,floor-64,2,64);
    ctx.fillStyle='#f6e1c5';ctx.fillRect(flagX+2,floor-64,24,16);
    ctx.fillStyle='#35253e';
    for(let row=0;row<4;row++)for(let col=0;col<6;col++)if((row+col)%2===0)ctx.fillRect(flagX+2+col*4,floor-64+row*4,4,4);
  }
}


// Extend the existing world in place: the roof underneath Gabriel is never replaced.
export function appendNightDistrict(world, { revealed = false } = {}) {
  if (world.phase === 2) return;
  const templates = createRooftopWorld();
  const previousLast = world.buildings.at(-1);
  world.nightStart = { x: world.finishX - 28, y: rooftopSurfaceY(world, world.finishX), building: previousLast.index };
  let x = previousLast.x + previousLast.w + 160;
  const route = [1, 6, 10, 11, 14, 15, 16, 12, 6, 10, 13, 15, 11, 14, 16, 10, 12, 17];
  const heights = [previousLast.y + 32, 416, 672, 384, 640, 320, 544, 288, 576, 352, 640, 384, 704, 416, 608, 320, 544, 448];
  const gaps = [384, 576, 448, 640, 416, 576, 480, 672, 448, 608, 384, 640, 480, 576, 448, 672, 384, 0];
  const additions = [];
  for (let order = 0; order < route.length; order++) {
    const template = templates.buildings[route[order]], index = world.buildings.length;
    const dx = x - template.x, dy = heights[order] - template.y;
    const building = { ...template, x, y: template.y + dy, h: world.height - template.y - dy, index,
      roofOffsets: template.roofOffsets.slice(), riseOffset: revealed ? 0 : world.height + 200 - heights[order],
      tiles: template.tiles.map(tile => ({ ...tile, x: tile.x + dx, y: tile.y + dy })) };
    const solids = templates.blocks.filter(block => block.building === template.index).map(block =>
      ({ ...block, building: index, x: block.x + dx, y: block.y + dy, h: Math.max(32, world.height - block.y - dy) }));
    // Decorative vent bodies have no building tag; include them by their original roof extent.
    for (const block of templates.blocks.filter(block => block.kind === 'obstacle' && block.x >= template.x && block.x < template.x + template.w))
      solids.push({ ...block, x: block.x + dx, y: block.y + dy });
    // Carry the existing obstacle mechanics into the new district as well.
    for (const vent of templates.hazards.filter(vent => vent.building === template.index))
      world.hazards.push({ ...vent, building: index, x: vent.x + dx, y: vent.y + dy, phase: vent.phase + order * .47, puffs: [], time: 0 });
    if (order > 1 && order < route.length - 1 && order % 2 === 0) {
      const offset = building.w - 352, roofY = building.y + building.roofOffsets[offset];
      world.fragileRoofs.push({ building: index, x: x + offset, offset, w: 128, y: roofY, depth: 128,
        state: 'intact', time: 0, warningDuration: .5, offsets: building.roofOffsets.slice(offset, offset + 128), debris: [] });
    }
    if (order > 0 && order < route.length - 1 && order % 2 === 1) {
      world.winds.push({ building: index, x: x + building.w - 64, w: gaps[order] + 128, y: -960, h: world.height + 960,
        anchorX: x + building.w - 28, anchorY: building.y + building.roofOffsets.at(-1), direction: order % 2 ? -1 : 1,
        time: 0, phase: 0, period: 5.2, warningDuration: .65, activeDuration: 3.3, active: false, warning: false, encountered: false });
    }
    building.pendingSolids = revealed ? null : solids;
    world.buildings.push(building); additions.push(building);
    if (revealed) world.blocks.push(...solids);
    x += building.w + gaps[order];
  }
  world.phase = 2; world.nightBuildings = additions;
  world.width = world.buildings.at(-1).x + world.buildings.at(-1).w + 192;
  world.runStartX = world.nightStart.x;
  world.finishX = world.buildings.at(-1).x + world.buildings.at(-1).w - 128;
  world.goalVisible = revealed;
  world.nightBlend = revealed ? 1 : 0;
}
