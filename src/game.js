import { GAME_HEIGHT, PLAYER } from './config.js';
import { DASH_ANIMATION_DURATION, playerPose } from './animation.js';
import { createAudio } from './audio.js?v=random-transition-sounds';
import { createCameraEffects } from './cameraEffects.js';
import { createCrt } from './crt.js';
import { createDialogue } from './dialogue.js?v=seamless-frame';
import { dialogueScenes } from './dialogueData.js?v=integer-camera';
import { createEffects } from './effects.js?v=milenio';
import { drawRocketFlame } from './fireVfx.js';
import { createInput } from './input.js?v=milenio-greeting';
import { createIntro } from './intro.js';
import { createRocketTransition } from './rocketTransition.js?v=exit-clicks';
import { drawNpcs, nearbyNpc, npcJumpOffset, startNpcInteraction, updateNpcs } from './npcs.js?v=clear-dialogue';
import { BOOST_FIRE } from './palette.js';
import { createPlayer, fireBlast, updatePlayer } from './player.js?v=milenio';
import { loadGabriel, loadGabrielBoost, loadGabrielDash, loadGabrielJump, loadGabrielLanding, loadGabrielRun } from './sprites.js';
import { CLASSROOM_SCALE, createWorld, drawWorld, overlaps, solidBlocks } from './world.js?v=milenio';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const sceneCanvas = document.createElement('canvas');
const sceneCtx = sceneCanvas.getContext('2d');
const videoFrameCanvas = document.createElement('canvas');
const videoFrameCtx = videoFrameCanvas.getContext('2d');
let uiScale = 1;
let viewWidth = 1;
const viewHeight = GAME_HEIGHT;
const openingVideo = document.querySelector('#opening-video');
const loadingLabel = document.querySelector('#loading-label');
const loadingFill = document.querySelector('#loading-fill');
const loadingRetry = document.querySelector('#loading-retry');
const fuelFill = document.querySelector('#fuel-fill');
const fuelLabel = document.querySelector('#fuel-label');
const controlsHint = document.querySelector('.controls-hint');
const fullControlsHint = controlsHint.textContent;
const input = createInput();
const crt = createCrt();
const audio = createAudio();
let openingDialogue = false;
let interactingNpc = null;
const rocketTransition = createRocketTransition({
  onPop: () => audio.playTransitionClick(),
  onCovered: () => { openingDialogue = false; input.clear(); },
  onFinish: () => { input.clear(); document.body.classList.remove('transition-open'); },
});
const dialogue = createDialogue(canvas, dialogueScenes, {
  onOpen: () => input.clear(),
  onClose: () => {
    input.clear();
    if (openingDialogue) {
      document.body.classList.add('transition-open');
      rocketTransition.start(viewWidth, viewHeight);
    }
  },
  onCharacter: voice => audio.playDialogBlip(voice),
  onSilence: () => audio.stopDialogBlip(),
  coordinateScale: () => uiScale,
});
const effects = createEffects();
const cameraEffects = createCameraEffects();
const intro = createIntro(audio, { onFinish: () => { input.clear(); playOpeningVideo(); } });
const projectiles = [];
const STEP = 1 / 60;
const CAMERA_ZOOM = 1.4;

let world;
let player;
let sprite = null;
let runSprite = null;
let jumpSprite = null;
let boostSprite = null;
let dashSprite = null;
let landingSprite = null;
let cameraX = 0;
let previousCameraX = 0;
let previousPlayerX = 0;
let previousPlayerY = 0;
let animationTime = 0;
let runAnimationTime = 0;
let jumpAnimationTime = 0;
let boostAnimationTime = 0;
let dashAnimationTime = DASH_ANIMATION_DURATION;
let lastTime = 0;
let accumulator = 0;
let booting = true;
let videoPlaying = false;
let videoUrl = null;

