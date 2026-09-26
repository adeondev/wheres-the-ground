const COVER_DURATION = 1.05;
const HOLD_DURATION = 0.12;
const REVEAL_DURATION = 0.8;
const BUMP_DURATION = 0.24;
const SPAWN_DURATION = COVER_DURATION - BUMP_DURATION;
const CLICK_INTERVAL = 0.02;
const COLORS = ['#ffc281', '#e6d9ff', '#9767cf'];

export function createRocketTransition({ onCovered = () => {}, onFinish = () => {}, onPop = () => {} } = {}) {
  const image = new Image();
  image.src = 'assets/ui/transition.png';
  const ready = image.decode();
  const surface = document.createElement('canvas');
  const context = surface.getContext('2d', { willReadFrequently: true });
  let stamps = [];
  let variants = [];
  let elapsed = 0;
  let active = false;
  let covered = false;
  let clicksPlayed = 0;

  function stamp(target, item, scale = 1, twist = 0) {
    target.save();
    target.translate(item.x, item.y);
    target.rotate(item.angle + twist);
    target.scale(scale, scale);
    target.imageSmoothingEnabled = false;
    target.drawImage(variants[item.color], -item.size / 2, -item.size / 2, item.size, item.size);
    target.restore();
  }

  function makeStamp(x, y) {
    return { x, y, size: 76 + Math.floor(Math.random() * 44),
      angle: Math.random() * Math.PI * 2, color: Math.floor(Math.random() * COLORS.length) };
  }

  function start(width, height) {
    surface.width = Math.ceil(width);
    surface.height = Math.ceil(height);
    variants = COLORS.map(color => {
      const tinted = document.createElement('canvas');
      tinted.width = image.width;
      tinted.height = image.height;
      const tint = tinted.getContext('2d');
      tint.drawImage(image, 0, 0);
      tint.globalCompositeOperation = 'source-in';
      tint.fillStyle = color;
      tint.fillRect(0, 0, tinted.width, tinted.height);
      return tinted;
    });
    stamps = [];
    for (let y = -20; y <= surface.height + 20; y += 22) {
      for (let x = -20; x <= surface.width + 20; x += 22) {
        stamps.push(makeStamp(x + Math.random() * 22, y + Math.random() * 22));
      }
    }
    for (let i = stamps.length - 1; i > 0; i--) {
      const next = Math.floor(Math.random() * (i + 1));
      [stamps[i], stamps[next]] = [stamps[next], stamps[i]];
    }
    for (const item of stamps) stamp(context, item);

    // Fecha também as frestas da silhueta: a troca só ocorre com cobertura opaca.
    const pixels = context.getImageData(0, 0, surface.width, surface.height).data;
    for (let y = 0; y < surface.height; y++) {
      for (let x = 0; x < surface.width; x++) {
        if (pixels[(y * surface.width + x) * 4 + 3] === 255) continue;
        const item = makeStamp(x + 0.5, y + 0.5);
        stamps.push(item);
        stamp(context, item);
        const left = Math.max(0, Math.floor(x - 90));
        const top = Math.max(0, Math.floor(y - 90));
        const w = Math.min(surface.width - left, 181);
        const h = Math.min(surface.height - top, 181);
        const patch = context.getImageData(left, top, w, h).data;
        for (let row = 0; row < h; row++) {
          for (let col = 0; col < w; col++) {
            pixels[((top + row) * surface.width + left + col) * 4 + 3] = patch[(row * w + col) * 4 + 3];
          }
        }
      }
    }
    elapsed = 0;
    covered = false;
    clicksPlayed = 0;
    active = true;
  }

  function update(dt) {
    if (!active) return;
    elapsed += dt;
    // Cadência contínua nas duas fases, sem perder cliques entre frames.
    const soundTime = Math.min(elapsed, SPAWN_DURATION)
      + Math.min(REVEAL_DURATION, Math.max(0, elapsed - COVER_DURATION - HOLD_DURATION));
    const targetClicks = Math.floor(soundTime / CLICK_INTERVAL);
    const pendingClicks = Math.min(3, targetClicks - clicksPlayed);
    for (let i = 0; i < pendingClicks; i++) onPop();
    clicksPlayed = targetClicks;
    if (!covered && elapsed >= COVER_DURATION) {
      covered = true;
      onCovered();
    }
    if (elapsed >= COVER_DURATION + HOLD_DURATION + REVEAL_DURATION) {
      active = false;
      onFinish();
    }
  }

  function draw(ctx, width, height) {
    if (!active) return;
    const reveal = Math.max(0, (elapsed - COVER_DURATION - HOLD_DURATION) / REVEAL_DURATION);
    const count = elapsed < SPAWN_DURATION
      ? Math.ceil(stamps.length * elapsed / SPAWN_DURATION)
      : Math.ceil(stamps.length * (1 - Math.min(1, reveal)));
    context.clearRect(0, 0, surface.width, surface.height);
    for (let i = 0; i < count; i++) {
      const age = elapsed - i / stamps.length * SPAWN_DURATION;
      const progress = Math.min(1, Math.max(0, age / BUMP_DURATION));
      // Bump discreto: entra ligeiramente maior e acomoda sem oscilar.
      const settle = (1 - progress) ** 3;
      stamp(context, stamps[i], 1 + settle * 0.08, settle * (i % 2 ? 0.025 : -0.025));
    }
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(surface, 0, 0, width, height);
    ctx.restore();
  }

  return { ready, start, update, draw, get active() { return active; } };
}
