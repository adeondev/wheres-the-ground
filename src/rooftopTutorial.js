import { PLAYER, NORMAL_MOVEMENT } from './config.js';
import { createRooftopPowerTutorial } from './rooftopPowerTutorial.js?v=route-obstacles';

// Os dois primeiros voos são guiados; os controles são liberados após o teste.
export function createRooftopTutorial(world, player, { startDialogue, clearInput,
  onCharge = () => {}, chargeProgress = null, onLaunch = () => {}, closeDialogue = () => {},
  onLanding = () => {}, onPower = () => {}, skipBasics = false }) {
  const first = world.buildings[0];
  const next = world.buildings[1];
  const crossingLandingX = next.x + 96;
  const edgeX = first.x + first.w - player.w - 34;
  const awakenedMoveSpeed = world.moveSpeed;
  const awakenedRunRate = world.runAnimationRate;
  const awakenedAnimationRate = world.animationRate;
  const awakenedPowers = { ...world.powers };
  const edgeY = first.y - player.h;
  let stage = 'interact';
  let flight = null;
  let landingTimer = 0;
  let zoom = 0;
  let charge = 0;
  let chargeHeld = false;
  let burstTime = -1;
  let fuelLineTimer = 0;
  let advanced = null;
  world.allowPowers = false;
  world.allowBlast = false;
  world.allowTools = false;
  Object.assign(world, NORMAL_MOVEMENT);
  world.powers = { ...world.powers, allowMega: false, reserveKick: null, reboundWindow: 0 };
  world.npcs[0].firstTalked = false;

  const atEdge = () => player.onGround && player.x >= edgeX - 2;
  function openDialogue(id, phase) {
    stage = phase;
    player.vx = 0;
    clearInput();
    startDialogue(id);
  }
  function beginFlight(crossing) {
    stage = crossing ? 'crossing' : 'first_flight';
    if (!crossing) player.x = edgeX;
    flight = { elapsed: 0, duration: crossing ? 0.65 : Infinity,
      height: 105, x: player.x, y: player.y,
      targetX: crossing ? crossingLandingX : edgeX,
      targetY: (crossing ? next.y : first.y) - player.h };
    player.onGround = false;
    player.facing = 1;
    player.airApexY = player.y;
    if (!crossing) player.vy = -520;
    if (!crossing) { burstTime = 0; chargeHeld = false; onLaunch(); }
    clearInput();
  }
  function advanceFlight(dt) {
    const crossing = stage === 'crossing';
    const firstFrame = flight.elapsed === 0;
    flight.elapsed = Math.min(flight.duration, flight.elapsed + dt);
    const t = crossing ? flight.elapsed / flight.duration : 0;
    const dx = flight.targetX - flight.x;
    const dy = flight.targetY - flight.y;
    if (crossing) {
      player.x = flight.x + dx * t;
      player.y = flight.y + dy * t - 4 * flight.height * t * (1 - t);
      player.vx = dx / flight.duration;
      player.vy = (dy - 4 * flight.height * (1 - 2 * t)) / flight.duration;
    } else {
      // A subida longa e a volta acelerada são exclusivas desta descoberta.
      player.x = flight.x;
      player.vx = 0;
      if (stage === 'first_flight') {
        player.vy = -520;
        player.y = flight.y - 520 * Math.min(4, flight.elapsed);
        if (flight.elapsed >= 4) {
          stage = 'first_coast';
          player.boosting = false;
          flight.coastY = player.y;
          flight.coastElapsed = 0;
        }
      } else if (stage === 'first_coast') {
        flight.coastElapsed += dt;
        const coastTime = Math.min(0.65, flight.coastElapsed);
        player.vy = -520 * (1 - coastTime / 0.65);
        player.y = flight.coastY - 520 * (coastTime - coastTime * coastTime / 1.3);
        if (flight.coastElapsed >= 0.9) {
          flight.returnY = player.y;
          flight.returnElapsed = 0;
          openDialogue('rooftopOutOfFuel', 'out_of_fuel_dialogue');
          fuelLineTimer = 1.1;
          return;
        }
      } else {
        flight.returnElapsed += dt;
        const progress = Math.min(1, flight.returnElapsed / 0.85);
        player.y = flight.returnY + (flight.targetY - flight.returnY) * progress * progress;
        player.vy = (flight.targetY - flight.returnY) * 2 * progress / 0.85;
      }
    }
    player.airApexY = Math.min(player.airApexY, player.y);
    player.onGround = false;
    player.boosting = stage === 'first_flight';
    player.boostStarted = firstFrame && !crossing;
    player.boostFlash = player.boosting ? 0.12 : 0;
    player.dashing = crossing && flight.elapsed < 0.15;
    player.dashStarted = firstFrame && crossing;
    player.dashDirection = 1;
    player.dashStretch = player.dashing ? 1 : 0;
    const landed = crossing ? t >= 1 : stage === 'first_return' && flight.returnElapsed >= 0.85;
    if (!landed) return;
    player.y = flight.targetY;
    player.onGround = true;
    player.boosting = player.dashing = false;
    player.dashStretch = 0;
    player.recovering = player.megaCharging = false;
    player.turnSquashTime = 0;
    player.vx = player.vy = 0;
    player.landed = true;
    player.landedHard = !crossing;
    player.landingHeight = player.y - player.airApexY;
    player.landingSpeed = crossing ? 420 : 1200;
    player.landLockDuration = player.landLockTime = 0.30;
    player.landImpactDuration = player.landImpactTime = 0.24;
    player.landImpactStrength = crossing ? 0.3 : 0.65;
    if (crossing) {
      world.checkpoint = { x: crossingLandingX, y: next.y, building: 1 };
      world.moveSpeed = awakenedMoveSpeed;
      world.runAnimationRate = awakenedRunRate;
      world.animationRate = awakenedAnimationRate;
    }
    landingTimer = crossing ? 1 : 0.6;
    stage = crossing ? 'crossing_landing' : 'first_landing';
    flight = null;
    onLanding(crossing);
  }

  function beginAdvanced() {
    world.allowPowers = true;
    world.powers = { ...awakenedPowers };
    world.moveSpeed = awakenedMoveSpeed; world.runAnimationRate = awakenedRunRate;
    world.animationRate = awakenedAnimationRate;
    player.reserveReady = true; player.airDashUsed = false; player.fuel = PLAYER.maxFuel;
    world.npcs[0].firstTalked = true;
    zoom = 0;
    advanced = createRooftopPowerTutorial(world, player, { startDialogue, closeDialogue, clearInput, onLanding, onPower });
  }
  if (skipBasics) {
    player.x = crossingLandingX; player.y = next.y - player.h; player.onGround = true;
    world.checkpoint = { x: crossingLandingX, y: next.y, building: 1 };
    beginAdvanced();
  }

  return {
    get stage() { return advanced?.stage ?? stage; },
    get extended() { return Boolean(advanced); },
    get guidance() { return advanced?.state ?? null; },
    get zoom() { return advanced ? 0 : zoom; },
    get physicsScale() { return 1; },
    get tightCameraY() { return !advanced && ['first_flight', 'first_coast', 'out_of_fuel_dialogue', 'first_return'].includes(stage); },
    get preparation() { return advanced ? advanced.preparation : stage === 'charging'; },
    get onlySpace() { return advanced ? advanced.onlySpace : stage === 'launch_ready' || stage === 'charging'; },
    get onlyShift() { return !advanced && stage === 'await_dash'; },
    get onlyCombo() { return advanced?.onlyCombo ?? false; },
    get controlsLocked() { return advanced?.controlsLocked ?? false; },
    get allowedKeys() { return advanced?.allowedKeys ?? null; },
    get showChargeBar() { return advanced ? advanced.showChargeBar : stage === 'launch_ready' || stage === 'charging'; },
    get reserveCue() { return advanced?.reserveCue ?? false; },
    get reboundCue() { return advanced?.reboundCue ?? false; },
    get charge() { return advanced?.charge ?? charge; },
    get pose() {
      if (advanced) return advanced.pose;
      if (stage === 'charging') return { sprite: 'landing', frame: 0 };
      if (stage === 'crossing_landing') return { sprite: 'landing', frame: Math.min(2, Math.floor((1 - landingTimer) * 10)) };
      return null;
    },
    get burstTime() { return advanced?.burstTime ?? burstTime; },
    get canInteract() { return !advanced && stage === 'interact'; },
    get dashAvailable() { return advanced ? world.powers.allowDash !== false : stage === 'await_dash' || stage === 'crossing' || stage === 'complete'; },
    get prompt() {
      if (advanced) return advanced.prompt;
      if (stage === 'edge') return 'Vá à ponta do prédio e segure Espaço.';
      if (stage === 'launch_ready' || stage === 'charging') return 'Segure Espaço para carregar o propulsor.';
      if (stage === 'cross') return 'Pule no próximo prédio para continuar.';
      if (stage === 'await_dash') return 'Utilize Shift para dar um impulso no ar.';
      return '';
    },
    updateZoom(dt) {
      if (advanced) { advanced.update(dt); return; }
      if (stage === 'out_of_fuel_dialogue') {
        fuelLineTimer -= dt;
        if (fuelLineTimer <= 0) closeDialogue();
      }
      if (burstTime >= 0) { burstTime += dt; if (burstTime > 1.1) burstTime = -1; }
      const nearFull = Math.max(0, (charge - 0.5) / 0.5);
      const target = stage === 'charging' ? 1 + nearFull * nearFull * 0.6
        : ['launch_ready', 'first_flight', 'first_coast', 'out_of_fuel_dialogue', 'first_return'].includes(stage) ? 1 : 0;
      zoom += (target - zoom) * Math.min(1, dt * 7);
      if (Math.abs(zoom - target) < 0.002) zoom = target;
    },
    interact(npc) {
      if (stage !== 'interact') return;
      npc.firstTalked = true;
      npc.facing = player.x + player.w / 2 < npc.x ? -1 : 1;
      player.facing = player.x + player.w / 2 < npc.x ? 1 : -1;
      openDialogue('rooftopReady', 'ready_dialogue');
    },
    onDialogueClose() {
      if (advanced) return advanced.onDialogueClose();
      if (stage === 'ready_dialogue') stage = 'edge';
      else if (stage === 'first_dialogue') stage = 'cross';
      else if (stage === 'out_of_fuel_dialogue') { stage = 'first_return'; player.vy = 0; }
      else if (stage === 'final_dialogue') {
        beginAdvanced();
      } else return false;
      return true;
    },
    // Retorna true quando a sequência controla o movimento desse frame.
    beforePhysics(input, dt) {
      if (advanced) return advanced.beforePhysics(input, dt);
      if (stage === 'edge' && atEdge()) {
        stage = 'launch_ready';
        player.x = edgeX;
        player.vx = player.vy = 0;
        clearInput();
      }
      if (stage === 'launch_ready' || stage === 'charging') {
        player.jumpStarted = player.boostStarted = player.dashStarted = player.landed = player.landedHard = false;
        player.vx = player.vy = 0;
        player.facing = 1;
        input.takeJump(); input.takeDash();
        const held = Boolean(input.held.jump);
        if (held !== chargeHeld) { chargeHeld = held; onCharge(held); }
        if (held) {
          stage = 'charging';
          charge = chargeProgress ? chargeProgress() : Math.min(1, charge + dt / 3);
        } else {
          charge = 0;
          stage = 'launch_ready';
        }
        player.y = edgeY - charge * 12;
        player.boosting = held;
        player.boostFlash = 0;
        if (charge >= 1) beginFlight(false);
        else return true;
      }
      if (stage === 'await_dash' && input.takeDash()) beginFlight(true);
      if (stage === 'await_dash') {
        player.jumpStarted = player.boostStarted = player.dashStarted = player.landed = player.landedHard = false;
        player.vx = player.vy = 0;
        return true;
      }
      if (stage === 'cross_takeoff') {
        clearInput();
        player.jumpStarted = player.boostStarted = player.dashStarted = false;
        flight.elapsed = Math.min(flight.duration, flight.elapsed + dt);
        const t = flight.elapsed / flight.duration;
        player.x = flight.x + (flight.targetX - flight.x) * t;
        player.y = flight.y + (flight.targetY - flight.y) * Math.sin(t * Math.PI / 2);
        player.onGround = false;
        player.vx = (flight.targetX - flight.x) / flight.duration;
        player.vy = -120 * (1 - t);
        if (t === 1) {
          flight = null; stage = 'await_dash'; player.vx = player.vy = 0;
        }
        return true;
      }
      if (flight || stage.endsWith('_landing')) {
        clearInput();
        player.jumpStarted = player.dashStarted = player.boostStarted = false;
        player.megaStarted = player.landed = player.landedHard = false;
        if (flight) advanceFlight(dt);
        else {
          player.landLockTime = Math.max(0, player.landLockTime - dt);
          player.landImpactTime = Math.max(0, player.landImpactTime - dt);
          landingTimer -= dt;
          if (landingTimer <= 0) {
            if (stage === 'first_landing') openDialogue('rooftopWorks', 'first_dialogue');
            else openDialogue('rooftopCloseCall', 'final_dialogue');
          }
        }
        return true;
      }
      return false;
    },
    afterPhysics() {
      if (advanced) { advanced.afterPhysics(); return; }
      if (stage === 'complete') return;
      if (stage === 'cross' && player.jumpStarted && player.x >= edgeX - 24) {
        stage = 'cross_takeoff';
        player.facing = 1;
        flight = { elapsed: 0, duration: 0.32, x: player.x, y: player.y,
          targetX: first.x + first.w + 24, targetY: first.y - player.h - 72 };
        return;
      }
      // Não sair do primeiro telhado antes de iniciar o salto do tutorial.
      if (['interact', 'edge', 'launch_ready', 'cross'].includes(stage)) {
        player.x = Math.min(player.x, edgeX);
      }
    },
  };
}
