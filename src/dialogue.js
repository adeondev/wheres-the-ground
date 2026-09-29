const EFFECTS = new Set(['shake', 'rgb', 'fall', 'wave']);
const UI_PATH = 'assets/ui/dialogue/';
const CHARACTER_PORTRAIT_SCALE = 3;
const CHARACTER_PORTRAIT_FRAME_SIZE = 32;
const GABRIEL_EXPRESSIONS = { normal: 0, excited: 2, suspicious: 4, angry: 6 };
const CHARACTER_PORTRAITS = {
  gabriel: { expressions: GABRIEL_EXPRESSIONS },
  milenio: { expressions: { normal: 0 } },
};
const CHARACTER_PORTRAIT_INSET = 10;
const CHARACTER_PORTRAIT_GAP = 8;
const LOWERCASE_BITMAP = {
  a: ['.....', '.....', '.###.', '....#', '.####', '#...#', '.####'],
  b: ['#....', '#....', '####.', '#...#', '#...#', '#...#', '####.'],
  c: ['.....', '.....', '.###.', '#...#', '#....', '#...#', '.###.'],
  d: ['....#', '....#', '.####', '#...#', '#...#', '#...#', '.####'],
  e: ['.....', '.....', '.###.', '#...#', '#####', '#....', '.####'],
  f: ['..##.', '.#..#', '.#...', '###..', '.#...', '.#...', '.#...'],
  g: ['.....', '.....', '.####', '#...#', '#...#', '.####', '....#', '.###.'],
  h: ['#....', '#....', '####.', '#...#', '#...#', '#...#', '#...#'],
  i: ['..#..', '.....', '.##..', '..#..', '..#..', '..#..', '.###.'],
  j: ['...#.', '.....', '..##.', '...#.', '...#.', '#..#.', '.##..'],
  k: ['#....', '#....', '#..#.', '#.#..', '##...', '#.#..', '#..#.'],
  l: ['.##..', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  m: ['.....', '.....', '##.#.', '#.#.#', '#.#.#', '#.#.#', '#.#.#'],
  n: ['.....', '.....', '####.', '#...#', '#...#', '#...#', '#...#'],
  o: ['.....', '.....', '.###.', '#...#', '#...#', '#...#', '.###.'],
  p: ['.....', '.....', '####.', '#...#', '#...#', '####.', '#....', '#....'],
  q: ['.....', '.....', '.####', '#...#', '#...#', '.####', '....#', '....#'],
  r: ['.....', '.....', '#.##.', '##..#', '#....', '#....', '#....'],
  s: ['.....', '.....', '.####', '#....', '.###.', '....#', '####.'],
  t: ['.#...', '.#...', '####.', '.#...', '.#...', '.#..#', '..##.'],
  u: ['.....', '.....', '#...#', '#...#', '#...#', '#..##', '.##.#'],
  v: ['.....', '.....', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  w: ['.....', '.....', '#...#', '#...#', '#.#.#', '#.#.#', '.#.#.'],
  x: ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  y: ['.....', '.....', '#...#', '#...#', '#...#', '.####', '....#', '.###.'],
  z: ['.....', '.....', '#####', '...#.', '..#..', '.#...', '#####'],
};

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

const frameCache = new WeakMap();

function nineSlice(ctx, image, x, y, width, height) {
  width = Math.round(width);
  height = Math.round(height);
  let cache = frameCache.get(image);
  if (!cache) { cache = new Map(); frameCache.set(image, cache); }
  const key = `${width}x${height}`;
  if (cache.has(key)) {
    ctx.drawImage(cache.get(key), Math.round(x), Math.round(y));
    return;
  }
  const frame = document.createElement('canvas');
  frame.width = width;
  frame.height = height;
  const frameCtx = frame.getContext('2d');
  frameCtx.imageSmoothingEnabled = false;
  const pointsX = [0, 8, 16, 24];
  const pointsY = [0, 8, 16, 24];
  const corner = 24;
  const destX = [0, corner, width - corner, width];
  const destY = [0, corner, height - corner, height];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      frameCtx.drawImage(image, pointsX[col], pointsY[row], 8, 8,
        destX[col], destY[row], destX[col + 1] - destX[col], destY[row + 1] - destY[row]);
    }
  }
  if (cache.size >= 8) cache.delete(cache.keys().next().value);
  cache.set(key, frame);
  ctx.drawImage(frame, Math.round(x), Math.round(y));
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

export function createDialogue(canvas, scenes, {
  onOpen = () => {}, onClose = () => {}, onCharacter = () => {}, onSilence = () => {},
  coordinateScale = () => 1,
} = {}) {
  const state = {};
  const assets = {};
  const tintCache = new Map();
  const lowercaseCache = new Map();
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
  let portraitSpeaking = false;
  let portraitLineStart = 0;

  Promise.all([
    loadImage('dialogue_box.png', 'assets/sprites/ui/dialog/'), loadImage('font.png'), loadImage('heart.png'),
    loadImage('arrow.png'), loadImage('signal.png'),
    loadImage('gabriel.png?v=expressions-8', 'assets/sprites/ui/dialog/characters/'),
    loadImage('milenio.png', 'assets/sprites/ui/dialog/characters/'),
    loadImage('keycap_press.png', 'assets/sprites/ui/'),
    fetch(`${UI_PATH}font.json`).then(response => {
      if (!response.ok) throw new Error('Metadata da fonte não carregou');
      return response.json();
    }),
    fetch('assets/sprites/ui/keycap_press.json')
      .then(response => response.ok ? response.json() : null)
      .catch(() => null),
  ]).then(([frame, font, heart, arrow, signal, gabriel, milenio, keycap, meta, keycapMeta]) => {
    Object.assign(assets, {
      frame, font, heart, arrow, signal, gabriel, milenio, keycap, meta,
      keycapMeta: keycapMeta || { frame_w: 16, frame_h: 16, frame_count: 2, columns: 2, fps: 2 },
    });
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
    if (char === ' ') return;
    if (char === char.toLowerCase() && char !== char.toUpperCase()) {
      const key = `${char}:${color}`;
      if (!lowercaseCache.has(key)) {
        const bitmap = document.createElement('canvas');
        bitmap.width = cellW;
        bitmap.height = cellH;
        const bitmapCtx = bitmap.getContext('2d');
        bitmapCtx.fillStyle = color;
        const [base, ...marks] = Array.from(char.normalize('NFD'));
        const rows = LOWERCASE_BITMAP[base] ?? [];
        rows.forEach((row, rowIndex) => {
          if (base === 'i' && marks.length && rowIndex === 0) return;
          for (let col = 0; col < row.length; col++) {
            if (row[col] === '#') bitmapCtx.fillRect(col, rowIndex + 1, 1, 1);
          }
        });
        for (const mark of marks) {
          if (mark === '\u0301') { bitmapCtx.fillRect(3, 0, 2, 1); }
          else if (mark === '\u0300') { bitmapCtx.fillRect(0, 0, 2, 1); }
          else if (mark === '\u0303') { bitmapCtx.fillRect(1, 0, 1, 1); bitmapCtx.fillRect(3, 0, 1, 1); }
          else if (mark === '\u0302') { bitmapCtx.fillRect(2, 0, 1, 1); bitmapCtx.fillRect(1, 1, 1, 1); bitmapCtx.fillRect(3, 1, 1, 1); }
          else if (mark === '\u0308') { bitmapCtx.fillRect(1, 0, 1, 1); bitmapCtx.fillRect(3, 0, 1, 1); }
          else if (mark === '\u0327') { bitmapCtx.fillRect(2, 8, 1, 1); }
        }
        lowercaseCache.set(key, bitmap);
      }
      ctx.drawImage(lowercaseCache.get(key), Math.round(x), Math.round(y));
      return;
    }
    const index = Math.max(0, chars.indexOf(char));
    const drawW = Math.max(1, cellW - 1);
    ctx.drawImage(tintedFont(color), index % cols * cellW, Math.floor(index / cols) * cellH,
      drawW, cellH, Math.round(x), Math.round(y), drawW, cellH);
  }

  function plainText(ctx, text, x, y, color = '#ffffff') {
    for (const char of Array.from(String(text))) {
      glyph(ctx, char, x, y, color);
      x += 6;
    }
  }

  let autoAdvanceTimer = null;
  let nextCharDelay = 0;

  function setLine() {
    onSilence();
    portraitSpeaking = false;
    portraitLineStart = elapsed;
    const line = node.lines[lineIndex];
    tokens = tokenizeDialogue(typeof line.text === 'function' ? line.text(state) : line.text);
    cursor = 0;
    timer = 0;
    nextCharDelay = 0;
    ready = false;
    autoAdvanceTimer = typeof line.autoAdvance === 'number' ? line.autoAdvance : null;
    choices = [];
    hitboxes = [];
    canvas.setAttribute('aria-label', `${line.speaker}: ${tokens.filter(token => token.type === 'char').map(token => token.char).join('')}`);
    line.onStart?.(state);
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
    onSilence();
    portraitSpeaking = false;
    active = false;
    autoAdvanceTimer = null;
    nextCharDelay = 0;
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
    onSilence();
    portraitSpeaking = false;
    while (cursor < tokens.length) {
      if (tokens[cursor].type === 'char') tokens[cursor].revealedAt = elapsed;
      cursor++;
    }
    nextCharDelay = 0;
    ready = true;
  }

  function advance() {
    if (!active) return;
    autoAdvanceTimer = null;
    nextCharDelay = 0;
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

  function characterPostDelay(token, index) {
    if (token.type === 'pause') return token.duration;
    if (token.speed != null) return token.speed;
    const char = token.char;
    if (char === ' ') return 0.015;
    if (char === '.') {
      const isEllipsis = (tokens[index - 1]?.char === '.') || (tokens[index + 1]?.char === '.');
      return isEllipsis ? 0.20 : 0.35;
    }
    if (char === '!' || char === '?') return 0.35;
    if (char === ',' || char === ';') return 0.20;
    if (char === ':' || char === '-') return 0.18;
    return 0.030;
  }

  function update(dt) {
    if (!active) return;
    elapsed += dt;
    if (ready) {
      if (autoAdvanceTimer !== null) {
        autoAdvanceTimer -= dt;
        if (autoAdvanceTimer <= 0) {
          autoAdvanceTimer = null;
          advance();
        }
      }
      return;
    }
    timer += Math.min(dt, 0.05);
    while (cursor < tokens.length) {
      if (timer < nextCharDelay) break;
      timer -= nextCharDelay;
      const token = tokens[cursor];
      cursor++;
      if (token.type === 'char') {
        token.revealedAt = elapsed;
        if (/\S/u.test(token.char)) onCharacter(node.lines[lineIndex].voice);
        if (/[\p{L}\p{N}]/u.test(token.char)) {
          if (!portraitSpeaking) portraitLineStart = elapsed;
          portraitSpeaking = true;
        } else if (/[.!?]/u.test(token.char)) portraitSpeaking = false;
      } else if (token.type === 'pause') {
        portraitSpeaking = false;
      }
      nextCharDelay = characterPostDelay(token, cursor - 1);
    }
    if (cursor >= tokens.length) {
      portraitSpeaking = false;
      if (timer >= nextCharDelay) {
        ready = true;
        onSilence();
      }
    }
  }

  function metrics(viewWidth, viewHeight) {
    const compact = viewWidth < 220;
    const width = compact ? viewWidth - 8 : Math.min(400, viewWidth - 18);
    const x = Math.round((viewWidth - width) / 2);
    const portrait = node.lines[lineIndex].portrait;
    const textX = compact || portrait === 'none' ? x + 18
      : CHARACTER_PORTRAITS[portrait] ? x + CHARACTER_PORTRAIT_INSET + CHARACTER_PORTRAIT_FRAME_SIZE * CHARACTER_PORTRAIT_SCALE + CHARACTER_PORTRAIT_GAP
        : x + 62;
    const textWidth = x + width - (compact ? 10 : 14) - textX;
    const lines = layoutLetters(tokens, Math.max(1, Math.floor(textWidth / 6)));
    const textY = 30;
    const optionY = Math.max(54, textY + lines * 11 + 10);
    const choiceCount = Math.max(choices.length, lineIndex === node.lines.length - 1 ? node.choices?.length ?? 0 : 0);
    const choiceRows = Math.ceil(choiceCount / (compact ? 1 : 2));
    const height = Math.max(compact ? 98 : 96,
      choiceRows ? optionY + choiceRows * 13 + 16 : textY + lines * 11 + 18);
    const y = node.position === 'bottom' ? Math.max(6, viewHeight - height - 8) : compact ? 6 : 12;
    return { x, y, width, height, textX, textWidth, textY, optionY, compact };
  }

  function draw(ctx, viewWidth, viewHeight) {
    if (!active || !assets.frame) return;
    const box = metrics(viewWidth, viewHeight);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    nineSlice(ctx, assets.frame, box.x, box.y, box.width, box.height);

    const line = node.lines[lineIndex];
    if (!box.compact && line.portrait !== 'none') {
      const characterPortrait = CHARACTER_PORTRAITS[line.portrait];
      const portrait = characterPortrait ? assets[line.portrait] : assets.signal;
      if (characterPortrait) {
        const size = CHARACTER_PORTRAIT_FRAME_SIZE;
        const baseFrame = characterPortrait.expressions[String(line.expression ?? 'normal').toLowerCase()] ?? 0;
        // A boca fica aberta por mais tempo e continua animando entre letras.
        const speaking = !ready && portraitSpeaking;
        const mouthOpen = speaking && (elapsed - portraitLineStart) % 0.20 < 0.14;
        const frame = baseFrame + (mouthOpen ? 1 : 0);
        const columns = Math.floor(portrait.width / size);
        const width = size * CHARACTER_PORTRAIT_SCALE;
        const height = size * CHARACTER_PORTRAIT_SCALE;
        ctx.drawImage(portrait, frame % columns * size, Math.floor(frame / columns) * size, size, size,
          box.x + CHARACTER_PORTRAIT_INSET,
          box.y + Math.round((box.height - height) / 2), width, height);
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
        if (node.shakeStyle === 'subtle') {
          // A brief shared tremble keeps letter spacing stable while the professor is nervous.
          if (elapsed % 2.6 < .18) x += Math.round(Math.sin(elapsed * 28));
        } else {
          x += Math.round(Math.sin(elapsed * 78 + i * 13));
          y += Math.round(Math.cos(elapsed * 64 + i * 9));
        }
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

  function drawPrompt(ctx, text, centerX, y, viewWidth, scale = 1) {
    if (!assets.font) return;
    const width = Array.from(text).length * 6 * scale;
    const x = Math.round(Math.max(8, Math.min(viewWidth - width - 8, centerX - width / 2)));
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(x, Math.round(y));
    ctx.scale(scale, scale);
    plainText(ctx, text, 1, 1, '#05080e');
    plainText(ctx, text, 0, 0, '#ffc281');
    ctx.restore();
  }

  function drawKeycapPrompt(ctx, template, viewWidth, viewHeight, time = 0, pressedKeys = {}, {
    centerX = null,
    y = null,
    hasPill = true,
  } = {}) {
    if (!assets.font || !assets.meta) return;

    const regex = /\{keycap\s+([^}]+)\}/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(template)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', text: template.slice(lastIndex, match.index) });
      }
      parts.push({ type: 'keycap', key: match[1].trim() });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < template.length) {
      parts.push({ type: 'text', text: template.slice(lastIndex) });
    }

    const hasA = parts.some(part => part.type === 'keycap' && part.key.toLowerCase() === 'a');
    const hasD = parts.some(part => part.type === 'keycap' && part.key.toLowerCase() === 'd');
    const isWalkPrompt = hasA && hasD;

    const walkCycle = time % 1.6;
    const aCyclePressed = walkCycle >= 0.05 && walkCycle < 0.45;
    const dCyclePressed = walkCycle >= 0.85 && walkCycle < 1.25;

    const singleCycle = time % 1.2;
    const singleCyclePressed = singleCycle >= 0.1 && singleCycle < 0.45;

    const keycapW = assets.keycapMeta?.frame_w || 16;
    const keycapH = assets.keycapMeta?.frame_h || 16;

    let contentWidth = 0;
    for (const part of parts) {
      if (part.type === 'keycap') {
        part.width = keycapW;
      } else {
        part.width = Array.from(part.text).length * 6;
      }
      contentWidth += part.width;
    }

    const padX = hasPill ? 7 : 0;
    const padY = hasPill ? 3 : 0;
    const boxW = contentWidth + padX * 2;
    const boxH = keycapH + padY * 2;

    let boxX;
    let boxY;

    if (centerX !== null && y !== null) {
      boxX = Math.round(Math.max(8, Math.min(viewWidth - boxW - 8, centerX - boxW / 2)));
      boxY = Math.round(Math.max(8, y - boxH));
    } else {
      boxX = Math.round(viewWidth - boxW - 10);
      boxY = Math.round(viewHeight - boxH - 9);
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (hasPill) {
      // Beveled background pill
      ctx.fillStyle = 'rgba(10, 14, 20, 0.82)';
      ctx.fillRect(boxX + 1, boxY, boxW - 2, boxH);
      ctx.fillRect(boxX, boxY + 1, boxW, boxH - 2);

      // Subtle 1px border
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.fillRect(boxX + 1, boxY, boxW - 2, 1);
      ctx.fillRect(boxX + 1, boxY + boxH - 1, boxW - 2, 1);
      ctx.fillRect(boxX, boxY + 1, 1, boxH - 2);
      ctx.fillRect(boxX + boxW - 1, boxY + 1, 1, boxH - 2);
    }

    let curX = boxX + padX;
    const keyY = boxY + padY;
    const textY = boxY + padY + 3;

    for (const part of parts) {
      if (part.type === 'keycap') {
        const k = part.key.toLowerCase();
        let isPressed = Boolean(pressedKeys[k]);
        if (!isPressed) {
          if (isWalkPrompt) {
            if (k === 'a') isPressed = aCyclePressed;
            else if (k === 'd') isPressed = dCyclePressed;
          } else {
            isPressed = singleCyclePressed;
          }
        }

        const frameIdx = isPressed ? 1 : 0;
        if (assets.keycap) {
          ctx.drawImage(
            assets.keycap,
            frameIdx * keycapW, 0, keycapW, keycapH,
            curX, keyY, keycapW, keycapH
          );
        }

        const char = part.key.toUpperCase();
        glyph(ctx, char, curX + 5, keyY + (isPressed ? 3 : 2), '#ffffff');
        curX += keycapW;
      } else {
        plainText(ctx, part.text, curX + 1, textY + 1, '#05080e');
        plainText(ctx, part.text, curX, textY, hasPill ? '#e4e8dc' : '#ffc281');
        curX += part.width;
      }
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
    const x = (event.clientX - bounds.left) * canvas.width / bounds.width / coordinateScale();
    const y = (event.clientY - bounds.top) * canvas.height / bounds.height / coordinateScale();
    if (choices.length) {
      const index = hitboxes.findIndex(box => x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h);
      if (index >= 0) choose(index);
    } else advance();
  });

  function drawTutorialHint(ctx, hint, anchorX, anchorY, characterHeight, width, height) {
    if (!assets.font || !assets.meta) return;
    const maxChars = Math.max(6, Math.min(30, Math.floor((width - 28) / 6)));
    const lines = [];
    let line = '';
    for (const word of hint.text.split(' ')) {
      if (line && line.length + word.length + 1 > maxChars) { lines.push(line); line = ''; }
      line += (line ? ' ' : '') + word;
    }
    if (line) lines.push(line);
    const badgeWidths = hint.keys.map(key => key.length * 6 + 12);
    const badgesWidth = badgeWidths.reduce((a,b) => a+b, 0) + Math.max(0,badgeWidths.length-1)*14;
    const stacked = badgesWidth > width-28;
    const badgesBlockWidth = stacked ? Math.max(0,...badgeWidths) : badgesWidth;
    const boxWidth = Math.max(badgesBlockWidth, ...lines.map(text => text.length * 6)) + 16;
    const boxHeight = lines.length * 13 + 12 + (hint.keys.length ? stacked ? hint.keys.length*28-5 : 23 : 0);
    const x = Math.round(Math.max(6, Math.min(width-boxWidth-6, anchorX-boxWidth/2)));
    let y = anchorY-boxHeight-12;
    if (y < 6) y = anchorY+characterHeight+10;
    y = Math.round(Math.max(6,Math.min(height-boxHeight-6,y)));
    ctx.save(); ctx.globalAlpha = hint.alpha;
    ctx.fillStyle='#110e1c'; ctx.fillRect(x+2,y,boxWidth-4,boxHeight); ctx.fillRect(x,y+2,boxWidth,boxHeight-4);
    ctx.fillStyle='#7b5b77'; ctx.fillRect(x+3,y,boxWidth-6,1); ctx.fillRect(x+3,y+boxHeight-1,boxWidth-6,1);
    lines.forEach((text,i) => plainText(ctx,text,x+Math.round((boxWidth-text.length*6)/2),y+6+i*13,'#f4e8d8'));
    let badgeX=x+Math.round((boxWidth-badgesBlockWidth)/2),badgeY=y+6+lines.length*13;
    hint.keys.forEach((key,i) => {
      if(stacked)badgeX=x+Math.round((boxWidth-badgeWidths[i])/2);
      ctx.fillStyle=hint.pressed?'#ffc281':'#443047';ctx.fillRect(badgeX,badgeY,badgeWidths[i],17);
      ctx.fillStyle='#c9936a';ctx.fillRect(badgeX,badgeY+16,badgeWidths[i],2);
      plainText(ctx,key,badgeX+6,badgeY+4,hint.pressed?'#16101f':'#ffe2a8');
      if(stacked){
        if(i<hint.keys.length-1)plainText(ctx,'+',x+Math.round(boxWidth/2)-3,badgeY+19,'#e9c8a3');
        badgeY+=28;
      }else{
        badgeX+=badgeWidths[i]+14;
        if(i<hint.keys.length-1)plainText(ctx,'+',badgeX-10,badgeY+4,'#e9c8a3');
      }
    });
    ctx.restore();
  }

  return {
    get active() { return active; },
    get state() { return state; },
    start, close, update, draw, drawPrompt, drawKeycapPrompt, drawTutorialHint,
  };
}
