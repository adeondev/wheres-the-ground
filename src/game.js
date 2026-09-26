import { GAME_HEIGHT, PLAYER } from './config.js';
import { DASH_ANIMATION_DURATION, playerPose } from './animation.js';
import { createAudio } from './audio.js';
import { createCameraEffects } from './cameraEffects.js';
import { createCrt } from './crt.js';
import { createDialogue } from './dialogue.js';
import { dialogueScenes } from './dialogueData.js';
import { createEffects } from './effects.js';
import { drawRocketFlame } from './fireVfx.js';
import { createInput } from './input.js';
import { createIntro } from './intro.js';
import { BOOST_FIRE } from './palette.js';
import { createPlayer, fireBlast, updatePlayer } from './player.js';
import { loadGabriel, loadGabrielBoost, loadGabrielDash, loadGabrielJump, loadGabrielLanding, loadGabrielRun } from './sprites.js';
import { createWorld, drawWorld, overlaps, solidBlocks } from './world.js';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const fuelFill = document.querySelector('#fuel-fill');
const fuelLabel = document.querySelector('#fuel-label');
const input = createInput();
const crt = createCrt();
const dialogue = createDialogue(canvas, dialogueScenes, { onOpen: () => input.clear(), onClose: () => input.clear() });
const effects = createEffects();
const cameraEffects = createCameraEffects();
const audio = createAudio();
const intro = createIntro(audio, { onFinish: () => input.clear() });
const projectiles = [];
const STEP = 1 / 60;

let world;
let player;
let sprite = null;
let runSprite = null;
let jumpSprite = null;
let boostSprite = null;
let dashSprite = null;
let landingSprite = null;
let cameraX = 0;
let animationTime = 0;
let runAnimationTime = 0;
let jumpAnimationTime = 0;
let boostAnimationTime = 0;
let dashAnimationTime = DASH_ANIMATION_DURATION;
let lastTime = 0;
let accumulator = 0;

function resize() {
  const previousGround = world?.groundY;
  const bounds = canvas.getBoundingClientRect();
  const pixelSize = bounds.height / GAME_HEIGHT;
  canvas.width = Math.max(1, Math.ceil(bounds.width / pixelSize));
  canvas.height = GAME_HEIGHT;
  document.documentElement.style.setProperty('--ui-scale', `${pixelSize / 3}`);
  document.documentElement.style.setProperty('--touch-scale', `${Math.min(pixelSize / 3, bounds.width / 390)}`);
  ctx.imageSmoothingEnabled = false;
  world = createWorld(canvas.width, canvas.height);
  if (player) {
    const groundShift = world.groundY - previousGround;
    player.y += groundShift;
    player.airApexY += groundShift;
  }
}

