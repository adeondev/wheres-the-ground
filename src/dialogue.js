const EFFECTS = new Set(['shake', 'rgb', 'fall', 'wave']);
const UI_PATH = 'assets/ui/dialogue/';

// Tags podem ser aninhadas: [shake], [rgb], [fall], [wave],
// [color=#RRGGBB], [speed=0.05] e [pause=0.3].
export function tokenizeDialogue(text) {
  const tokens = [];
  const stack = [{ name: '', effects: [], color: '', speed: null }];
  const current = () => stack[stack.length - 1];
  const addText = value => {
    for (const char of Array.from(value)) {
      tokens.push({ type: 'char', char, effects: [...current().effects],
        color: current().color, speed: current().speed, revealedAt: 0 });
    }
  };
  const source = String(text);
  let position = 0;
  for (const match of source.matchAll(/\[([^\]]+)\]/g)) {
    addText(source.slice(position, match.index));
    position = match.index + match[0].length;
    const raw = match[1].trim();
    if (raw.startsWith('/')) {
      const name = raw.slice(1).toLowerCase();
      if (stack.length > 1 && current().name === name) stack.pop();
      else addText(match[0]);
      continue;
    }
    const [name, value] = raw.split('=', 2);
    const key = name.toLowerCase();
    if (key === 'pause' && value !== undefined && Number.isFinite(Number(value))) {
      tokens.push({ type: 'pause', duration: Math.max(0, Math.min(2, Number(value))) });
    } else if (EFFECTS.has(key) && value === undefined) {
      stack.push({ ...current(), name: key, effects: [...current().effects, key] });
    } else if (key === 'color' && /^#[0-9a-f]{6}$/i.test(value ?? '')) {
      stack.push({ ...current(), name: key, color: value });
    } else if (key === 'speed' && value !== undefined && Number.isFinite(Number(value))) {
      stack.push({ ...current(), name: key, speed: Math.max(0.005, Math.min(0.3, Number(value))) });
    } else {
      addText(match[0]);
    }
  }
  addText(source.slice(position));
  return tokens;
}

