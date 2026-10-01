import { createNightSurveillance } from './nightSurveillance.js?v=helicopter-nose';
import { createStationArrival } from './stationArrival.js?v=short-descent';
import { createStationIntro } from './stationIntro.js?v=station-greeting';
import { createStationProof } from './stationProof.js';
import { createCityChapter, loadCallerPortrait } from './cityChapter.js?v=phone-readable';
import { drawWindGusts } from './cityObstacles.js?v=no-roof-notices';
import { GAME_HEIGHT, PLAYER } from './config.js';
import { DASH_ANIMATION_DURATION, playerPose, recoverPose } from './animation.js?v=route-obstacles';
import { createAudio } from './audio.js?v=station-greeting';
import { createCameraEffects } from './cameraEffects.js?v=route-obstacles';
import { createCrt } from './crt.js';
import { createDialogue } from './dialogue.js?v=phone-readable';
import { dialogueScenes } from './dialogueData.js?v=station-proof';
import { createCityRun, drawCityRunHud, loadRunnerPortrait } from './cityRun.js?v=four-minute-route';
import { createEffects } from './effects.js?v=route-obstacles';
import { drawRocketFlame } from './fireVfx.js';
import { createInput } from './input.js?v=route-obstacles';
import { createIntro } from './intro.js';
import { createRocketTransition } from './rocketTransition.js?v=stage2-console';
import { drawNpcs, nearbyNpc, npcJumpOffset, startNpcInteraction, updateNpcs } from './npcs.js?v=station-cop-cropped';
import { BOOST_FIRE } from './palette.js';
import { createPlayer, fireBlast, updatePlayer } from './player.js?v=route-obstacles';
import { createRooftopWorld, loadRooftopAssets, rooftopGroundY, rooftopSurfaceY, appendNightDistrict, updateRooftopHazards } from './rooftops.js?v=route-obstacles';
import { drawRooftopMinimap, loadRooftopHud } from './minimap.js?v=full-meter';
import { drawRooftopSky, loadCityBackground } from './rooftopSky.js?v=route-obstacles';
import { createRooftopTutorial } from './rooftopTutorial.js?v=route-obstacles';
import { drawDiscoveryFx, drawChargeBar, drawAscentLines } from './discoveryFx.js?v=ascent-action-lines-fast';
import { createCommandConsole } from './commandConsole.js?v=delegacia-shortcut';
import { loadGabriel, loadGabrielFlashbang, loadGabrielBoost, loadGabrielDash, loadGabrielJump, loadGabrielLanding, loadGabrielRecover, loadGabrielRun } from './sprites.js?v=flashbang-reaction';
import { CLASSROOM_SCALE, createWorld, createStationWorld, drawWorld, drawStationForeground, overlaps, solidBlocks } from './world.js?v=station-cop-lowered';

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
const loadingScreen = document.querySelector('#loading-screen');
const loadingLabel = document.querySelector('#loading-label');
const loadingTrack = document.querySelector('.loading-track');
const loadingFill = document.querySelector('#loading-fill');
const fuelFill = document.querySelector('#fuel-fill');
const fuelLabel = document.querySelector('#fuel-label');
const reserveLabel = document.querySelector('#reserve-label');
const controlsHint = document.querySelector('.controls-hint');
const fullControlsHint = controlsHint.textContent;
const touchDevice = navigator.maxTouchPoints > 0 ||
  window.matchMedia('(pointer: coarse), (any-pointer: coarse), (hover: none)').matches;
document.body.classList.toggle('touch-device', touchDevice);
const commandConsole = createCommandConsole({
  onOpen: () => { input.reset(); audio.setPowersCharging(false); audio.updateBooster(false); },
  onClose: () => input.reset(),
  execute: async command => {
    if (!['stage2','powers','final','timeout','night','spotlight','spotlight-air','helicopter','station','delegacia'].includes(command)) throw new Error('Use stage2, powers, final, night ou delegacia.');
    await jumpToStage2({ skipBasics: command !== 'stage2', startPowersMusic: command !== 'delegacia' });
    if (command === 'delegacia') { startStationTransition(); return; }
    if (command === 'night' || command === 'station' || command === 'helicopter' || command.startsWith('spotlight')) {
      rooftopTutorial = null;
      appendNightDistrict(world, { revealed: true });
      cityChapter = makeCityChapter(true); cityRun = createCityRun(world);
      nightSurveillance = createNightSurveillance(world);
      const roof = world.nightBuildings[1];
      const x = command.startsWith('spotlight') ? roof.x + roof.w * .60
        : command === 'helicopter' ? roof.x + roof.w * .25 : command === 'station' ? world.finishX : world.nightStart.x;
      Object.assign(player, createPlayer(rooftopSurfaceY(world, x)), { x });
      if (command === 'spotlight-air') { player.y -= 56; player.vy = 40; player.onGround = false; player.airApexY = player.y; }
      world.checkpoint = { ...world.nightStart };
      input.setAllowedKeys(null); document.body.classList.remove('no-powers','rooftop-tutorial');snapCamera();
    }
    if (command === 'timeout') {
      rooftopTutorial = null;input.setAllowedKeys(null);
      Object.assign(player,createPlayer(rooftopSurfaceY(world,world.runStartX)),{x:world.runStartX});
      document.body.classList.remove('no-powers','rooftop-tutorial');snapCamera();
      cityRun.update(cityRun.state.remaining - .05,player,{free:true});
    }
    if (command === 'final') {
      rooftopTutorial = null; input.setAllowedKeys(null);
      Object.assign(player, createPlayer(rooftopSurfaceY(world, world.finishX)), { x: world.finishX - player.w / 2 });
      document.body.classList.remove('no-powers','rooftop-tutorial'); snapCamera();
      cityRun.update(0,player,{free:true}); cityChapter.ring();
    }
  },
});
const input = createInput();
const crt = createCrt();
const audio = createAudio();
let openingDialogue = false;
let interactingNpc = null;
let classroomCutscene = null;
let agulhaCutscene = null;
let screenFade = { alpha: 0, active: false, speed: 0.8 };
let walkPromptDismissed = false;
let rooftopTutorial = null;
let cityRun = null;
let cityChapter = null;
let cityTimeout = null;
let nightSurveillance = null;
let stationArrival = null;
let stationIntro = null;
let stationProof = null;
let rocketDestination = 'classroom';
let stageJumpInProgress = false;
let bootGeneration = 0;
let bootController = null;

async function jumpToStage2({ skipBasics = false, startPowersMusic = true } = {}) {
  stageJumpInProgress = true;
  bootGeneration++;
  bootController?.abort();
  try {
    await Promise.all([rocketTransition.ready, loadRooftopAssets(), loadCityBackground(), audio.powersReady]);
    input.setAllowedKeys(null);
    input.clear();
    openingDialogue = videoPlaying = false;
    rooftopTutorial = null;
    openingVideo.pause();
    dialogue.close();
    intro.finish(0);
    rocketTransition.cancel();
    rocketDestination = 'classroom';
    effects.clear();
    audio.setClassroomMusic(false, 0.25);
    audio.updateBooster(false);
    screenFade = { alpha: 0, active: false, speed: 0.8 };
    booting = false;
    document.body.classList.remove('loading', 'intro-open', 'video-open', 'dialogue-open',
      'transition-open', 'station-cutscene', 'tutorial-locked', 'tutorial-space', 'tutorial-dash', 'learned-powers', 'tutorial-flight', 'tutorial-walking');
    enterRooftops({ skipBasics });
    if (skipBasics && startPowersMusic) audio.releasePowersMusic();
  } finally { stageJumpInProgress = false; }
}