function update(dt) {
  if (input.takeCrt()) crt.toggle();
  if (input.takeIntro()) { intro.start(); }
  document.body.classList.toggle('intro-open', intro.active);
  if (intro.active) {
    cameraEffects.clear();
    input.clear();
    audio.updateBooster(false);
    intro.update(dt);
    return;
  }
  dialogue.update(dt);
  if (dialogue.active) { cameraEffects.clear(); input.clear(); audio.updateBooster(false); return; }
  if (input.takeTalk()) { cameraEffects.clear(); dialogue.start('intro'); return; }
  updatePlayer(player, world, input, dt);
  if (player.jumpStarted) audio.playJump();
  if (player.dashStarted) audio.playDash();
  if (player.landed) audio.playLanding(player.landedHard);
  audio.updateBooster(player.boosting);
  jumpAnimationTime = player.onGround ? 0 : Math.min(1, jumpAnimationTime + dt);
  boostAnimationTime = player.boosting ? (player.boostStarted ? 0 : boostAnimationTime + dt) : 0;
  dashAnimationTime = player.dashStarted ? 0 : Math.min(DASH_ANIMATION_DURATION, dashAnimationTime + dt);
  if (player.dashStarted) cameraEffects.kick(7, 3, 0.2);
  if (player.boostStarted) cameraEffects.pulseZoom();
  if (player.landedHard) cameraEffects.kick(3, 6, 0.18);
  animationTime += dt;
  runAnimationTime = player.onGround && player.landLockTime <= 0 && dashAnimationTime >= DASH_ANIMATION_DURATION && !player.sliding && Math.abs(player.vx) > 20
    ? runAnimationTime + dt * Math.max(0.7, Math.min(1.5, Math.abs(player.vx) / PLAYER.speed))
    : 0;
  effects.update(dt, player, animationTime, sprite, dashSprite, dashAnimationTime);

  const request = input.takeBlast();
  if (request) {
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

  cameraX = Math.max(0, Math.min(world.width - canvas.width, player.x - canvas.width * 0.4));
}

function rect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function drawPlayer() {
  const x = Math.round(player.x - cameraX);
  const y = Math.round(player.y);
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
    rect(left + Math.round(w * 0.14), top + Math.round(h * 0.08), Math.round(w * 0.72), Math.round(h * 0.38), '#f3be92');
    rect(left + 1, top + Math.round(h * 0.46), w - 2, Math.round(h * 0.42), '#e99c72');
    rect(left + 2, top + h - 3, Math.round(w * 0.28), 3, '#2a344b');
    rect(left + w - Math.round(w * 0.28) - 2, top + h - 3, Math.round(w * 0.28), 3, '#2a344b');
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
  const drawW = Math.max(1, Math.round(frameW * scale.x));
  const drawH = Math.max(1, Math.round(frameH * scale.y));
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
  if (intro.active) {
    intro.draw(ctx, canvas.width, canvas.height);
    return;
  }
  const focusX = player.x - cameraX + player.w / 2;
  const focusY = player.y + player.h / 2;
  ctx.save();
  ctx.translate(focusX, focusY);
  ctx.scale(cameraEffects.zoom, cameraEffects.zoom);
  ctx.translate(-focusX + cameraEffects.x, -focusY + cameraEffects.y);
  drawWorld(ctx, world, cameraX, canvas.width, canvas.height, 12);
  effects.draw(ctx, cameraX, sprite);
  for (const shot of projectiles) {
    rect(shot.x - cameraX - 2, shot.y - 2, 8, 8, BOOST_FIRE.outer);
    rect(shot.x - cameraX - 1, shot.y - 1, 6, 6, BOOST_FIRE.middle);
    rect(shot.x - cameraX, shot.y, 4, 4, BOOST_FIRE.core);
  }
  drawPlayer();
  ctx.restore();
  dialogue.draw(ctx, canvas.width, canvas.height);
  const fuelPercent = Math.round(player.fuel / PLAYER.maxFuel * 100);
  fuelFill.style.width = `${fuelPercent}%`;
  fuelLabel.textContent = `${fuelPercent}%`;
}

function frame(time) {
  if (!lastTime) lastTime = time;
  accumulator += Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;
  while (accumulator >= STEP) {
    update(STEP);
    accumulator -= STEP;
  }
  draw();
  requestAnimationFrame(frame);
}

resize();
player = createPlayer(world.groundY);
intro.start();
window.addEventListener('resize', resize);
loadGabriel().then(result => { sprite = result; dialogue.setSprite(result); }).catch(error => console.error(error));
loadGabrielRun().then(result => { runSprite = result; }).catch(error => console.error(error));
loadGabrielJump().then(result => { jumpSprite = result; }).catch(error => console.error(error));
loadGabrielBoost().then(result => { boostSprite = result; }).catch(error => console.error(error));
loadGabrielDash().then(result => { dashSprite = result; }).catch(error => console.error(error));
loadGabrielLanding().then(result => { landingSprite = result; }).catch(error => console.error(error));
requestAnimationFrame(frame);
