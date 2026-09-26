import { TURN_DURATION, playerVisualFacing } from './animation.js';
import { PLAYER } from './config.js';
import { inVacuum, overlaps, solidBlocks } from './world.js';

export function createPlayer(groundY) {
  return {
    x: 40, y: groundY - 24, w: 14, h: 24,
    vx: 0, vy: 0, onGround: true, facing: 1,
    fuel: PLAYER.maxFuel, blastCooldown: 0,
    jumpHeldFor: 0, boosting: false, boostFlash: 0,
    dashTime: 0, dashCooldown: 0, dashDirection: 1,
    dashing: false, dashStarted: false, dashStretch: 0,
    landSlideTime: 0, landImpactTime: 0, landImpactDuration: 0.2,
    landImpactStrength: 0, turnSquashTime: 0, turnFromFacing: 1, sliding: false,
    landLockTime: 0, airApexY: groundY - 24,
    boostStarted: false, landed: false, landedHard: false, landingSpeed: 0, landingHeight: 0,
    jumpStarted: false,
    ceilingBonk: false, jumpLockAfterDash: false,
    dashBufferTime: 0,
  };
}

function approach(value, target, amount) {
  return value < target ? Math.min(value + amount, target) : Math.max(value - amount, target);
}

export function updatePlayer(player, world, input, dt) {
  const vacuum = inVacuum(world, player);
  const wasOnGround = player.onGround;
  player.landLockTime = Math.max(0, player.landLockTime - dt);
  const locked = player.landLockTime > 0;
  const horizontal = locked ? 0 : Number(input.held.right) - Number(input.held.left);
  player.blastCooldown = Math.max(0, player.blastCooldown - dt);
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  player.landSlideTime = Math.max(0, player.landSlideTime - dt);
  player.landImpactTime = Math.max(0, player.landImpactTime - dt);
  player.turnSquashTime = Math.max(0, player.turnSquashTime - dt);
  player.boostFlash = Math.max(0, player.boostFlash - dt);
  player.dashStarted = false;
  player.boostStarted = false;
  player.jumpStarted = false;
  player.landed = false;
  player.landedHard = false;
  player.dashBufferTime = Math.max(0, player.dashBufferTime - dt);
  const jumpPressed = input.takeJump();
  if (jumpPressed) {
    player.jumpHeldFor = 0; // Um novo toque nunca herda o tempo do anterior.
    player.ceilingBonk = false;
    if (player.dashCooldown <= 0) player.jumpLockAfterDash = false;
  }
  if (!input.held.jump || player.onGround) {
    player.ceilingBonk = false;
    player.jumpLockAfterDash = false;
  }
  player.jumpHeldFor = input.held.jump ? player.jumpHeldFor + dt : 0;

  if (jumpPressed && player.onGround && !locked) {
    player.vy = -PLAYER.jump;
    player.onGround = false;
    player.jumpStarted = true;
  }

  if (horizontal && horizontal !== player.facing) {
    player.turnFromFacing = playerVisualFacing(player);
    player.facing = horizontal;
    player.turnSquashTime = player.turnFromFacing === horizontal ? 0 : TURN_DURATION;
  }

  if (input.takeDash()) {
    player.dashBufferTime = 0.12;
  }

  if (player.dashBufferTime > 0 && !locked && player.dashCooldown <= 0) {
    player.dashBufferTime = 0;
    player.dashTime = PLAYER.dashDuration;
    player.dashCooldown = PLAYER.dashCooldown;
    player.dashDirection = horizontal || player.facing;
    player.vy = 0;
    player.vx = player.dashDirection * PLAYER.dashSpeed;
    player.dashStarted = true;
    player.boosting = false;
    player.boostStarted = false;
    player.boostFlash = 0;
    player.jumpHeldFor = 0;
    player.jumpLockAfterDash = true;
  }
  player.dashing = player.dashTime > 0;
  player.dashStretch = player.dashing ? 1 : Math.max(0, player.dashStretch - dt * 8);

  if (player.dashing) {
    player.jumpHeldFor = 0;
    player.vx *= 0.992; // O impulso perde um pouco de força durante a arrancada.
  } else if (vacuum && !player.onGround) {
    // Continua deslizando, mas A/D ainda permite corrigir a rota.
    if (horizontal) player.vx = approach(player.vx, horizontal * PLAYER.speed, 850 * dt);
    else player.vx *= Math.pow(0.997, dt * 60);
  } else if (player.onGround) {
    if (horizontal) {
      const reversing = player.vx * horizontal < 0;
      const easingDash = player.vx * horizontal > 0 && Math.abs(player.vx) > PLAYER.speed;
      const rate = reversing ? PLAYER.groundBrake : easingDash ? PLAYER.dashEase : PLAYER.groundAcceleration;
      player.vx = approach(player.vx, horizontal * PLAYER.speed, rate * dt);
    } else {
      player.vx = approach(player.vx, 0, (player.landSlideTime > 0 ? PLAYER.slideCoast : PLAYER.groundCoast) * dt);
    }
  } else {
    player.vx = approach(player.vx, horizontal * PLAYER.speed,
      (horizontal ? PLAYER.airAcceleration : PLAYER.airCoast) * dt);
  }

  const wasBoosting = player.boosting;
  player.boosting = !player.dashing && player.dashCooldown <= 0 && !player.ceilingBonk && !player.jumpLockAfterDash &&
    input.held.jump && !player.onGround && player.jumpHeldFor >= PLAYER.boostDelay && player.fuel > 0 && player.y > 0;
  if (player.boosting) {
    if (!wasBoosting) { player.boostFlash = 0.12; player.boostStarted = true; }
    player.fuel = Math.max(0, player.fuel - PLAYER.boostCost * dt);
  } else if (player.onGround && !vacuum && !player.dashing) {
    player.fuel = Math.min(PLAYER.maxFuel, player.fuel + PLAYER.refill * dt);
  }

  player.vy += (vacuum ? PLAYER.vacuumGravity : PLAYER.gravity) * (player.dashing ? 0.2 : 1) * dt;
  if (player.boosting) {
    // Arrancada forte ao ativar, velocidade constante enquanto segura.
    player.vy = Math.min(player.vy, -(wasBoosting ? PLAYER.boostCruise : PLAYER.boostKick));
  }
  if (!player.dashing) player.vx = Math.max(-PLAYER.maxSpeed, Math.min(PLAYER.maxSpeed, player.vx));
  player.vy = Math.max(-380, Math.min(420, player.vy));

  player.x = Math.max(0, Math.min(world.width - player.w, player.x + player.vx * dt));
  const solids = solidBlocks(world);
  for (const block of solids) {
    if (!overlaps(player, block)) continue;
    if (player.vx > 0) player.x = block.x - player.w;
    else if (player.vx < 0) player.x = block.x + block.w;
    player.vx = 0;
    player.dashTime = 0;
    player.dashing = false;
  }

  player.y += player.vy * dt;
  player.onGround = false;
  player.airApexY = Math.min(player.airApexY, player.y);
  const landingSpeed = Math.max(0, player.vy);
  for (const block of solids) {
    if (!overlaps(player, block)) continue;
    if (player.vy >= 0) {
      player.y = block.y - player.h;
      player.onGround = true;
    } else {
      player.y = block.y + block.h;
      player.ceilingBonk = true;
      player.boosting = false;
    }
    player.vy = 0;
  }
  player.landed = !wasOnGround && player.onGround && landingSpeed > 0;
  player.landingSpeed = player.landed ? landingSpeed : 0;
  player.landingHeight = player.landed ? Math.max(0, player.y - player.airApexY) : 0;
  if (player.landed) {
    player.landedHard = player.landingHeight >= PLAYER.landingMinHeight;
    if (player.landedHard) {
      player.landLockTime = PLAYER.landingLockDuration;
      player.landImpactDuration = 0.24;
      player.landImpactTime = player.landImpactDuration;
      player.landImpactStrength = 0.75;
      if (Math.abs(player.vx) > 20) {
        player.landSlideTime = Math.max(PLAYER.slideDuration, PLAYER.landingLockDuration + 0.08);
      }
    }
  }
  if (player.onGround) player.airApexY = player.y;
  player.sliding = player.onGround && !player.dashing && Math.abs(player.vx) > PLAYER.speed * 1.1;
  if (player.y <= 0) {
    player.y = 0;
    if (player.vy < 0) player.vy = 0;
    player.ceilingBonk = true;
    player.boosting = false;
  }
  player.dashTime = Math.max(0, player.dashTime - dt);
  if (player.dashTime === 0) player.dashing = false;

  if (player.y > world.groundY + 80) Object.assign(player, createPlayer(world.groundY));
}

export function fireBlast(player, dx, dy) {
  if (player.landLockTime > 0 || player.fuel < PLAYER.blastCost || player.blastCooldown > 0) return null;
  const length = Math.hypot(dx, dy) || 1;
  dx /= length;
  dy /= length;
  player.fuel -= PLAYER.blastCost;
  player.blastCooldown = PLAYER.blastCooldown;
  player.vx -= dx * 55;
  player.vy -= dy * 55;
  return {
    x: player.x + player.w / 2 - 2,
    y: player.y + player.h / 2 - 2,
    w: 4, h: 4,
    vx: dx * 310, vy: dy * 310,
    life: 0.65,
  };
}
