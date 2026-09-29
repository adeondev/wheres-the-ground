import { makeNightSprite } from './nightPalette.js?v=route-obstacles';
// Céu e cidade em camadas, atrás dos prédios jogáveis.
let cityImage;
let nightCityImage;
let cityLoading;

export function loadCityBackground() {
  if (!cityLoading) {
    cityLoading = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => { cityImage = image; nightCityImage = makeNightSprite(image, true); resolve(); };
      image.onerror = () => reject(new Error('Não foi possível carregar o fundo da cidade.'));
      image.src = 'assets/rooms/city/predios_parallax.png';
    });
  }
  return cityLoading;
}

function drawCityLayer(ctx, width, height, bottom, cameraX, { scale, speed, offset, opacity, night = 0 }) {
  const tileWidth = cityImage.width * scale;
  const tileHeight = cityImage.height * scale;
  const scroll = ((cameraX * speed + offset) % tileWidth + tileWidth) % tileWidth;
  const firstX = -Math.round(scroll);
  const y = Math.round(bottom - tileHeight);
  ctx.save();
  ctx.globalAlpha = opacity;
  for (let x = firstX; x < width; x += tileWidth) {
    ctx.drawImage(cityImage, x, y, tileWidth, tileHeight);
    if (nightCityImage && night > 0) {
      ctx.globalAlpha = opacity * night;
      ctx.drawImage(nightCityImage, x, y, tileWidth, tileHeight);
      if (nightCityImage.lightMask) {
        ctx.filter = 'blur(3px)';ctx.globalAlpha = opacity * night * .35;
        ctx.drawImage(nightCityImage.lightMask, x, y, tileWidth, tileHeight);
        ctx.filter = 'none';
      }
      ctx.globalAlpha = opacity;
    }
    // A fachada continua abaixo do sprite quando a câmera está mais baixa.
    if (bottom < height) {
      ctx.fillStyle = mixColor('#19142e', '#10132d', night);
      ctx.fillRect(x, Math.round(bottom), tileWidth, Math.max(0, Math.ceil(height - bottom)));
    }
  }
  ctx.restore();
}
const SKY_COLORS = ['#d95849', '#e86647', '#f17548', '#f9854c', '#ff9552', '#ffa95f'];
const CLOUDS = Array.from({ length: 8 }, (_, index) => ({
  x: index * 223 - 90,
  y: 0.07 + ((index * 3) % 5) * 0.025,
  width: 110 + index % 4 * 24,
  height: 28 + index % 3 * 8,
  speed: 3 + index % 4,
}));

function pixelSun(ctx, x, y, radius, colors, opacity = 1) {
  ctx.save();
  ctx.globalAlpha = opacity;
  for (let row = -radius; row < radius; row += 4) {
    const dy = Math.min(radius, row + 2);
    const halfWidth = Math.round(Math.sqrt(Math.max(0, radius * radius - dy * dy)) / 4) * 4;
    const band = Math.min(colors.length - 1, Math.floor((row + radius) / (radius * 2) * colors.length));
    ctx.fillStyle = colors[band];
    ctx.fillRect(x - halfWidth, y + row, halfWidth * 2, 4);
  }
  ctx.restore();
}

function drawCloud(ctx, x, y, width, height, night = 0) {
  const lobes = [[0.18, 0.62, 0.22, 0.30], [0.40, 0.39, 0.26, 0.39],
    [0.64, 0.32, 0.22, 0.32], [0.83, 0.59, 0.20, 0.31]];
  for (let row = 0; row < height; row += 2) {
    const spans = [];
    for (const [cx, cy, rx, ry] of lobes) {
      const dy = (row + 1 - cy * height) / (ry * height);
      if (Math.abs(dy) >= 1) continue;
      const reach = rx * width * Math.sqrt(1 - dy * dy);
      spans.push([Math.floor((cx * width - reach) / 2) * 2,
        Math.ceil((cx * width + reach) / 2) * 2]);
    }
    spans.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const span of spans) {
      const last = merged.at(-1);
      if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]);
      else merged.push([...span]);
    }
    const shade = row / height;
    const cloudColor = shade < 0.22 ? '#ffe3b0' : shade < 0.46 ? '#f9cb92'
      : shade < 0.66 ? '#e7a778' : shade < 0.82 ? '#c98064' : '#a95d55';
    ctx.fillStyle = mixColor(cloudColor, shade < .46 ? '#667b9c' : '#303551', night);
    for (const [start, end] of merged) ctx.fillRect(x + start, y + row, end - start, 2);
  }
  ctx.fillStyle = mixColor('#d88f69', '#394560', night);
  ctx.fillRect(x + Math.round(width * 0.16), y + Math.round(height * 0.72), Math.round(width * 0.28), 2);
  ctx.fillRect(x + Math.round(width * 0.57), y + Math.round(height * 0.78), Math.round(width * 0.22), 2);
}

