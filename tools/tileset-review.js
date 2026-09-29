(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const data = JSON.parse($('default-metadata').textContent);
  const byId = new Map(data.tiles.map(tile => [tile.id, tile]));
  const recipes = new Map(data.assemblies.map(recipe => [recipe.id, recipe]));
  const image = new Image();
  const scene = $('scene'), ctx = scene.getContext('2d');
  const held = new Set();
  const player = { x: 48, y: 100, vx: 0, vy: 0, onGround: true, cooldown: 0, facing: 1 };
  const roofs = [{ x: 0, y: 128, w: 256 }, { x: 320, y: 160, w: 128 }];
  let jumping = false, lastTime = 0, time = 0, hazardId = data.reviewHazard.assemblyId;
  let puffs = [], puffTimer = 0;
  let rampMode = false;

  function drawTile(context, item, ox = 0, oy = 0) {
    const tile = byId.get(item.tileId), r = tile.source;
    context.save();
    if (item.flipX) { context.translate(item.x + r.w + ox, item.y + oy); context.scale(-1, 1); }
    context.drawImage(image, r.x, r.y, r.w, r.h, item.flipX ? 0 : item.x + ox, item.flipX ? 0 : item.y + oy, r.w, r.h);
    context.restore();
  }
  const sorted = data.scene.placements.filter(item => byId.get(item.tileId).role !== 'character')
    .sort((a, b) => byId.get(a.tileId).layer - byId.get(b.tileId).layer);
  function renderExamples() {
    for (const example of data.reviewExamples) {
      const recipe = recipes.get(example.assemblyId);
      const card = document.createElement('article'); card.className = 'example';
      const title = document.createElement('h3'); title.textContent = example.label || recipe.label;
      const wrap = document.createElement('div'); wrap.className = 'sprite checker';
      const canvas = document.createElement('canvas'); canvas.width = example.width * 16; canvas.height = example.height * 16;
      canvas.style.width = canvas.width * 3 + 'px'; canvas.style.height = canvas.height * 3 + 'px';
      wrap.style.height = Math.max(200, canvas.height * 3 + 26) + 'px';
      const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false;
      const parts = window.TilesetAssemblies.build(recipe, example.width, example.height, 0, 0, 16, Boolean(example.flipX));
      parts.forEach(part => drawTile(c, part)); wrap.append(canvas);
      const count = document.createElement('small'); count.textContent = `${parts.length} peças · ${example.width} × ${example.height} tiles`;
      const note = document.createElement('p'); note.textContent = recipe.notes;
      card.append(title, wrap, count, note); $('examples').append(card);
    }
  }
  function renderTiles() {
    $('tiles').replaceChildren();
    const query = $('search').value.toLocaleLowerCase('pt-BR');
    for (const tile of data.tiles) {
      if ($('only-new').checked && !tile.reviewChange) continue;
      if (query && !`${tile.id} ${tile.label} ${tile.assembly?.family || ''}`.toLocaleLowerCase('pt-BR').includes(query)) continue;
      const card = document.createElement('div'); card.className = 'tile'; card.title = tile.notes;
      const thumb = document.createElement('canvas'); thumb.width = 32; thumb.height = 32;
      const c = thumb.getContext('2d'); c.imageSmoothingEnabled = false; const r = tile.source;
      c.drawImage(image, r.x, r.y, r.w, r.h, Math.floor((32 - r.w) / 2), Math.floor((32 - r.h) / 2), r.w, r.h);
      const details = document.createElement('div'); const name = document.createElement('strong'); name.textContent = tile.label;
      const source = document.createElement('small'); source.textContent = `X ${r.x} · Y ${r.y} · ${r.w}×${r.h}`;
      const id = document.createElement('small'); id.textContent = tile.id;
      const tag = document.createElement('small'); tag.className = 'tag'; tag.textContent = tile.reviewChange === 'new' ? 'NOVA · ' + tile.role : tile.reviewChange === 'updated' ? 'ARTE ALTERADA' : tile.role;
      details.append(name, source, id, tag); card.append(thumb, details); $('tiles').append(card);
    }
  }
  function resetPlayer() { Object.assign(player, { x: rampMode ? 24 : 48, y: rampMode ? 21 : 100, vx: 0, vy: 0, onGround: true, cooldown: 0 }); }
  function emitter() { return rampMode ? null : hazardId === 'respiro' ? { x: 120, y: 112 } : hazardId === 'bloco_telhado' ? { x: 224, y: 113 } : null; }
  function rampFloor(x) {
    const surface = data.rampDemo.surfaces.find(part => x >= part.x && x < part.x + part.width);
    return surface ? surface.y + (surface.heights?.[Math.floor(x - surface.x)] ?? 0) : null;
  }
  function update(dt) {
    time += dt; player.cooldown = Math.max(0, player.cooldown - dt);
    const direction = Number(held.has('d') || held.has('arrowright')) - Number(held.has('a') || held.has('arrowleft'));
    if (player.cooldown <= 0) player.vx = direction * 90;
    else player.vx *= Math.pow(0.98, dt * 60);
    if (direction) player.facing = direction;
    if (jumping && player.onGround) { player.vy = -220; player.onGround = false; }
    jumping = false;
    const previousBottom = player.y + 28;
    const wasGrounded = player.onGround;
    player.x = Math.max(0, Math.min(432, player.x + player.vx * dt));
    player.vy += 600 * dt; player.y += player.vy * dt; player.onGround = false;
    if (rampMode) {
      const floor = rampFloor(player.x + 8);
      if (floor !== null && player.vy >= 0 && ((wasGrounded && Math.abs(previousBottom - floor) <= 4) || (previousBottom <= floor + 1 && player.y + 28 >= floor))) {
        player.y = floor - 28; player.vy = 0; player.onGround = true;
      }
    } else for (const roof of roofs) {
      if (player.x + 16 > roof.x && player.x < roof.x + roof.w && previousBottom <= roof.y + 1 && player.y + 28 >= roof.y && player.vy >= 0) {
        player.y = roof.y - 28; player.vy = 0; player.onGround = true;
      }
    }
    if (player.y > 310) resetPlayer();
    const source = emitter();
    const active = source && time % data.reviewHazard.behavior.period < data.reviewHazard.behavior.activeDuration;
    puffTimer -= dt;
    if (active && puffTimer <= 0) { puffTimer = 0.075; puffs.push({ x: source.x + (Math.random() - 0.5) * 10, y: source.y - 2, life: 0.9, drift: (Math.random() - 0.5) * 14 }); }
    for (const puff of puffs) { puff.y -= 58 * dt; puff.x += puff.drift * dt; puff.life -= dt; }
    puffs = puffs.filter(puff => puff.life > 0);
    if (source && puffs.some(puff => puff.life > 0.2 && player.x + 16 > puff.x - 7 && player.x < puff.x + 7 && player.y + 28 > puff.y - 7 && player.y < puff.y + 7) && player.cooldown <= 0) {
      const force = data.reviewHazard.behavior.knockback;
      player.vx = (player.x + 8 < source.x ? -1 : 1) * force.horizontal;
      player.vy = force.vertical; player.onGround = false; player.cooldown = force.cooldown;
      $('demo-status').textContent = 'A fumaça empurra o personagem para longe e para cima.';
    }
  }
  function draw() {
    ctx.clearRect(0, 0, scene.width, scene.height); ctx.imageSmoothingEnabled = false;
    (rampMode ? data.rampDemo.placements : sorted).forEach(item => drawTile(ctx, item));
    const r = byId.get('personagem_referencia').source;
    ctx.save(); ctx.globalAlpha = player.cooldown > 0 ? 0.75 : 1;
    if (player.facing < 0) { ctx.translate(Math.round(player.x) + 16, Math.round(player.y)); ctx.scale(-1, 1); }
    ctx.drawImage(image, r.x, r.y, r.w, r.h, player.facing < 0 ? 0 : Math.round(player.x), player.facing < 0 ? 0 : Math.round(player.y), r.w, r.h); ctx.restore();
    for (const puff of puffs) {
      const size = Math.round(4 + (1 - puff.life / 0.9) * 7);
      ctx.globalAlpha = Math.min(0.85, puff.life);
      ctx.fillStyle = '#bbaebf'; ctx.fillRect(Math.round(puff.x - size / 2), Math.round(puff.y - size / 2), size, size);
      ctx.fillStyle = '#e2d4d2'; ctx.fillRect(Math.round(puff.x - size / 2 - 2), Math.round(puff.y - 2), size, 4);
    }
    ctx.globalAlpha = 1;
  }
  function frame(now) { const dt = Math.min(0.04, lastTime ? (now - lastTime) / 1000 : 0); lastTime = now; update(dt); draw(); requestAnimationFrame(frame); }
  window.addEventListener('keydown', event => {
    if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(document.activeElement?.tagName)) return;
    const key = event.key.toLowerCase();
    if (['a', 'd', 'arrowleft', 'arrowright', ' ', 'r'].includes(key)) { event.preventDefault(); held.add(key); if (key === ' ' && !event.repeat) jumping = true; if (key === 'r') resetPlayer(); }
  });
  window.addEventListener('keyup', event => held.delete(event.key.toLowerCase()));
  window.addEventListener('blur', () => held.clear());
  function changeDemo(ramps) {
    rampMode = ramps; held.clear(); jumping = false; puffs = []; resetPlayer(); scene.focus();
    $('demo-status').textContent = ramps ? 'Ande sobre as duas rampas com A/D ou ←/→. Espaço pula.' : 'Escolha o obstáculo para testar a fumaça e o knockback.';
  }
  $('test-ramps').onclick = () => changeDemo(true);
  $('test-roofs').onclick = () => changeDemo(false);
  $('hazard').onchange = () => { hazardId = $('hazard').value; data.reviewHazard.assemblyId = hazardId || null; data.reviewHazard.status = hazardId ? 'proposed' : 'awaiting-identification'; puffs = []; resetPlayer(); $('demo-status').textContent = hazardId ? 'Aproxime-se durante a emissão para testar o knockback.' : 'Escolha o obstáculo para testar a fumaça e o knockback.'; };
  $('test-smoke').onclick = () => {
    if (rampMode) changeDemo(false);
    const source = emitter();
    if (!source) { $('demo-status').textContent = 'Escolha qual objeto solta a fumaça primeiro.'; return; }
    resetPlayer(); player.x = source.x - 8; player.y = source.y - 28;
    time = Math.ceil(time / data.reviewHazard.behavior.period) * data.reviewHazard.behavior.period + 0.2;
    puffs = []; puffTimer = 0; scene.focus();
  };
  $('only-new').onchange = renderTiles; $('search').oninput = renderTiles;
  $('download').onclick = () => { const link = document.createElement('a'); const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); link.href = url; link.download = 'open_world_tileset.review.metadata.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  image.onload = () => {
    renderExamples(); renderTiles();
    for (const note of data.reviewNotes) { const li = document.createElement('li'); li.textContent = note; $('notes').append(li); }
    const fresh = data.tiles.filter(tile => tile.reviewChange === 'new').length;
    $('counts').textContent = `${fresh} peças novas · ${data.tiles.length} no total`;
    if (hazardId) { $('hazard').value = hazardId; $('demo-status').textContent = 'Aproxime-se durante a emissão para testar o knockback.'; }
    $('status').textContent = `Revisão carregada · ${data.assemblies.length} montagens · 16×16 · aprovação pendente.`;
    requestAnimationFrame(frame);
  };
  image.onerror = () => { $('status').textContent = 'Não foi possível carregar o PNG da revisão.'; };
  image.src = '../' + data.image.path;
})();