function makeCityChapter(night = false) {
  return createCityChapter(world, {
    night, onRing: () => audio.playPhoneRing(),
    onAnswer: () => { player.vx = 0; dialogue.start('milenioPhone'); },
    onReady: () => {
      rooftopTutorial = null; input.setAllowedKeys(null);
      document.body.classList.remove('rooftop-tutorial','phone-open','tutorial-locked','no-powers');
      world.checkpoint = { ...world.nightStart };
      nightSurveillance = createNightSurveillance(world);
      player.fuel = PLAYER.maxFuel; player.reserveReady = true;
      cityRun = createCityRun(world);
    },
  });
}
function holdCityPlayer() {
  player.vx = player.vy = 0;
  player.dashing = player.boosting = player.megaCharging = player.megaBoosting = player.reserveBoosting = player.recovering = false;
  player.dashTime = player.reserveTime = player.megaCarryTime = player.landSlideTime = player.dashStretch = 0;
  player.turnSquashTime = player.landImpactTime = 0;
  player.jumpStarted = player.dashStarted = player.boostStarted = player.landed = player.landedHard = false;
  dashAnimationTime = DASH_ANIMATION_DURATION;
}
function restartCityRoute() {
  stationArrival = null;
  stationIntro = null;
  stationProof = null;
  const night = world.phase === 2;
  world = createRooftopWorld({ tutorial: true });
  if (night) appendNightDistrict(world, { revealed: true });
  const spawn = night ? world.nightStart : { x: world.runStartX, y: rooftopSurfaceY(world,world.runStartX), building: 5 };
  Object.assign(player, createPlayer(spawn.y), { x: spawn.x }); world.checkpoint = { ...spawn };
  rooftopTutorial = null; cityChapter = makeCityChapter(night); cityRun = createCityRun(world);
  nightSurveillance = night ? createNightSurveillance(world) : null;
  input.setAllowedKeys(null); effects.clear(); cameraEffects.clear();
  document.body.classList.remove('phone-open','no-powers','rooftop-tutorial','tutorial-locked');
  snapCamera(); resize();
}
window.addEventListener('keydown', event => {
  if (commandConsole.isOpen || !cityChapter || cityChapter.phase !== 'incoming') return;
  if (!event.repeat && ['z','enter'].includes(event.key.toLowerCase())) {
    event.preventDefault();event.stopImmediatePropagation();cityChapter.answer();
  }
}, true);
canvas.addEventListener('pointerdown', event => {
  if (cityChapter?.phase !== 'incoming') return;
  const box = canvas.getBoundingClientRect();
  const x = (event.clientX-box.left)*canvas.width/box.width/uiScale;
  const y = (event.clientY-box.top)*canvas.height/box.height/uiScale;
  if (cityChapter.hitPhone(x,y)) { event.preventDefault();cityChapter.answer(); }
});

function startClassroomLeavingCutscene() {
  classroomCutscene = {
    phase: 'walking',
    timer: 0,
    targetX: 54,
  };
  player.facing = -1;
  player.vx = 0;
  runAnimationTime = 0;
}

function startAgulhaCutscene() {
  agulhaCutscene = {
    phase: 'wait_before_needle',
    timer: 1.5,
  };
  input.clear();
  player.vx = 0;
  runAnimationTime = 0;
}

function startScreenFadeOut() {
  screenFade.active = true;
  screenFade.alpha = 0;
  screenFade.phase = 'out';
  screenFade.timer = 0;
  document.body.classList.add('transition-open');
  input.clear();
  player.vx = 0;
  runAnimationTime = 0;
  cameraEffects.clear();
  audio.setClassroomMusic(false, 1.8);
}

function enterRooftops({ skipBasics = false } = {}) {
  stationArrival = null;
  stationIntro = null;
  stationProof = null;
  audio.resetPowersMusic();
  world = createRooftopWorld({ tutorial: true });
  cityRun = createCityRun(world, { onStart: () => audio.resetPowersMusic() });
  cityChapter = makeCityChapter(); cityTimeout = null; nightSurveillance = null;
  Object.assign(player, createPlayer(world.spawn.y), { x: world.spawn.x });
  rooftopTutorial = createRooftopTutorial(world, player, {
    skipBasics,
    startDialogue: id => dialogue.start(id), closeDialogue: () => dialogue.close(), clearInput: () => input.clear(),
    onCharge: held => audio.setPowersCharging(held),
    chargeProgress: () => audio.getPowersChargeProgress(),
    onLaunch: () => { audio.releasePowersMusic(); cameraEffects.kick(9, 9, 0.65); },
    onPower: kind => {
      if (kind === 'reserve') { cameraEffects.kick(1, 1, 0.10); return; }
      cameraEffects.kick(kind === 'mega' ? 7 : 3, 3, 0.2);
      cameraEffects.pulseZoom();
    },
    onLanding: crossing => {
      effects.landingImpact(player, crossing ? 0.85 : 1.15);
      cameraEffects.kick(crossing ? 4 : 6, crossing ? 7 : 9, crossing ? 0.26 : 0.34);
    },
  });
  projectiles.length = 0;
  interactingNpc = classroomCutscene = agulhaCutscene = null;
  cameraEffects.clear();
  runAnimationTime = jumpAnimationTime = boostAnimationTime = 0;
  dashAnimationTime = DASH_ANIMATION_DURATION;
  walkPromptDismissed = true;
  document.body.classList.add('no-powers', 'rooftop-tutorial');
  document.body.classList.remove('station-cutscene');
  controlsHint.textContent = '';
  snapCamera();
  resize();
}

function enterStation() {
  stationArrival = null;
  stationProof = null;
  dialogue.state.triggerStationProof = false;
  audio.resetPowersMusic();
  audio.setClassroomMusic(true);
  world = createStationWorld();
  Object.assign(player, createPlayer(world.groundY), { x: 8, facing: 1 });
  stationIntro = createStationIntro(player, world.npcs[0], {
    walkSpeed: world.moveSpeed,
    onSpeak: () => dialogue.start('stationGreeting'),
  });
  cityRun = cityChapter = nightSurveillance = rooftopTutorial = null;
  input.clear();
  input.setAllowedKeys([]);
  effects.clear();
  cameraEffects.clear();
  audio.updateBooster(false);
  document.body.classList.remove('phone-open', 'rooftop-tutorial', 'tutorial-locked');
  document.body.classList.add('station-cutscene');
  resize();
}

function startStationTransition() {
  stationArrival = null;
  rocketDestination = 'station';
  document.body.classList.add('transition-open');
  input.clear();
  rocketTransition.start(viewWidth, viewHeight);
}