export function drawRooftopSky(ctx, width, height, cameraX, cameraY, time, groundY = 1120, cinematicRise = 0, night = 0) {
  ctx.imageSmoothingEnabled = false;
  for (let index = 0; index < SKY_COLORS.length; index++) {
    const y = Math.floor(height * index / SKY_COLORS.length);
    const nextY = Math.ceil(height * (index + 1) / SKY_COLORS.length);
    ctx.fillStyle = mixColor(SKY_COLORS[index], ['#090e24','#11162d','#1b203c','#252742','#33324e','#4b3d5e'][index], night);
    ctx.fillRect(0, y, Math.ceil(width), nextY - y);
  }
  if (night > 0) drawNightSky(ctx, width, height, cameraX, cameraY, time, night);
  const rise = groundY - height * 0.55 - cameraY;
  const sunX = Math.round(width * 0.61 - cameraX * 0.007);
  const sunY = Math.round(height * 0.48 + rise * 0.018 + night * height * .55);
  const radius = Math.round(Math.min(height * 0.31, width * 0.27));
  pixelSun(ctx, sunX, sunY, radius + 12, ['#ffce80'], 0.12 * (1 - night));
  pixelSun(ctx, sunX, sunY, radius + 4, ['#ffd48a'], 0.18 * (1 - night));
  pixelSun(ctx, sunX, sunY, radius, ['#ffdd96', '#ffd38b', '#ffca7b', '#ffc16f'], Math.max(0, 1 - night * 1.6));
  const period = Math.max(1800, width + 320);
  for (const cloud of CLOUDS) {
    const position = ((cloud.x + time * cloud.speed - cameraX * 0.10) % period + period) % period;
    const y = Math.round(height * cloud.y + rise * 0.04);
    for (const offset of [-period, 0]) {
      const x = Math.round(position + offset);
      if (x + cloud.width < 0 || x > width) continue;
      drawCloud(ctx, x, y, cloud.width, cloud.height, night);
    }
  }
  // Bancos finos no horizonte recortam o disco solar como no pôr do sol.
  for (let index = 0; index < 5; index++) {
    const w = 100 + index % 3 * 44;
    const position = ((index * 311 + time * 2.4 - cameraX * 0.035) % period + period) % period;
    const y = Math.round(height * (0.43 + index * 0.05) + rise * 0.03);
    for (const offset of [-period, 0]) {
      const x = Math.round(position + offset);
      if (x + w < 0 || x > width) continue;
      ctx.fillStyle = mixColor('#ee814e', '#3b4160', night);
      ctx.fillRect(x + 12, y, w - 24, 3);
      ctx.fillRect(x, y + 3, w, 4);
      ctx.fillStyle = mixColor('#f59a5d', '#515977', night);
      ctx.fillRect(x + 20, y + 7, w - 44, 2);
    }
  }
  if (cityImage) {
    drawCityLayer(ctx, width, height, height * 0.76 + rise * (0.06 + cinematicRise * 0.24), cameraX,
      { scale: 1, speed: 0.08, offset: 68, opacity: 0.48 + night * .12, night });
    drawCityLayer(ctx, width, height, height * 0.86 + rise * (0.12 + cinematicRise * 0.28), cameraX,
      { scale: 2, speed: 0.20, offset: 180, opacity: 1, night });
  }
}

function mixColor(day, night, amount) {
  const a = parseInt(day.slice(1), 16), b = parseInt(night.slice(1), 16);
  const channel = shift => Math.round(((a >> shift) & 255) * (1 - amount) + ((b >> shift) & 255) * amount);
  return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
}
function drawNightSky(ctx, width, height, cameraX, cameraY, time, night) {
  const noise = seed => { const value = Math.sin(seed * 127.1 + 3.7) * 43758.5453; return value - Math.floor(value); };
  ctx.save();
  // A faint violet haze gives the sky depth without overpowering the pixel silhouettes.
  pixelSun(ctx, Math.round(width * .34), Math.round(height * .25), Math.round(height * .24), ['#786aa6'], night * .035);
  for (let i = 0; i < 95; i++) {
    const span = width + 40;
    const x = Math.round(((noise(i + 1) * span - cameraX * .012) % span + span) % span - 20);
    const y = Math.round(noise(i + 101) * height * .72 - cameraY * .004);
    const glow = .45 + noise(i + 53) * .4 + Math.sin(time * (.6 + noise(i)) + i * 3) * .12;
    ctx.globalAlpha = Math.max(0, night - .12) * glow;
    ctx.fillStyle = i % 4 ? '#b7cfe9' : '#ffdfb6'; ctx.fillRect(x, y, 1, 1);
    if (i % 17 === 0) {
      ctx.globalAlpha *= .3;ctx.fillRect(x - 1, y, 3, 1);ctx.fillRect(x, y - 1, 1, 3);
    }
  }
  const moonX = Math.round(width * .79 - cameraX * .003), moonY = Math.round(height * (.83 - .64 * night));
  const moonFade = Math.max(0, (night - .25) / .75);
  pixelSun(ctx, moonX, moonY, 33, ['#9cc4f5'], moonFade * .025);
  pixelSun(ctx, moonX, moonY, 25, ['#9cc4f5'], moonFade * .05);
  ctx.save();ctx.globalAlpha=moonFade;
  for(let row=-15;row<15;row+=2){
    const half=Math.round(Math.sqrt(Math.max(0,225-(row+1)**2)));
    ctx.fillStyle=row<-5?'#e5edee':row<5?'#d2e0e9':'#bacfe3';
    ctx.fillRect(moonX-half,moonY+row,half*2,2);
  }
  ctx.restore();
  ctx.globalAlpha = moonFade * .35;ctx.fillStyle='#8baac7';ctx.fillRect(moonX-7,moonY-2,4,3);ctx.fillRect(moonX+3,moonY+4,3,3);
  const meteor = time % 23;
  if (night > .8 && meteor < .8) {
    const x = Math.round(width * .12 + meteor * 120), y = Math.round(height * .1 + meteor * 38);
    for (let i = 0; i < 9; i++) { ctx.globalAlpha = night * (1 - i / 9) * Math.sin(meteor / .8 * Math.PI);ctx.fillStyle='#d3e4f3';ctx.fillRect(x-i*3,y-i,2,1); }
  }
  ctx.restore();
}