async function loadOpeningVideo() {
  loadingRetry.hidden = true;
  loadingFill.style.width = '0%';
  loadingLabel.textContent = 'CARREGANDO VÍDEO... 0%';
  try {
    const response = await fetch('assets/videos/intial.webm');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const total = Number(response.headers.get('Content-Length'));
    const chunks = [];
    if (response.body) {
      const reader = response.body.getReader();
      let loaded = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.byteLength;
        if (total > 0) {
          const percent = Math.min(99, Math.round(loaded / total * 100));
          loadingFill.style.width = `${percent}%`;
          loadingLabel.textContent = `CARREGANDO VÍDEO... ${percent}%`;
        }
      }
    } else {
      chunks.push(await response.blob());
    }

    loadingLabel.textContent = 'PREPARANDO VÍDEO...';
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    videoUrl = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
    await new Promise((resolve, reject) => {
      const cleanup = () => {
        openingVideo.removeEventListener('loadeddata', onLoaded);
        openingVideo.removeEventListener('error', onError);
      };
      const onLoaded = () => { cleanup(); resolve(); };
      const onError = () => { cleanup(); reject(new Error('Formato de vídeo não suportado')); };
      openingVideo.addEventListener('loadeddata', onLoaded);
      openingVideo.addEventListener('error', onError);
      openingVideo.src = videoUrl;
      openingVideo.load();
    });

    await rocketTransition.ready;
    loadingFill.style.width = '100%';
    loadingRetry.blur();
    booting = false;
    document.body.classList.remove('loading');
    intro.start();
  } catch (error) {
    console.error('Não foi possível carregar o vídeo de abertura:', error);
    loadingLabel.textContent = 'ERRO AO CARREGAR O VÍDEO';
    loadingRetry.hidden = false;
  }
}

function endOpeningVideo() {
  if (!videoPlaying) return;
  videoPlaying = false;
  openingVideo.pause();
  document.body.classList.remove('video-open');
  input.clear();
  openingDialogue = true;
  dialogue.start('despedida');
}

function playOpeningVideo() {
  videoPlaying = true;
  input.clear();
  document.body.classList.remove('intro-open');
  document.body.classList.add('video-open');
  openingVideo.currentTime = 0;
  openingVideo.play().catch(error => {
    if (!videoPlaying) return;
    console.error('Não foi possível reproduzir o vídeo de abertura:', error);
    endOpeningVideo();
  });
}

openingVideo.addEventListener('ended', endOpeningVideo);
openingVideo.addEventListener('error', endOpeningVideo);
window.addEventListener('keydown', event => {
  if (!videoPlaying || event.repeat || !['z', ' ', 'enter'].includes(event.key.toLowerCase())) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  endOpeningVideo();
}, true);
window.addEventListener('pointerdown', event => {
  if (!videoPlaying) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  endOpeningVideo();
}, true);
loadingRetry.addEventListener('click', loadOpeningVideo);

function resize() {
  const previousGround = world?.groundY;
  const previousNpcs = world?.npcs;
  const bounds = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(bounds.width));
  canvas.height = Math.max(1, Math.round(bounds.height));
  uiScale = canvas.height / GAME_HEIGHT;
  viewWidth = canvas.width / uiScale;
  const pixelSize = uiScale;
  videoFrameCanvas.width = Math.ceil(viewWidth);
  videoFrameCanvas.height = viewHeight;
  videoFrameCtx.imageSmoothingEnabled = false;
  document.documentElement.style.setProperty('--ui-scale', `${pixelSize / 3}`);
  document.documentElement.style.setProperty('--touch-scale', `${Math.min(pixelSize / 3, bounds.width / 390)}`);
  ctx.imageSmoothingEnabled = false;
  world = createWorld(viewWidth, viewHeight);
  sceneCanvas.width = world.width;
  sceneCanvas.height = world.height;
  sceneCtx.imageSmoothingEnabled = false;
  if (previousNpcs) world.npcs = previousNpcs;
  document.body.classList.toggle('no-powers', world.allowPowers === false);
  controlsHint.textContent = world.allowPowers === false
    ? 'A/D MOVER · ESPAÇO PULAR'
    : fullControlsHint;
  if (player) {
    const groundShift = world.groundY - previousGround;
    player.y += groundShift;
    player.airApexY += groundShift;
  }
}