const rocketTransition = createRocketTransition({
  onStart: () => {
    if (rocketDestination === 'classroom') audio.setClassroomMusic(false, 1.05);
  },
  onPop: () => audio.playTransitionClick(),
  onCovered: () => {
    if (rocketDestination === 'station') enterStation();
    else { openingDialogue = false; input.clear(); audio.setClassroomMusic(true); }
  },
  onFinish: () => {
    rocketDestination = 'classroom';
    input.clear(); document.body.classList.remove('transition-open');
  },
});
const dialogue = createDialogue(canvas, dialogueScenes, {
  onOpen: () => input.clear(),
  onClose: () => {
    input.clear();
    if (stageJumpInProgress) return;
    if (stationArrival?.finishDialogue()) { input.setAllowedKeys([]); return; }
    if (stationIntro && dialogue.state.triggerStationProof) {
      dialogue.state.triggerStationProof = false;
      stationProof = createStationProof();
      input.setAllowedKeys([]);
      return;
    }
    if (stationIntro?.finishDialogue()) {
      stationIntro = null;
      input.reset(); input.setAllowedKeys(null);
      document.body.classList.remove('station-cutscene');
      return;
    }
    if (cityChapter?.phase === 'talking') { cityChapter.finishCall(); return; }
    if (openingDialogue) {
      rocketDestination = 'classroom';
      document.body.classList.add('transition-open');
      rocketTransition.start(viewWidth, viewHeight);
    } else if (rooftopTutorial?.onDialogueClose()) {
      updateTutorialControls();
    } else if (dialogue.state.triggerLeavingCutscene) {
      dialogue.state.triggerLeavingCutscene = false;
      startClassroomLeavingCutscene();
    } else if (dialogue.state.triggerAgulhaCutscene) {
      dialogue.state.triggerAgulhaCutscene = false;
      startAgulhaCutscene();
    } else if (dialogue.state.triggerFadeOut) {
      dialogue.state.triggerFadeOut = false;
      startScreenFadeOut();
    }
  },
  onCharacter: voice => audio.playDialogBlip(voice),
  onSilence: () => audio.stopDialogBlip(),
  coordinateScale: () => uiScale,
});
dialogue.state.onMilenioCall = () => {
  player.facing = 1;
};
const effects = createEffects();
const cameraEffects = createCameraEffects();
const intro = createIntro(audio, { onFinish: () => { input.clear(); if (!stageJumpInProgress) playOpeningVideo(); } });
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
let flashbangSprite = null;
let recoverSprite = null;
let cameraX = 0;
let previousCameraX = 0;
let cameraY = 0;
let previousCameraY = 0;
let previousPlayerX = 0;
let previousPlayerY = 0;
let animationTime = 0;
let skyTime = 0;
let runAnimationTime = 0;
let jumpAnimationTime = 0;
let boostAnimationTime = 0;
let dashAnimationTime = DASH_ANIMATION_DURATION;
let lastTime = 0;
let accumulator = 0;
let booting = true;
let videoPlaying = false;
let videoUrl = null;
let loadingFailed = false;

function setLoadingProgress(percent) {
  loadingFill.style.width = `${percent}%`;
  loadingTrack.setAttribute('aria-valuenow', String(percent));
}