function loadImage(name, basePath = UI_PATH) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Não foi possível carregar ${name}`));
    image.src = `${basePath}${name}`;
  });
}

function nineSlice(ctx, image, x, y, width, height) {
  const pointsX = [0, 8, 16, 24];
  const pointsY = [0, 8, 16, 24];
  const destX = [x, x + 8, x + width - 8, x + width];
  const destY = [y, y + 8, y + height - 8, y + height];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      ctx.drawImage(image, pointsX[col], pointsY[row], 8, 8,
        destX[col], destY[row], destX[col + 1] - destX[col], destY[row + 1] - destY[row]);
    }
  }
}

function layoutLetters(tokens, maxCols) {
  let col = 0;
  let row = 0;
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    token.position = null;
    if (token.type !== 'char') continue;
    if (token.char === '\n') { col = 0; row++; continue; }
    if (token.char === ' ') {
      let word = 0;
      for (let next = index + 1; next < tokens.length; next++) {
        if (tokens[next].type !== 'char') continue;
        if (tokens[next].char === ' ' || tokens[next].char === '\n') break;
        word++;
      }
      if (col && col + 1 + word > maxCols) { col = 0; row++; continue; }
    }
    if (col >= maxCols) { col = 0; row++; }
    token.position = { x: col * 6, y: row * 11 };
    col++;
  }
  return row + 1;
}

export function createDialogue(canvas, scenes, { onOpen = () => {}, onClose = () => {} } = {}) {
  const state = {};
  const assets = {};
  const tintCache = new Map();
  let sprite = null;
  let active = false;
  let node = null;
  let lineIndex = 0;
  let tokens = [];
  let cursor = 0;
  let timer = 0;
  let elapsed = 0;
  let ready = false;
  let choices = [];
  let selected = 0;
  let hitboxes = [];

  Promise.all([
    loadImage('dialogue_box.png', 'assets/sprites/ui/dialog/'), loadImage('font.png'), loadImage('heart.png'),
    loadImage('arrow.png'), loadImage('signal.png'),
    fetch(`${UI_PATH}font.json`).then(response => {
      if (!response.ok) throw new Error('Metadata da fonte não carregou');
      return response.json();
    }),
  ]).then(([frame, font, heart, arrow, signal, meta]) => {
    Object.assign(assets, { frame, font, heart, arrow, signal, meta });
  }).catch(console.error);

  function tintedFont(color) {
    if (color === '#ffffff') return assets.font;
    if (tintCache.has(color)) return tintCache.get(color);
    const tinted = document.createElement('canvas');
    tinted.width = assets.font.width;
    tinted.height = assets.font.height;
    const context = tinted.getContext('2d');
    context.drawImage(assets.font, 0, 0);
    context.globalCompositeOperation = 'source-in';
    context.fillStyle = color;
    context.fillRect(0, 0, tinted.width, tinted.height);
    tintCache.set(color, tinted);
    return tinted;
  }

  function glyph(ctx, char, x, y, color = '#ffffff') {
    const { chars, cellW, cellH, cols } = assets.meta;
    const index = Math.max(0, chars.indexOf(char.toUpperCase()));
    if (char === ' ') return;
    ctx.drawImage(tintedFont(color), index % cols * cellW, Math.floor(index / cols) * cellH,
      cellW, cellH, Math.round(x), Math.round(y), cellW, cellH);
  }

  function plainText(ctx, text, x, y, color = '#ffffff') {
    for (const char of Array.from(String(text).toUpperCase())) {
      glyph(ctx, char, x, y, color);
      x += 6;
    }
  }

  function setLine() {
    const line = node.lines[lineIndex];
    tokens = tokenizeDialogue(typeof line.text === 'function' ? line.text(state) : line.text);
    cursor = 0;
    timer = 0;
    ready = false;
    choices = [];
    hitboxes = [];
    canvas.setAttribute('aria-label', `${line.speaker}: ${tokens.filter(token => token.type === 'char').map(token => token.char).join('')}`);
  }

  function showNode(id) {
    node = scenes[id];
    if (!node) throw new Error(`Diálogo inexistente: ${id}`);
    node.onEnter?.(state);
    lineIndex = 0;
    if (node.lines?.length) setLine();
    else finishNode();
  }

  function start(id) {
    if (active) close();
    active = true;
    document.body.classList.add('dialogue-open');
    onOpen();
    showNode(id);
  }

  function close() {
    if (!active) return;
    active = false;
    document.body.classList.remove('dialogue-open');
    canvas.setAttribute('aria-label', 'Jogo de plataforma');
    hitboxes = [];
    onClose();
  }

  function activateChoices() {
    choices = (node.choices ?? []).filter(choice => !choice.when || choice.when(state));
    selected = 0;
    if (!choices.length && node.next) showNode(node.next);
  }

  function finishNode() {
    node.onExit?.(state);
    if (node.choices?.length) activateChoices();
    else if (node.next) showNode(node.next);
    else close();
  }

  function revealAll() {
    while (cursor < tokens.length) {
      if (tokens[cursor].type === 'char') tokens[cursor].revealedAt = elapsed;
      cursor++;
    }
    ready = true;
  }

  function advance() {
    if (!active) return;
    if (choices.length) { choose(selected); return; }
    if (!ready) { revealAll(); return; }
    if (lineIndex < node.lines.length - 1) { lineIndex++; setLine(); return; }
    finishNode();
  }

  function choose(index) {
    const choice = choices[index];
    if (!active || !choice) return;
    choice.onSelect?.(state);
    if (choice.next) showNode(choice.next);
    else close();
  }

  function update(dt) {
    if (!active) return;
    elapsed += dt;
    if (ready) return;
    timer += Math.min(dt, 0.05);
    while (cursor < tokens.length) {
      const token = tokens[cursor];
      const delay = token.type === 'pause' ? token.duration
        : token.speed ?? (/[.!?]/.test(token.char) ? 0.1 : token.char === ' ' ? 0.01 : 0.028);
      if (timer < delay) break;
      timer -= delay;
      cursor++;
      if (token.type === 'char') token.revealedAt = elapsed;
    }
    if (cursor >= tokens.length) {
      ready = true;
    }
  }

  function metrics(viewWidth, viewHeight) {
    const compact = viewWidth < 220;
    const width = compact ? viewWidth - 8 : Math.min(400, viewWidth - 18);
    const x = Math.round((viewWidth - width) / 2);
    const textX = compact ? x + 18 : x + 62;
    const textWidth = x + width - (compact ? 10 : 14) - textX;
    const lines = layoutLetters(tokens, Math.max(1, Math.floor(textWidth / 6)));
    const textY = 30;
    const optionY = Math.max(54, textY + lines * 11 + 10);
    const choiceCount = Math.max(choices.length, lineIndex === node.lines.length - 1 ? node.choices?.length ?? 0 : 0);
    const choiceRows = Math.ceil(choiceCount / (compact ? 1 : 2));
    const height = Math.max(compact ? 98 : 96,
      choiceRows ? optionY + choiceRows * 13 + 16 : textY + lines * 11 + 18);
    const y = viewHeight - height - (compact ? 6 : 12);
    return { x, y, width, height, textX, textWidth, textY, optionY, compact };
  }

  function draw(ctx, viewWidth, viewHeight) {
    if (!active || !assets.frame) return;
    const box = metrics(viewWidth, viewHeight);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#05081088';
    ctx.fillRect(0, 0, viewWidth, viewHeight);
    nineSlice(ctx, assets.frame, box.x, box.y, box.width, box.height);

    const line = node.lines[lineIndex];
    if (!box.compact) {
      const portrait = line.portrait === 'gabriel' && sprite ? sprite.image : assets.signal;
      if (line.portrait === 'gabriel' && sprite) {
        ctx.drawImage(portrait, 0, 0, sprite.frameW, sprite.frameH,
          box.x + 14, box.y + 18, sprite.frameW * 2, sprite.frameH * 2);
      } else {
        ctx.drawImage(portrait, box.x + 14, box.y + 18, portrait.width * 2, portrait.height * 2);
      }
    }

    plainText(ctx, line.speaker, box.textX, box.y + 11, '#ffc281');
    for (let i = 0; i < cursor; i++) {
      const token = tokens[i];
      if (token.type !== 'char' || !token.position) continue;
      let x = box.textX + token.position.x;
      let y = box.y + box.textY + token.position.y;
      if (token.effects.includes('shake')) {
        x += Math.round(Math.sin(elapsed * 78 + i * 13));
        y += Math.round(Math.cos(elapsed * 64 + i * 9));
      }
      if (token.effects.includes('wave')) y += Math.round(Math.sin(elapsed * 10 + i * 0.7) * 2);
      if (token.effects.includes('fall')) {
        const fall = Math.max(0, 1 - (elapsed - token.revealedAt) / 0.25);
        y -= Math.round(12 * fall * fall);
      }
      if (token.effects.includes('rgb')) {
        const phase = Math.floor(elapsed * 9 + i / 3) % 3;
        const colors = ['#ff656d', '#67e8c1', '#6bbcff'];
        glyph(ctx, token.char, x - 1, y, colors[phase]);
        glyph(ctx, token.char, x + 1, y, colors[(phase + 1) % 3]);
        glyph(ctx, token.char, x, y, '#ffffff');
      } else {
        glyph(ctx, token.char, x, y, token.color || '#ffffff');
      }
    }

    hitboxes = [];
    if (choices.length) {
      const optionY = box.y + box.optionY;
      const columns = box.compact ? 1 : 2;
      const cellWidth = Math.floor(box.textWidth / columns);
      choices.forEach((choice, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);
        const x = box.textX + col * cellWidth;
        const y = optionY + row * 13;
        hitboxes.push({ x: x - 9, y: y - 2, w: cellWidth, h: 13 });
        if (index === selected) ctx.drawImage(assets.heart, x - 9, y - 1);
        plainText(ctx, choice.label, x, y, index === selected ? '#ffc281' : '#ffffff');
      });
    } else if (ready && Math.floor(elapsed * 3) % 2 === 0) {
      ctx.drawImage(assets.arrow, box.x + box.width - 17, box.y + box.height - 14);
    }
    ctx.restore();
  }

  window.addEventListener('keydown', event => {
    if (!active) return;
    const key = event.key.toLowerCase();
    const controlled = ['enter', ' ', 'z', 'e', 'escape', 'arrowup', 'arrowdown',
      'arrowleft', 'arrowright', 'w', 'a', 's', 'd', 'shift', 'j', 't'];
    if (!controlled.includes(key) && !/^[1-9]$/.test(key)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.repeat) return;
    if (key === 'escape') { close(); return; }
    if (choices.length) {
      if (['arrowup', 'arrowleft', 'w', 'a'].includes(key)) selected = (selected - 1 + choices.length) % choices.length;
      else if (['arrowdown', 'arrowright', 's', 'd'].includes(key)) selected = (selected + 1) % choices.length;
      else if (/^[1-9]$/.test(key)) choose(Number(key) - 1);
      else if (['enter', ' ', 'z', 'e'].includes(key)) choose(selected);
    } else if (['enter', ' ', 'z', 'e'].includes(key)) advance();
  }, true);

  canvas.addEventListener('pointerdown', event => {
    if (!active) return;
    event.preventDefault();
    const bounds = canvas.getBoundingClientRect();
    const x = (event.clientX - bounds.left) * canvas.width / bounds.width;
    const y = (event.clientY - bounds.top) * canvas.height / bounds.height;
    if (choices.length) {
      const index = hitboxes.findIndex(box => x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h);
      if (index >= 0) choose(index);
    } else advance();
  });

  return {
    get active() { return active; },
    get state() { return state; },
    start, close, update, draw,
    setSprite(value) { sprite = value; },
  };
}