function update(dt) {
  if (booting || videoPlaying) { input.clear(); audio.updateBooster(false); return; }
  if (rocketTransition.active) {
    input.clear();
    audio.updateBooster(false);
    rocketTransition.update(dt);
    return;
  }
  if (openingDialogue) {
    dialogue.update(dt);
    cameraEffects.clear();
    input.clear();
    audio.updateBooster(false);
    return;
  }
  const crtRequested = input.takeCrt();
  const introRequested = input.takeIntro();
  if (world.allowPowers !== false) {
    if (crtRequested) crt.toggle();
    if (introRequested) intro.start();
  }
  document.body.classList.toggle('intro-open', intro.active);
  if (intro.active) {
    cameraEffects.clear();
    input.clear();
    audio.updateBooster(false);
    intro.update(dt);
    return;
  }
  updateNpcs(world, dt);
  if (interactingNpc) {
    input.clear();
    audio.updateBooster(false);
    if (interactingNpc.jumpTime <= 0) {
      interactingNpc = null;
      dialogue.start('milenio');
    }
    updateCamera(dt);
    return;
  }
  dialogue.update(dt);
  if (dialogue.active) {
    cameraEffects.clear(); input.clear(); audio.updateBooster(false);
    updateCamera(dt);
    return;
  }
  if (input.takeInteract()) {
    const npc = nearbyNpc(world, player);
    if (npc) {
      interactingNpc = npc;
      startNpcInteraction(npc, player);
      player.vx = 0;
      player.facing = player.x + player.w / 2 < npc.x ? 1 : -1;
      runAnimationTime = 0;
      input.clear();
      cameraEffects.clear();
      return;
    }
  }
  if (input.takeTalk() && world.allowPowers !== false) {
    cameraEffects.clear();
    dialogue.start('intro');
    return;
  }
  const previousX = player.x;
  updatePlayer(player, world, input, dt);
  if (player.jumpStarted) audio.playJump();
  if (player.dashStarted) audio.playDash();
  if (player.landed) audio.playLanding(player.landedHard);
  audio.updateBooster(player.boosting);
  const animationRate = world.animationRate ?? 1;
  jumpAnimationTime = player.onGround ? 0 : Math.min(1, jumpAnimationTime + dt * animationRate);
  boostAnimationTime = player.boosting ? (player.boostStarted ? 0 : boostAnimationTime + dt) : 0;
  dashAnimationTime = player.dashStarted ? 0 : Math.min(DASH_ANIMATION_DURATION, dashAnimationTime + dt);
  if (player.dashStarted) cameraEffects.kick(7, 3, 0.2);
  if (player.boostStarted) cameraEffects.pulseZoom();
  if (player.landedHard) cameraEffects.kick(3, 6, 0.18);
  animationTime += dt * animationRate;
  const previousRunTime = runAnimationTime;
  runAnimationTime = player.onGround && player.landLockTime <= 0 && dashAnimationTime >= DASH_ANIMATION_DURATION && !player.sliding && Math.abs(player.vx) > 20
    ? runAnimationTime + dt * animationRate * Math.max(0.7, Math.min(1.5, Math.abs(player.vx) / (world.moveSpeed ?? PLAYER.speed)))
    : 0;
  if (world.stepSound && runSprite && runAnimationTime > 0 && Math.abs(player.x - previousX) > 0.01) {
    // Dois passos por ciclo de caminhada, acompanhando a velocidade da animação.
    const stepsPerSecond = runSprite.fps * 2 / runSprite.count;
    if (previousRunTime === 0 || Math.floor(runAnimationTime * stepsPerSecond) > Math.floor(previousRunTime * stepsPerSecond)) {
      audio.playStep(world.stepSound);
    }
  }
  effects.update(dt, player, animationTime, sprite, dashSprite, dashAnimationTime);

  const request = input.takeBlast();
  if (request && world.allowPowers !== false) {
    const projectile = fireBlast(player, player.facing, 0);
    if (projectile) {
      projectiles.push(projectile);
    }
  }
  cameraEffects.update(dt);

  const solids = solidBlocks(world);
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const shot = projectiles[i];
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    if (shot.life <= 0 || solids.some(block => overlaps(shot, block))) {
      projectiles.splice(i, 1);
    }
  }

  updateCamera(dt);
}

function updateCamera(dt) {
  const visibleWidth = canvas.width / scenePixelScale();
  const maxCameraX = Math.max(0, world.width - visibleWidth);
  const targetCameraX = Math.max(0, Math.min(maxCameraX, player.x + player.w / 2 - visibleWidth * 0.42));
  cameraX += (targetCameraX - cameraX) * Math.min(1, dt * 8);
  cameraX = Math.max(0, Math.min(maxCameraX, cameraX));
}

function rect(x, y, w, h, color, context = ctx) {
  context.fillStyle = color;
  context.fillRect(Math.round(x), Math.round(y), w, h);
}

function scenePixelScale() {
  return Math.max(1, Math.round(uiScale * CAMERA_ZOOM * cameraEffects.zoom));
}