async function loadOpeningVideo() {
  const generation = ++bootGeneration;
  bootController?.abort();
  bootController = new AbortController();
  loadingFailed = false;
  loadingScreen.classList.remove('load-error');
  loadingScreen.tabIndex = -1;
  setLoadingProgress(0);
  loadingLabel.textContent = 'Carregando vídeo';
  try {
    const response = await fetch('assets/videos/intial.webm', { signal: bootController.signal });
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
          setLoadingProgress(percent);
        }
      }
    } else {
      chunks.push(await response.blob());
    }

    if (generation !== bootGeneration) return;
    loadingLabel.textContent = 'Preparando vídeo';
    setLoadingProgress(99);
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

    await Promise.all([rocketTransition.ready, loadRooftopAssets(), loadCityBackground(), audio.powersReady]);
    if (generation !== bootGeneration) return;
    setLoadingProgress(100);
    booting = false;
    document.body.classList.remove('loading');
    intro.start();
  } catch (error) {
    if (generation !== bootGeneration) return;
    console.error('Não foi possível carregar o vídeo de abertura:', error);
    loadingFailed = true;
    loadingScreen.classList.add('load-error');
    loadingScreen.tabIndex = 0;
    loadingLabel.textContent = 'Falha ao carregar. Clique para tentar de novo.';
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
  audio.setClassroomMusic(false);
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
loadingScreen.addEventListener('click', () => { if (loadingFailed) loadOpeningVideo(); });
loadingScreen.addEventListener('keydown', event => {
  if (!loadingFailed || !['Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  loadOpeningVideo();
});

function resize() {
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
  document.documentElement.style.setProperty('--touch-scale', `${Math.max(0.9,
    Math.min(1.25, bounds.width / 390, bounds.height / 700))}`);
  ctx.imageSmoothingEnabled = false;
  world ??= createWorld();
  sceneCanvas.width = world.id === 'rooftops' ? Math.ceil(canvas.width / scenePixelScale()) + 24 : world.width;
  sceneCanvas.height = world.height;
  sceneCtx.imageSmoothingEnabled = false;
  document.body.classList.toggle('no-powers', world.allowPowers === false);
  controlsHint.textContent = world.allowPowers === false
    ? ''
    : fullControlsHint;
  if (player) snapCamera();
}

function updateTutorialControls() {
  const complete = rooftopTutorial.stage === 'complete' || rooftopTutorial.guidance?.mode === 'free';
  const guidance = rooftopTutorial.guidance;
  document.body.classList.toggle('no-powers', !complete && !rooftopTutorial.extended);
  document.body.classList.toggle('rooftop-tutorial', !complete);
  document.body.classList.toggle('tutorial-dash', rooftopTutorial.dashAvailable);
  document.body.classList.toggle('learned-powers', complete || rooftopTutorial.extended);
  document.body.classList.toggle('tutorial-locked', rooftopTutorial.controlsLocked || rooftopTutorial.onlySpace || rooftopTutorial.onlyShift || rooftopTutorial.onlyCombo);
  document.body.classList.toggle('tutorial-space', rooftopTutorial.onlySpace || rooftopTutorial.onlyCombo);
  document.body.classList.toggle('tutorial-combo', rooftopTutorial.onlyCombo);
  document.body.classList.toggle('tutorial-walking', guidance ? guidance.mode === 'walk' || guidance.mode === 'assist' : Boolean(rooftopTutorial.allowedKeys) && !rooftopTutorial.onlySpace && !rooftopTutorial.onlyCombo);
  document.body.classList.toggle('tutorial-flight', rooftopTutorial.controlsLocked && !rooftopTutorial.onlySpace && !rooftopTutorial.onlyCombo);
  document.body.classList.toggle('tutorial-no-dash', rooftopTutorial.extended && !rooftopTutorial.dashAvailable);
  document.body.classList.toggle('tutorial-reserve', rooftopTutorial.reserveCue);
  input.setAllowedKeys(cityChapter?.locked ? ['z','enter'] : guidance ? guidance.allowedKeys : rooftopTutorial.onlyCombo ? [' ', 'shift'] : rooftopTutorial.onlySpace ? [' '] : rooftopTutorial.onlyShift ? ['shift'] : null);
  controlsHint.textContent = complete ? 'A/D MOVER · ESPAÇO PULAR / BOOST ↑ · SHIFT IMPULSO →' : '';
}

function update(dt) {
  if (document.hidden) return;
  skyTime += dt;
  audio.updateClassroomMusic(dt);
  if (commandConsole.isOpen) { input.clear(); audio.updateBooster(false); return; }
  if (booting || videoPlaying) { input.clear(); audio.updateBooster(false); return; }
  if (cityTimeout) {
    cityTimeout.time += dt; audio.updateBooster(false); input.clear();
    if (cityTimeout.time >= .65 && !cityTimeout.reset) { cityTimeout.reset = true; restartCityRoute(); }
    if (cityTimeout.time >= 1.15) cityTimeout = null;
    return;
  }
  if (world.id === 'rooftops') {
    cityChapter?.update(dt);
    document.body.classList.toggle('phone-open', Boolean(cityChapter?.locked || nightSurveillance?.caught));
    if (cityChapter?.locked) input.setAllowedKeys(['z','enter']);
    else if (nightSurveillance?.caught) input.setAllowedKeys([]);
    else if (!rooftopTutorial) input.setAllowedKeys(null);
  }
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
  if (world.allowPowers !== false && world.allowTools !== false && !screenFade.active) {
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
  const animationRate = world.animationRate ?? 1;
  animationTime += dt * animationRate;
  rooftopTutorial?.updateZoom(dt);
  updateNpcs(world, dt);
  if (screenFade.active) {
    input.clear();
    player.vx = 0;
    if (screenFade.phase === 'out') {
      screenFade.alpha = Math.min(1, screenFade.alpha + dt * screenFade.speed);
      audio.updateBooster(false);
      if (screenFade.alpha >= 1) {
        screenFade.phase = 'boost';
        screenFade.timer = 1.2;
        audio.updateBooster(true);
      }
    } else if (screenFade.phase === 'boost') {
      audio.updateBooster(true);
      screenFade.timer -= dt;
      if (screenFade.timer <= 0) {
        enterRooftops();
        audio.updateBooster(false);
        screenFade.phase = 'in';
      }
    } else {
      audio.updateBooster(false);
      screenFade.alpha = Math.max(0, screenFade.alpha - dt * screenFade.speed);
      if (screenFade.alpha <= 0) {
        screenFade.active = false;
        document.body.classList.remove('transition-open');
      }
    }
    effects.update(dt, player, animationTime, sprite, dashSprite, dashAnimationTime, recoverSprite);
    updateCamera(dt);
    return;
  }
  if (agulhaCutscene) {
    input.clear();
    audio.updateBooster(false);
    agulhaCutscene.timer -= dt;
    if (agulhaCutscene.phase === 'wait_before_needle') {
      if (agulhaCutscene.timer <= 0) {
        const milenio = world.npcs?.find(n => n.id === 'milenio');
        if (milenio) milenio.hasAgulha = true;
        agulhaCutscene.phase = 'wait_after_needle';
        agulhaCutscene.timer = 1.0;
      }
    } else if (agulhaCutscene.phase === 'wait_after_needle') {
      if (agulhaCutscene.timer <= 0) {
        agulhaCutscene = null;
        dialogue.start('milenioVacina');
      }
    }
    effects.update(dt, player, animationTime, sprite, dashSprite, dashAnimationTime, recoverSprite);
    updateCamera(dt);
    return;
  }
  if (classroomCutscene) {
    input.clear();
    audio.updateBooster(false);
    if (classroomCutscene.phase === 'walking') {
      const walkSpeed = world.moveSpeed ?? 105;
      player.facing = -1;
      player.vx = -walkSpeed;
      const previousX = player.x;
      player.x = Math.max(classroomCutscene.targetX, player.x + player.vx * dt);
      const previousRunTime = runAnimationTime;
      runAnimationTime += dt * animationRate;
      if (world.stepSound && runSprite && Math.abs(player.x - previousX) > 0.01) {
        const stepsPerSecond = runSprite.fps * 2 / runSprite.count;
        if (previousRunTime === 0 || Math.floor(runAnimationTime * stepsPerSecond) > Math.floor(previousRunTime * stepsPerSecond)) {
          audio.playStep(world.stepSound);
        }
      }
      if (player.x <= classroomCutscene.targetX) {
        player.x = classroomCutscene.targetX;
        player.vx = 0;
        runAnimationTime = 0;
        classroomCutscene.phase = 'pausing';
        classroomCutscene.timer = 0.55;
      }
    } else if (classroomCutscene.phase === 'pausing') {
      player.vx = 0;
      runAnimationTime = 0;
      classroomCutscene.timer -= dt;
      if (classroomCutscene.timer <= 0) {
        classroomCutscene = null;
        dialogue.start('milenioEspera');
      }
    }
    effects.update(dt, player, animationTime, sprite, dashSprite, dashAnimationTime, recoverSprite);
    updateCamera(dt);
    return;
  }
  if (stationIntro && stationIntro.phase !== 'talking') {
    input.clear(); input.setAllowedKeys([]);
    audio.updateBooster(false);
    const previousX = player.x;
    const previousRunTime = runAnimationTime;
    stationIntro.update(dt);
    if (player.x > previousX) {
      runAnimationTime += dt * animationRate;
      if (world.stepSound && runSprite) {
        const stepsPerSecond = runSprite.fps * 2 / runSprite.count;
        if (previousRunTime === 0 || Math.floor(runAnimationTime * stepsPerSecond) > Math.floor(previousRunTime * stepsPerSecond)) {
          audio.playStep(world.stepSound);
        }
      }
    } else runAnimationTime = 0;
    effects.update(dt, player, animationTime, sprite, dashSprite, dashAnimationTime, recoverSprite);
    updateCamera(dt);
    return;
  }
  if (stationProof) {
    input.clear(); input.setAllowedKeys([]);
    stationProof.update(dt);
    player.boosting = stationProof.boosting;
    player.onGround = stationProof.lift === 0;
    audio.updateBooster(stationProof.boosting);
    if (stationProof.done) {
      player.boosting = false;
      player.onGround = true;
      stationProof = null;
      audio.updateBooster(false);
      dialogue.start('stationResolution');
    }
    updateCamera(dt);
    return;
  }
  if (interactingNpc) {
    input.clear();
    audio.updateBooster(false);
    if (interactingNpc.jumpTime <= 0) {
      if ((interactingNpc.settleDelay ?? 0) > 0) {
        interactingNpc.settleDelay = Math.max(0, interactingNpc.settleDelay - dt);
      } else {
        const target = interactingNpc;
        interactingNpc = null;
        target.surpriseTime = 0;
        dialogue.start('milenio');
      }
    }
    effects.update(dt, player, animationTime, sprite, dashSprite, dashAnimationTime, recoverSprite);
    updateCamera(dt);
    return;
  }
  dialogue.update(dt);
  if (dialogue.active) {
    if (player.onGround) {
      player.dashStretch = 0;
      player.landLockTime = Math.max(0, player.landLockTime - dt);
      player.landImpactTime = Math.max(0, player.landImpactTime - dt);
      player.turnSquashTime = Math.max(0, player.turnSquashTime - dt);
    }
    cameraEffects.clear(); input.clear(); audio.updateBooster(false);
    effects.update(dt, player, animationTime, sprite, dashSprite, dashAnimationTime, recoverSprite);
    updateCamera(dt);
    return;
  }
  if (stationArrival?.departing) {
    input.clear(); input.setAllowedKeys([]);
    stationArrival.update(dt);
    if (stationArrival.phase === 'done') { startStationTransition(); return; }
    jumpAnimationTime = Math.min(1, jumpAnimationTime + dt);
    audio.updateBooster(false);
    effects.update(dt, player, animationTime, sprite, dashSprite, dashAnimationTime, recoverSprite);
    cameraEffects.update(dt); updateCamera(dt);
    return;
  }
  const npc = world.id === 'classroom' || rooftopTutorial?.canInteract ? nearbyNpc(world, player) : null;
  if (world.id === 'classroom' && npc && !dialogue.active && !interactingNpc && !classroomCutscene && !agulhaCutscene && !screenFade.active) {
    if (dialogue.state.milenioCalled && !dialogue.state.milenioGovDone) {
      dialogue.state.milenioGovDone = true;
      player.vx = 0;
      player.facing = player.x + player.w / 2 < npc.x ? 1 : -1;
      runAnimationTime = 0;
      input.clear();
      cameraEffects.clear();
      dialogue.start('milenioGoverno');
      return;
    }
  }
  if (input.takeInteract() && npc && !dialogue.active && !agulhaCutscene && !screenFade.active) {
    player.vx = 0;
    player.facing = player.x + player.w / 2 < npc.x ? 1 : -1;
    runAnimationTime = 0;
    input.clear();
    cameraEffects.clear();
    if (world.id === 'rooftops') {
      rooftopTutorial.interact(npc);
      return;
    }
    if (!npc.firstTalked) {
      npc.firstTalked = true;
      interactingNpc = npc;
      startNpcInteraction(npc, player);
      effects.update(dt, player, animationTime, sprite, dashSprite, dashAnimationTime, recoverSprite);
      updateCamera(dt);
      return;
    }
    if (dialogue.state.milenioGovDone) {
      dialogue.start('milenioRepeat');
    } else if (dialogue.state.milenioCalled) {
      dialogue.state.milenioGovDone = true;
      dialogue.start('milenioGoverno');
    } else {
      dialogue.start('milenio');
    }
    return;
  }
  if (input.takeTalk() && world.allowPowers !== false && !rooftopTutorial) {
    cameraEffects.clear();
    dialogue.start('intro');
    return;
  }
  if (!walkPromptDismissed && (input.held.left || input.held.right)) {
    walkPromptDismissed = true;
  }
  const previousX = player.x;
  const cityHeld = cityChapter?.locked;
  if (nightSurveillance?.caught) nightSurveillance.hold(player);
  const guidedFlight = !cityHeld && rooftopTutorial?.beforePhysics(input, dt);
  if (cityHeld) {
    holdCityPlayer();
  } else if (!guidedFlight) {
    updatePlayer(player, world, input, dt * (rooftopTutorial?.physicsScale ?? 1));
    rooftopTutorial?.afterPhysics();
    updateRooftopHazards(world, player, dt);
    if (world.roofShake?.collapse) cameraEffects.kick(3, 5, .28);
    if (world.roofShake?.impact > .1) cameraEffects.kick(1.5 * world.roofShake.impact, 3 * world.roofShake.impact, .18);
  }
  nightSurveillance?.update(dt, player, !cityChapter?.locked && !player.respawned);
  if (nightSurveillance?.caught) { nightSurveillance.hold(player); input.setAllowedKeys([]); }
  if (rooftopTutorial) updateTutorialControls();
  if(world.id==='rooftops') {
    cityRun?.update(dt, player, {free:(!rooftopTutorial || rooftopTutorial.guidance?.mode==='free') && !cityChapter?.locked});
    if (cityRun?.state.expired) cityTimeout = { time: 0, reset: false };
    if (cityRun?.state.finished) {
      if (cityChapter?.phase === 'route') cityChapter.ring();
      else if (cityChapter?.phase === 'free') {
        cityChapter.complete();
        stationArrival = createStationArrival(player, world, {
          onDialogue: () => dialogue.start('stationArrival'),
          onJump: () => { jumpAnimationTime = 0; audio.playJump(); },
        });
        stationArrival.begin();
      }
      holdCityPlayer(); input.setAllowedKeys(['z','enter']);
    }
  }
  if (player.respawned) snapCamera();
  if (player.jumpStarted && !player.boosting) audio.playJump();
  if (player.dashStarted) audio.playDash(player.megaStarted);
  if (player.landed) audio.playLanding(player.landedHard && player.landingHeight >= 320);
  audio.updateBooster(player.boosting || player.megaCharging || player.megaBoosting);
  jumpAnimationTime = player.onGround ? 0 : Math.min(1, jumpAnimationTime + dt * animationRate);
  boostAnimationTime = player.boosting ? (player.boostStarted ? 0 : boostAnimationTime + dt) : 0;
  dashAnimationTime = player.dashStarted ? 0 : Math.min(DASH_ANIMATION_DURATION, dashAnimationTime + dt);
  if (player.dashStarted) cameraEffects.kick(7, 3, 0.2);
  if (player.boostStarted && !player.reserveBoosting) cameraEffects.pulseZoom();
  if (player.landedHard) cameraEffects.kick(3, 6, 0.18);
  const previousRunTime = runAnimationTime;
  runAnimationTime = player.onGround && player.landLockTime <= 0 && dashAnimationTime >= DASH_ANIMATION_DURATION && !player.sliding && Math.abs(player.vx) > 20
    ? runAnimationTime + dt * animationRate * (world.runAnimationRate ?? 1) * Math.max(0.7, Math.min(1.5, Math.abs(player.vx) / (world.moveSpeed ?? PLAYER.speed)))
    : 0;
  if (world.stepSound && runSprite && runAnimationTime > 0 && Math.abs(player.x - previousX) > 0.01) {
    // Dois passos por ciclo de caminhada, acompanhando a velocidade da animação.
    const stepsPerSecond = runSprite.fps * 2 / runSprite.count;
    if (previousRunTime === 0 || Math.floor(runAnimationTime * stepsPerSecond) > Math.floor(previousRunTime * stepsPerSecond)) {
      audio.playStep(world.stepSound);
    }
  }
  effects.update(dt, player, animationTime, sprite, dashSprite, dashAnimationTime, recoverSprite);

  const request = input.takeBlast();
  if (request && world.allowPowers !== false && world.allowBlast !== false) {
    const projectile = fireBlast(player, player.facing, 0);
    if (projectile) {
      projectiles.push(projectile);
    }
  }
  cameraEffects.setChargeShake(rooftopTutorial?.showChargeBar ? rooftopTutorial.charge : 0);
  cameraEffects.setRoofShake(world.roofShake?.strain ?? 0);
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
  const targetCameraX = Math.max(0, Math.min(maxCameraX, player.x + player.w / 2 - visibleWidth * 0.42 + (cityChapter?.cameraOffset ?? 0)));
  cameraX += (targetCameraX - cameraX) * Math.min(1, dt * 8);
  cameraX = Math.max(0, Math.min(maxCameraX, cameraX));
  const visibleHeight = canvas.height / scenePixelScale();
  const maxCameraY = Math.max(0, world.height - visibleHeight);
  const targetCameraY = world.id === 'rooftops'
    ? rooftopCameraY(visibleHeight) : maxCameraY;
  if (rooftopTutorial?.tightCameraY) {
    cameraY = targetCameraY;
    return;
  }
  cameraY += (targetCameraY - cameraY) * Math.min(1, dt * 8);
  const minCameraY = world.id === 'rooftops' ? -visibleHeight * 0.40 : 0;
  cameraY = Math.max(minCameraY, Math.min(maxCameraY, cameraY));
}

function snapCamera() {
  const visibleWidth = canvas.width / scenePixelScale();
  const visibleHeight = canvas.height / scenePixelScale();
  cameraX = Math.max(0, Math.min(world.width - visibleWidth, player.x + player.w / 2 - visibleWidth * 0.42));
  cameraY = world.id === 'rooftops'
    ? rooftopCameraY(visibleHeight)
    : Math.max(0, world.height - visibleHeight);
  previousCameraX = cameraX;
  previousCameraY = cameraY;
  previousPlayerX = player.x;
  previousPlayerY = player.y;
}

function rect(x, y, w, h, color, context = ctx) {
  context.fillStyle = color;
  context.fillRect(Math.round(x), Math.round(y), w, h);
}

function scenePixelScale() {
  if (world?.id === 'station') return canvas.height / world.height;
  if (world?.id === 'rooftops') {
    // Escala fixa durante o voo: acompanhar Y sem saltos de zoom.
    return Math.max(1, Math.round(uiScale * world.cameraZoom)) + (rooftopTutorial?.zoom ?? 0);
  }
  return Math.max(1, Math.round(uiScale * CAMERA_ZOOM * cameraEffects.zoom));
}

function rooftopCameraY(visibleHeight) {
  if (rooftopTutorial?.tightCameraY) return player.y + player.h / 2 - visibleHeight * 0.48;
  const ground = rooftopGroundY(world, player);
  // Segue continuamente o personagem e reserva espaço para o próximo telhado.
  const groundTarget = (player.y + player.h + ground) / 2 - visibleHeight * 0.55;
  const target = Math.min(groundTarget, player.y - visibleHeight * 0.24);
  return Math.max(-visibleHeight * 0.40, Math.min(Math.max(0, world.height - visibleHeight), target));
}

function drawPlayer(context = ctx, viewCameraX = cameraX, viewCameraY = 0, position = player) {
  const ctx = context;
  const x = Math.round(position.x - viewCameraX) + (nightSurveillance?.shakeX ?? 0);
  const y = Math.round(position.y - viewCameraY) + (nightSurveillance?.shakeY ?? 0);
  const recover = player.recovering && !player.onGround && recoverSprite ? recoverPose(player) : null;
  const tutorialPose = nightSurveillance?.caught ? { sprite: flashbangSprite ? 'flashbang' : 'landing', frame: Math.floor(nightSurveillance.reactionTime * (flashbangSprite?.fps ?? 8)) % (flashbangSprite?.count ?? 1) } : rooftopTutorial?.pose;
  const scale = tutorialPose || player.onGround && player.landLockTime > 0 && landingSprite ? { x: 1, y: 1, facing: player.facing }
    : recover ? { x: 1, y: 1, facing: recover.facing } : playerPose(player);

  if (player.megaCharging) {
    const radius = Math.round(12 + player.megaChargeTime * 26);
    const centerX = x + player.w / 2;
    const centerY = y + player.h / 2;
    ctx.fillStyle = '#ffe0a0';
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4 + animationTime * 7;
      ctx.fillRect(Math.round(centerX + Math.cos(angle) * radius),
        Math.round(centerY + Math.sin(angle) * radius), 3, 3);
    }
  }

  if (player.dashing) {
    const direction = player.dashDirection > 0 ? 'left' : 'right';
    const flameX = player.dashDirection > 0 ? x + 1 : x + player.w - 1;
    drawRocketFlame(ctx, flameX, y + 10, direction, player.megaBoosting ? 34 : 20, animationTime);
    drawRocketFlame(ctx, flameX, y + 17, direction, player.megaBoosting ? 26 : 14, animationTime + 0.17);
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
  if (tutorialPose?.sprite === 'flashbang' && flashbangSprite) activeSprite = flashbangSprite;
  else if (tutorialPose?.sprite === 'landing' && landingSprite) activeSprite = landingSprite;
  else if (tutorialPose?.sprite === 'jump' && jumpSprite) activeSprite = jumpSprite;
  else if (tutorialPose?.sprite === 'dash' && dashSprite) activeSprite = dashSprite;
  else if (recover) activeSprite = recoverSprite;
  else if (player.boosting && boostSprite) activeSprite = boostSprite;
  else if (player.landLockTime > 0 && landingSprite) activeSprite = landingSprite;
  else if ((player.dashing || dashAnimationTime < DASH_ANIMATION_DURATION) && dashSprite) activeSprite = dashSprite;
  else if (!player.onGround && jumpSprite) activeSprite = jumpSprite;
  else if (runSprite && player.onGround && !player.dashing && !player.sliding && Math.abs(player.vx) > 20) activeSprite = runSprite;
  const { image, frameW, frameH, count, columns, fps } = activeSprite;
  let frame = Math.floor(animationTime * fps) % count;
  if (tutorialPose) frame = Math.min(count - 1, tutorialPose.frame);
  else if (recover) frame = recover.frame;
  else if (activeSprite === dashSprite) frame = Math.min(count - 1, Math.floor(dashAnimationTime * fps));
  else if (activeSprite === landingSprite) frame = Math.min(count - 1, Math.floor((player.landLockDuration - player.landLockTime) * fps));
  else if (activeSprite === boostSprite) frame = Math.floor(boostAnimationTime * fps) % count;
  else if (activeSprite === jumpSprite) frame = Math.min(count - 1, Math.floor(jumpAnimationTime * fps));
  else if (activeSprite === runSprite) frame = Math.floor(runAnimationTime * fps) % count;
  const sourceX = (frame % columns) * frameW;
  const sourceY = Math.floor(frame / columns) * frameH;
  const drawW = Math.max(1, Math.round(frameW * CLASSROOM_SCALE * scale.x));
  const drawH = Math.max(1, Math.round(frameH * CLASSROOM_SCALE * scale.y));
  const spriteX = Math.round(x + (player.w - drawW) / 2);
  const spriteY = y + player.h - drawH;
  if (player.boosting) {
    const emitters = rooftopTutorial?.preparation ? [{ x: 5, y: 28 }, { x: 23, y: 28 }] : activeSprite.boostEmitters?.[frame] ?? [
      { x: frameW * 0.42, y: frameH }, { x: frameW * 0.64, y: frameH },
    ];
    const length = player.reserveBoosting ? 9 : rooftopTutorial?.preparation ? 4 + rooftopTutorial.charge * 14 : player.boostFlash > 0 ? 21 : 14;
    emitters.forEach((emitter, index) => {
      const footX = emitter.x / frameW * drawW;
      drawRocketFlame(ctx, spriteX + (scale.facing < 0 ? drawW - footX : footX),
        spriteY + emitter.y / frameH * drawH, 'down', length - index * 2,
        animationTime + index * 0.11);
    });
  }
  if (scale.facing < 0) {
    ctx.save();
    ctx.translate(spriteX + drawW, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(image, sourceX, sourceY, frameW, frameH, 0, spriteY, drawW, drawH);
    ctx.restore();
  } else {
    ctx.drawImage(image, sourceX, sourceY, frameW, frameH, spriteX, spriteY, drawW, drawH);
  }
  if (rooftopTutorial?.reboundCue) {
    const feet = y + player.h;
    for (let i = 0; i < 6; i++) {
      const phase = (animationTime * 5 + i / 6) % 1;
      ctx.fillStyle = i % 2 ? '#ffdc8f' : '#8deaff';
      ctx.fillRect(Math.round(x + player.w / 2 + (i - 2.5) * 5), Math.round(feet - phase * 8), 2, 2);
    }
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
  const alpha = accumulator / STEP;
  const renderPlayerX = previousPlayerX + (player.x - previousPlayerX) * alpha;
  const renderPlayerY = previousPlayerY + (player.y - previousPlayerY) * alpha - (stationProof?.lift ?? 0);
  const renderCameraX = previousCameraX + (cameraX - previousCameraX) * alpha;
  const renderCameraY = previousCameraY + (cameraY - previousCameraY) * alpha;
  const sourceX = world.width < visibleWidth ? (world.width - visibleWidth) / 2 : renderCameraX;
  const sourceY = world.id === 'rooftops' ? renderCameraY : Math.max(0, world.height - visibleHeight);
  const sceneOriginX = world.id === 'rooftops' ? Math.max(0, Math.floor(sourceX) - 12) : 0;
  if (world.id === 'rooftops') {
    const sceneWidth = Math.ceil(visibleWidth) + 24;
    if (sceneCanvas.width !== sceneWidth) sceneCanvas.width = sceneWidth;
  }
  // Desenha os sprites na grade original antes de ampliar a cena inteira.
  drawWorld(sceneCtx, world, sceneOriginX, sceneCanvas.width, world.height, 12);
  drawNpcs(sceneCtx, world, sceneOriginX, animationTime);
  stationProof?.drawPapers(sceneCtx);
  effects.draw(sceneCtx, sceneOriginX, sprite);
  for (const shot of projectiles) {
    rect(shot.x - sceneOriginX - 2, shot.y - 2, 8, 8, BOOST_FIRE.outer, sceneCtx);
    rect(shot.x - sceneOriginX - 1, shot.y - 1, 6, 6, BOOST_FIRE.middle, sceneCtx);
    rect(shot.x - sceneOriginX, shot.y, 4, 4, BOOST_FIRE.core, sceneCtx);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#101417';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  if (world.id === 'rooftops') {
    ctx.save();
    ctx.scale(zoom, zoom);
    drawRooftopSky(ctx, visibleWidth, visibleHeight, sourceX, sourceY, skyTime, world.groundY, rooftopTutorial?.tightCameraY ? 1 : 0, world.nightBlend ?? 0);
    nightSurveillance?.drawBackground(ctx, sourceX, sourceY, visibleWidth, visibleHeight);
    if (rooftopTutorial?.stage === 'first_flight' && player.vy < 0) {
      drawAscentLines(ctx, visibleWidth, visibleHeight,
        renderPlayerX + player.w / 2 - sourceX, skyTime);
    }
    ctx.restore();
  }
  ctx.drawImage(sceneCanvas, Math.round((sceneOriginX - sourceX + cameraEffects.x) * zoom),
    Math.round((-sourceY + cameraEffects.y) * zoom), sceneCanvas.width * zoom, world.height * zoom);
  if(world.id==='rooftops') {
    ctx.save();ctx.scale(zoom,zoom);
    drawWindGusts(ctx,world,sourceX,sourceY,visibleWidth,visibleHeight);
    ctx.restore();
  }
  // O balcão cobre o policial desenhado na cena, mas Gabriel passa à frente dele.
  if (world.id === 'station') {
    drawStationForeground(ctx, Math.round((-sourceX + cameraEffects.x) * zoom),
      Math.round((-sourceY + cameraEffects.y) * zoom), zoom);
  }
  // Arredonda a posição relativa uma só vez, já em pixels da tela.
  ctx.save();
  ctx.translate(Math.round((renderPlayerX - sourceX + cameraEffects.x) * zoom),
    Math.round((renderPlayerY - sourceY + cameraEffects.y) * zoom));
  ctx.scale(zoom, zoom);
  drawPlayer(ctx, renderPlayerX, renderPlayerY, { x: renderPlayerX, y: renderPlayerY });
  ctx.restore();
  if (nightSurveillance) {
    ctx.save();ctx.scale(zoom,zoom);
    nightSurveillance.draw(ctx,sourceX,sourceY,visibleWidth,visibleHeight);
    ctx.restore();
  }
  ctx.setTransform(uiScale, 0, 0, uiScale, 0, 0);
  const renderZoomX = zoom / uiScale;
  const renderZoomY = renderZoomX;
  const lightReaction = nightSurveillance?.reaction;
  if (lightReaction) {
    const enter = Math.min(1, lightReaction.time / .24);
    const back = 1 + 2.1 * (enter - 1) ** 3 + 1.1 * (enter - 1) ** 2;
    const exit = Math.max(0, Math.min(1, (lightReaction.time - 1.3) / .3));
    const pop = .88 + .12 * back;
    const centerX = (renderPlayerX + player.w / 2 - sourceX) * renderZoomX;
    const textY = Math.max(8, (renderPlayerY - 8 - sourceY) * renderZoomY - 9 +
      6 * (1 - back) - 3 * exit * exit);
    ctx.save();
    ctx.globalAlpha = lightReaction.opacity;
    ctx.scale(pop, pop);
    dialogue.drawPrompt(ctx, lightReaction.text, centerX / pop, textY / pop, viewWidth / pop, 1);
    ctx.restore();
  }
  if (rooftopTutorial) {
    drawDiscoveryFx(ctx, viewWidth, viewHeight,
      (renderPlayerX + player.w / 2 - sourceX) * renderZoomX,
      (renderPlayerY + player.h - sourceY) * renderZoomY,
      rooftopTutorial.showChargeBar ? rooftopTutorial.charge : 0, rooftopTutorial.burstTime, animationTime);
  }
  for (const character of world.npcs ?? []) {
    if (character.surpriseTime > 0) {
      dialogue.drawPrompt(ctx, '!', (character.x - sourceX) * renderZoomX,
        (character.y - character.h - npcJumpOffset(character) - sourceY) * renderZoomY - 24, viewWidth, 2);
    }
  }
  const canShowKeycapHint = !dialogue.active && !interactingNpc && !classroomCutscene && !agulhaCutscene && !screenFade.active && !openingDialogue && !intro.active && !videoPlaying;

  if (canShowKeycapHint && world.id === 'rooftops' && !rooftopTutorial?.onlySpace) {
    const minimapScale = Math.max(1, Math.round(uiScale));
    ctx.save();
    ctx.setTransform(minimapScale, 0, 0, minimapScale, 0, 0);
    drawRooftopMinimap(ctx, world, { ...player, x: renderPlayerX, y: renderPlayerY },
      canvas.width / minimapScale, canvas.height / minimapScale, {
        showPowers: world.allowPowers !== false && !document.body.classList.contains('no-powers'),
        maxFuel: PLAYER.maxFuel, showReserve: world.powers?.reserveKick != null,
        reserveCue: rooftopTutorial?.reserveCue,
      });
    ctx.restore();
  }

  if(canShowKeycapHint && world.id==='rooftops' && cityRun?.state.started) {
    drawCityRunHud(ctx, cityRun.state, viewWidth, dialogue.drawPrompt);
    if (cityChapter?.showObjective) dialogue.drawPrompt(ctx,'Vá até a delegacia',viewWidth/2,51,viewWidth,1);
  }

  if (!touchDevice && canShowKeycapHint && !walkPromptDismissed && !rooftopTutorial?.guidance) {
    dialogue.drawKeycapPrompt(ctx, 'Aperte {keycap A} e {keycap D} para andar.', viewWidth, viewHeight, animationTime, {
      a: Boolean(input.held.left),
      d: Boolean(input.held.right),
    });
  }

  if (canShowKeycapHint && rooftopTutorial?.guidance?.hint) {
    const hint = rooftopTutorial.guidance.hint;
    const mobileHint = touchDevice ? {
      ...hint,
      text: hint.text.replaceAll('Espaço', 'PULO').replaceAll('Shift', 'IMPULSO'),
      keys: hint.keys.map(key => ({ ' ': 'PULO', shift: 'IMPULSO', a: 'ESQ', d: 'DIR' }[key.toLowerCase()] ?? key)),
    } : hint;
    dialogue.drawTutorialHint(ctx, mobileHint,
      (renderPlayerX + player.w / 2 - sourceX) * renderZoomX,
      (renderPlayerY - sourceY) * renderZoomY, player.h * renderZoomY, viewWidth, viewHeight);
  }
  if (canShowKeycapHint && !rooftopTutorial?.guidance && rooftopTutorial?.prompt) {
    const lines = [];
    const limit = Math.max(18, Math.floor((viewWidth - 30) / 6));
    const prompt = touchDevice ? rooftopTutorial.prompt.replaceAll('Espaço', 'PULO').replaceAll('Shift', 'IMPULSO')
      : rooftopTutorial.prompt;
    if (rooftopTutorial.extended) {
      let line = '';
      for (const word of prompt.split(' ')) {
        if (line && line.length + word.length + 1 > limit) { lines.push(line); line = ''; }
        line += (line ? ' ' : '') + word;
      }
      if (line) lines.push(line);
    } else lines.push(prompt);
    lines.forEach((line, index) => dialogue.drawKeycapPrompt(ctx, line, viewWidth, viewHeight, animationTime,
      { space: input.held.jump, shift: input.held.dash }, { centerX: viewWidth / 2, y: 40 + index * 23 }));
  }
  if (canShowKeycapHint && rooftopTutorial?.showChargeBar) {
    drawChargeBar(ctx, viewWidth, viewHeight, rooftopTutorial.charge, dialogue);
  }

  const npc = canShowKeycapHint && (world.id === 'classroom' || rooftopTutorial?.canInteract)
    ? nearbyNpc(world, player) : null;
  document.body.classList.toggle('touch-interact', Boolean(touchDevice && npc && !npc.firstTalked));
  if (npc && !npc.firstTalked) {
    const centerX = (npc.x - sourceX) * renderZoomX;
    const y = (npc.y - npc.h - sourceY) * renderZoomY - 4;
    if (touchDevice) dialogue.drawPrompt(ctx, 'FALAR', centerX, Math.max(8, y - 12), viewWidth, 1);
    else dialogue.drawKeycapPrompt(ctx, '{keycap Z} para interagir', viewWidth, viewHeight, animationTime, {
      z: Boolean(input.held.interact),
    }, { centerX, y, hasPill: false });
  }
  cityChapter?.drawPhone(ctx, viewWidth, viewHeight, dialogue.drawPrompt);
  dialogue.draw(ctx, viewWidth, viewHeight);
  if (rooftopTutorial?.guidance?.fade > 0) {
    ctx.fillStyle = `rgba(16, 12, 26, ${rooftopTutorial.guidance.fade})`;
    ctx.fillRect(0, 0, viewWidth, viewHeight);
  }
  if (cityTimeout) {
    const t = cityTimeout.time;
    const alpha = t < .25 ? t / .25 : t < .8 ? 1 : Math.max(0, 1 - (t - .8) / .35);
    ctx.fillStyle = `rgba(9, 8, 21, ${alpha})`;ctx.fillRect(0,0,viewWidth,viewHeight);
    if (t < .8) dialogue.drawPrompt(ctx,'Tempo esgotado',viewWidth/2,viewHeight/2,viewWidth,1);
  }
  rocketTransition.draw(ctx, viewWidth, viewHeight);
  if (screenFade.alpha > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${screenFade.alpha})`;
    ctx.fillRect(0, 0, viewWidth, viewHeight);
  }
  document.body.classList.toggle('sprite-hud', world.id === 'rooftops');
  const fuelPercent = Math.round(player.fuel / PLAYER.maxFuel * 100);
  fuelFill.style.width = `${fuelPercent}%`;
  fuelLabel.textContent = `${fuelPercent}%`;
  reserveLabel.hidden = world.powers?.reserveKick == null;
  reserveLabel.textContent = player.reserveReady ? 'RESERVA: PRONTA' : 'RESERVA: USADA';
  reserveLabel.classList.toggle('spent', !player.reserveReady);
}

function frame(time) {
  if (!lastTime) lastTime = time;
  accumulator += Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;
  while (accumulator >= STEP) {
    previousPlayerX = player.x;
    previousPlayerY = player.y;
    previousCameraX = cameraX;
    previousCameraY = cameraY;
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
loadGabrielFlashbang().then(result => { flashbangSprite = result; }).catch(error => console.error(error));
loadGabrielLanding().then(result => { landingSprite = result; }).catch(error => console.error(error));
loadGabrielRecover().then(result => { recoverSprite = result; }).catch(error => console.error(error));
loadCallerPortrait().catch(error => console.error(error));
loadRunnerPortrait().catch(error => console.error(error));
loadRooftopHud().catch(error => console.error(error));
loadOpeningVideo();
requestAnimationFrame(frame);