function drawPlayer(context = ctx, viewCameraX = cameraX, viewCameraY = 0, position = player) {
  const ctx = context;
  const x = Math.round(position.x - viewCameraX);
  const y = Math.round(position.y - viewCameraY);
  const scale = playerPose(player);

  if (player.boosting) {
    const length = player.boostFlash > 0 ? 21 : 14;
    drawRocketFlame(ctx, x + 3, y + player.h - 2, 'down', length, animationTime);
    drawRocketFlame(ctx, x + player.w - 3, y + player.h - 2, 'down', length - 2, animationTime + 0.11);
  }
  if (player.dashing) {
    const direction = player.dashDirection > 0 ? 'left' : 'right';
    const flameX = player.dashDirection > 0 ? x + 1 : x + player.w - 1;
    drawRocketFlame(ctx, flameX, y + 10, direction, 20, animationTime);
    drawRocketFlame(ctx, flameX, y + 17, direction, 14, animationTime + 0.17);
  }

  if (!sprite) {
    const w = Math.round(player.w * scale.x);
    const h = Math.round(player.h * scale.y);
    const left = Math.round(x + (player.w - w) / 2);
    const top = y + player.h - h;
    rect(left + Math.round(w * 0.14), top + Math.round(h * 0.08), Math.round(w * 0.72), Math.round(h * 0.38), '#f3be92', ctx);
    rect(left + 1, top + Math.round(h * 0.46), w - 2, Math.round(h * 0.42), '#e99c72', ctx);
    rect(left + 2, top + h - 3, Math.round(w * 0.28), 3, '#2a344b', ctx);
    rect(left + w - Math.round(w * 0.28) - 2, top + h - 3, Math.round(w * 0.28), 3, '#2a344b', ctx);
    return;
  }

  let activeSprite = sprite;
  if (player.boosting && boostSprite) activeSprite = boostSprite;
  else if (player.landLockTime > 0 && landingSprite) activeSprite = landingSprite;
  else if (dashAnimationTime < DASH_ANIMATION_DURATION && dashSprite) activeSprite = dashSprite;
  else if (!player.onGround && jumpSprite) activeSprite = jumpSprite;
  else if (runSprite && player.onGround && !player.dashing && !player.sliding && Math.abs(player.vx) > 20) activeSprite = runSprite;
  const { image, frameW, frameH, count, columns, fps } = activeSprite;
  let frame = Math.floor(animationTime * fps) % count;
  if (activeSprite === dashSprite) frame = Math.min(count - 1, Math.floor(dashAnimationTime * fps));
  else if (activeSprite === landingSprite) frame = Math.min(count - 1, Math.floor((PLAYER.landingLockDuration - player.landLockTime) * fps));
  else if (activeSprite === boostSprite) frame = Math.floor(boostAnimationTime * fps) % count;
  else if (activeSprite === jumpSprite) frame = Math.min(count - 1, Math.floor(jumpAnimationTime * fps));
  else if (activeSprite === runSprite) frame = Math.floor(runAnimationTime * fps) % count;
  const sourceX = (frame % columns) * frameW;
  const sourceY = Math.floor(frame / columns) * frameH;
  const drawW = Math.max(1, Math.round(frameW * CLASSROOM_SCALE * scale.x));
  const drawH = Math.max(1, Math.round(frameH * CLASSROOM_SCALE * scale.y));
  const spriteX = Math.round(x + (player.w - drawW) / 2);
  const spriteY = y + player.h - drawH;
  if (scale.facing < 0) {
    ctx.save();
    ctx.translate(spriteX + drawW, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(image, sourceX, sourceY, frameW, frameH, 0, spriteY, drawW, drawH);
    ctx.restore();
  } else {
    ctx.drawImage(image, sourceX, sourceY, frameW, frameH, spriteX, spriteY, drawW, drawH);
  }
}

function draw() {
  ctx.setTransform(uiScale, 0, 0, uiScale, 0, 0);
  if (booting || videoPlaying) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, viewWidth, viewHeight);
    if (videoPlaying && openingVideo.readyState >= 2 && openingVideo.videoWidth > 0) {
      // O vídeo passa pelo mesmo canvas de baixa resolução e filtro CRT do jogo.
      const scale = Math.min(viewWidth / openingVideo.videoWidth, viewHeight / openingVideo.videoHeight);
      const width = Math.round(openingVideo.videoWidth * scale);
      const height = Math.round(openingVideo.videoHeight * scale);
      videoFrameCtx.fillStyle = '#000000';
      videoFrameCtx.fillRect(0, 0, videoFrameCanvas.width, videoFrameCanvas.height);
      videoFrameCtx.drawImage(openingVideo, Math.round((viewWidth - width) / 2),
        Math.round((viewHeight - height) / 2), width, height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(videoFrameCanvas, 0, 0, viewWidth, viewHeight);
    }
    return;
  }
  if (openingDialogue) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, viewWidth, viewHeight);
    dialogue.draw(ctx, viewWidth, viewHeight);
    rocketTransition.draw(ctx, viewWidth, viewHeight);
    return;
  }
  if (intro.active) {
    intro.draw(ctx, viewWidth, viewHeight);
    return;
  }
  const zoom = scenePixelScale();
  const visibleWidth = canvas.width / zoom;
  const visibleHeight = canvas.height / zoom;
  const cameraY = Math.max(0, world.height - visibleHeight);
  const alpha = accumulator / STEP;
  const renderPlayerX = previousPlayerX + (player.x - previousPlayerX) * alpha;
  const renderPlayerY = previousPlayerY + (player.y - previousPlayerY) * alpha;
  const renderCameraX = previousCameraX + (cameraX - previousCameraX) * alpha;
  // Desenha os sprites na grade original antes de ampliar a cena inteira.
  drawWorld(sceneCtx, world, 0, world.width, world.height, 12);
  drawNpcs(sceneCtx, world, 0, animationTime);
  effects.draw(sceneCtx, 0, sprite);
  for (const shot of projectiles) {
    rect(shot.x - 2, shot.y - 2, 8, 8, BOOST_FIRE.outer, sceneCtx);
    rect(shot.x - 1, shot.y - 1, 6, 6, BOOST_FIRE.middle, sceneCtx);
    rect(shot.x, shot.y, 4, 4, BOOST_FIRE.core, sceneCtx);
  }
  const sourceX = world.width < visibleWidth ? (world.width - visibleWidth) / 2 : renderCameraX;
  const sourceY = cameraY;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#101417';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sceneCanvas, Math.round((-sourceX + cameraEffects.x) * zoom),
    Math.round((-sourceY + cameraEffects.y) * zoom), world.width * zoom, world.height * zoom);
  // Arredonda a posição relativa uma só vez, já em pixels da tela.
  ctx.save();
  ctx.translate(Math.round((renderPlayerX - sourceX + cameraEffects.x) * zoom),
    Math.round((renderPlayerY - sourceY + cameraEffects.y) * zoom));
  ctx.scale(zoom, zoom);
  drawPlayer(ctx, renderPlayerX, renderPlayerY, { x: renderPlayerX, y: renderPlayerY });
  ctx.restore();
  ctx.setTransform(uiScale, 0, 0, uiScale, 0, 0);
  const renderZoomX = zoom / uiScale;
  const renderZoomY = renderZoomX;
  for (const character of world.npcs ?? []) {
    if (character.surpriseTime > 0) {
      dialogue.drawPrompt(ctx, '!', (character.x - sourceX) * renderZoomX,
        (character.y - character.h - npcJumpOffset(character) - sourceY) * renderZoomY - 24, viewWidth, 2);
    }
  }
  const npc = dialogue.active || interactingNpc ? null : nearbyNpc(world, player);
  if (npc) {
    dialogue.drawPrompt(ctx, 'Z para Interagir', (npc.x - sourceX) * renderZoomX,
      (npc.y - npc.h - sourceY) * renderZoomY - 14, viewWidth);
  }
  dialogue.draw(ctx, viewWidth, viewHeight);
  rocketTransition.draw(ctx, viewWidth, viewHeight);
  const fuelPercent = Math.round(player.fuel / PLAYER.maxFuel * 100);
  fuelFill.style.width = `${fuelPercent}%`;
  fuelLabel.textContent = `${fuelPercent}%`;
}

function frame(time) {
  if (!lastTime) lastTime = time;
  accumulator += Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;
  while (accumulator >= STEP) {
    previousPlayerX = player.x;
    previousPlayerY = player.y;
    previousCameraX = cameraX;
    update(STEP);
    accumulator -= STEP;
  }
  draw();
  requestAnimationFrame(frame);
}

resize();
player = createPlayer(world.groundY);
previousPlayerX = player.x;
previousPlayerY = player.y;
window.addEventListener('resize', resize);
loadGabriel().then(result => { sprite = result; }).catch(error => console.error(error));
loadGabrielRun().then(result => { runSprite = result; }).catch(error => console.error(error));
loadGabrielJump().then(result => { jumpSprite = result; }).catch(error => console.error(error));
loadGabrielBoost().then(result => { boostSprite = result; }).catch(error => console.error(error));
loadGabrielDash().then(result => { dashSprite = result; }).catch(error => console.error(error));
loadGabrielLanding().then(result => { landingSprite = result; }).catch(error => console.error(error));
loadOpeningVideo();
requestAnimationFrame(frame);
