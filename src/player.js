import { rooftopWindForce } from './cityObstacles.js?v=route-obstacles';
import { RECOVER_ANIMATION_DURATION, TURN_DURATION, playerVisualFacing } from './animation.js?v=route-obstacles';
import { PLAYER } from './config.js';
import { CLASSROOM_SCALE, inVacuum, overlaps, solidBlocks } from './world.js?v=route-obstacles';
import { rooftopSurfaceY } from './rooftops.js?v=route-obstacles';

export function createPlayer(groundY) {
  const height = 24 * CLASSROOM_SCALE;
  return {
    x: 16, y: groundY - height, w: 14 * CLASSROOM_SCALE, h: height,
    vx: 0, vy: 0, onGround: true, facing: 1,
    fuel: PLAYER.maxFuel, blastCooldown: 0,
    jumpHeldFor: 0, boosting: false, boostFlash: 0,
    dashTime: 0, dashCooldown: 0, dashDirection: 1,
    dashing: false, dashStarted: false, dashStretch: 0,
    landSlideTime: 0, landImpactTime: 0, landImpactDuration: 0.2,
    landImpactStrength: 0, turnSquashTime: 0, turnFromFacing: 1, sliding: false,
    landLockTime: 0, airApexY: groundY - height,
    landLockDuration: PLAYER.landingLockDuration,
    boostStarted: false, landed: false, landedHard: false, landingSpeed: 0, landingHeight: 0,
    jumpStarted: false,
    ceilingBonk: false, jumpLockAfterDash: false,
    dashBufferTime: 0, dashComboTime: 0, airDashUsed: false,
    megaChargeTime: 0, megaCharging: false, megaBoosting: false,
    megaCarryTime: 0,
    megaStarted: false, reboundStarted: false,
    takeoffGroundY: groundY, poweredFlight: false, boostFlightTime: 0,
    reboundWindow: 0,
    recovering: false, recoverTime: 0, recoverFacing: 1,
    reserveReady: true, reserveTime: 0, reserveBoosting: false, reserveStarted: false,
    knockbackTime: 0,
  };
}

function approach(value, target, amount) {
  return value < target ? Math.min(value + amount, target) : Math.max(value - amount, target);
}

function startDash(player, powers, direction, { speed = powers.dashSpeed,
  duration = powers.dashDuration, lift = 0, mega = false, rebound = false } = {}) {
  player.dashBufferTime = 0;
  player.dashTime = duration;
  player.dashCooldown = powers.dashCooldown ?? PLAYER.dashCooldown;
  player.dashDirection = direction;
  player.vx = direction * speed;
  player.vy = -lift;
  player.dashStarted = true;
  player.dashComboTime = !mega && !rebound ? 0.08 : 0;
  player.poweredFlight = true;
  player.megaBoosting = mega;
  player.megaStarted = mega;
  player.megaCarryTime = mega ? duration + 0.55 : 0;
  player.reboundStarted = rebound;
  player.recovering = rebound;
  player.recoverTime = 0;
  player.recoverFacing = direction;
  player.boosting = false;
  player.boostFlash = 0;
  player.jumpHeldFor = 0;
  player.jumpLockAfterDash = true;
}

export function updatePlayer(player, world, input, dt) {
  const powersEnabled = world.allowPowers !== false;
  const moveSpeed = world.moveSpeed ?? PLAYER.speed;
  const powers = world.powers ?? PLAYER;
  const vacuum = inVacuum(world, player);
  const wasOnGround = player.onGround;
  const windForce=rooftopWindForce(world,player);
  player.knockbackTime = Math.max(0, (player.knockbackTime ?? 0) - dt);
  player.megaCarryTime = Math.max(0, (player.megaCarryTime ?? 0) - dt);
  if (player.recovering) {
    player.recoverTime = Math.min(RECOVER_ANIMATION_DURATION, player.recoverTime + dt);
    if (wasOnGround || player.recoverTime >= RECOVER_ANIMATION_DURATION) player.recovering = false;
  }
  player.landLockTime = Math.max(0, player.landLockTime - dt);
  let locked = player.landLockTime > 0;
  let horizontal = locked ? 0 : Number(input.held.right) - Number(input.held.left);
  player.blastCooldown = Math.max(0, player.blastCooldown - dt);
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  player.landSlideTime = Math.max(0, player.landSlideTime - dt);
  player.landImpactTime = Math.max(0, player.landImpactTime - dt);
  player.turnSquashTime = Math.max(0, player.turnSquashTime - dt);
  player.boostFlash = Math.max(0, player.boostFlash - dt);
  player.reserveTime = Math.max(0, player.reserveTime - dt);
  player.reserveStarted = false;
  player.dashStarted = false;
  player.boostStarted = false;
  player.jumpStarted = false;
  player.megaStarted = false;
  player.reboundStarted = false;
  player.respawned = false;
  player.landed = false;
  player.landedHard = false;
  player.dashBufferTime = Math.max(0, player.dashBufferTime - dt);
  player.dashComboTime = Math.max(0, player.dashComboTime - dt);
  player.reboundWindow = Math.max(0, player.reboundWindow - dt);
  const jumpPressed = input.takeJump();
  const dashPressed = input.takeDash();
  if (wasOnGround) {
    player.airDashUsed = false;
    player.takeoffGroundY = player.y + player.h;
  }
  const reboundCost = powers.reboundCost ?? 14;
  const rebound = jumpPressed && wasOnGround && powersEnabled && !input.held.dash &&
    player.reboundWindow > 0 && player.fuel >= reboundCost;
  if (rebound) {
    // Permite emendar outro salto mesmo após uma aterrissagem forte.
    player.landLockTime = 0;
    player.landImpactTime = 0;
    locked = false;
    horizontal = Number(input.held.right) - Number(input.held.left);
  }
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
  if (jumpPressed) {
    // O toque liga o propulsor no mesmo frame, inclusive ao sair do chão.
    player.jumpHeldFor = Math.max(player.jumpHeldFor, powers.boostDelay ?? PLAYER.boostDelay);
  }

  if (jumpPressed && player.onGround && !locked) {
    player.vy = -PLAYER.jump;
    player.onGround = false;
    player.jumpStarted = true;
    player.reboundWindow = 0;
    player.boostFlightTime = 0;
    player.poweredFlight = false;
    if (rebound) {
      player.fuel -= reboundCost;
      startDash(player, powers, horizontal || player.facing, {
        speed: powers.reboundSpeed ?? 480, lift: powers.reboundJump ?? 360,
        duration: powers.reboundDuration ?? 0.22, rebound: true,
      });
    }
  }

  if (horizontal && horizontal !== player.facing) {
    player.turnFromFacing = playerVisualFacing(player);
    player.facing = horizontal;
    player.turnSquashTime = player.turnFromFacing === horizontal ? 0 : TURN_DURATION;
  }

  if (dashPressed && powersEnabled && powers.allowDash !== false && !player.airDashUsed && !player.megaCharging) {
    // Guarda o toque se uma aterrissagem/cooldown ainda estiver terminando.
    player.dashBufferTime = 0.16;
  }

  if (!powersEnabled) {
    player.dashBufferTime = 0;
    player.dashTime = 0;
    player.dashing = false;
    player.megaCharging = false;
    player.megaChargeTime = 0;
    player.megaBoosting = false;
    player.reboundWindow = 0;
    player.poweredFlight = false;
    player.recovering = false;
    player.reserveTime = 0;
    player.reserveBoosting = false;
  }

  if (powersEnabled && powers.reserveKick != null && jumpPressed && !input.held.dash &&
      !wasOnGround && !player.onGround && player.vy > 0 && player.fuel <= 0 &&
      player.reserveReady && !player.megaCharging && !player.dashing && player.y > 0) {
    player.reserveReady = false;
    player.reserveTime = powers.reserveDuration ?? 0.18;
    player.reserveStarted = true;
    player.vy = -powers.reserveKick;
    player.poweredFlight = true;
    player.recovering = false;
    player.boosting = false;
    player.boostFlash = 0.18;
    player.dashBufferTime = 0;
  }

  const megaCost = powers.megaCost ?? 32;
  const upgradingDash = player.dashing && player.dashComboTime > 0 && !player.megaBoosting;
  const dashRefund = upgradingDash ? (powers.dashCost ?? 0) : 0;
  const comboPressed = powers.allowMega !== false && input.held.jump && input.held.dash &&
    (jumpPressed || dashPressed || player.dashBufferTime > 0);
  const feetY = player.y + player.h;
  const surfacesBelow = solidBlocks(world).filter(block =>
    player.x + player.w > block.x && player.x < block.x + block.w && block.y >= feetY - 1);
  const groundBelow = surfacesBelow.length
    ? Math.min(...surfacesBelow.map(block => block.y)) : player.takeoffGroundY;
  const megaHeightReady = !wasOnGround && groundBelow - feetY >= (powers.megaMinHeight ?? 96);
  // Um combo indisponível não vira um dash comum nem dispara depois ao ganhar altura.
  if (comboPressed) player.dashBufferTime = 0;
  if (powersEnabled && comboPressed && !player.onGround && !locked &&
      megaHeightReady && (!player.airDashUsed || upgradingDash) && !player.megaCharging &&
      player.fuel + dashRefund >= megaCost) {
    player.airDashUsed = true;
    player.dashBufferTime = 0;
    player.dashTime = 0;
    player.dashComboTime = 0;
    player.megaBoosting = false;
    player.megaCharging = true;
    player.recovering = false;
    player.megaChargeTime = powers.megaChargeDuration ?? 0.48;
    player.dashDirection = horizontal || player.facing;
    player.fuel += dashRefund - megaCost;
    player.poweredFlight = true;
    player.boosting = false;
  }

  if (player.megaCharging) {
    player.vx = 0;
    player.vy = 0;
    player.megaChargeTime = Math.max(0, player.megaChargeTime - dt);
    if (player.megaChargeTime === 0) {
      player.megaCharging = false;
      startDash(player, powers, player.dashDirection, {
        speed: powers.megaSpeed ?? 900, duration: powers.megaDuration ?? 0.22,
        lift: powers.megaLift ?? 55, mega: true,
      });
    }
  }

  if (powers.allowDash !== false && player.dashBufferTime > 0 &&
      !locked && player.dashCooldown <= 0 && !player.airDashUsed && !player.megaCharging &&
      player.fuel >= (powers.dashCost ?? 0)) {
    player.fuel -= powers.dashCost ?? 0;
    player.airDashUsed = true;
    startDash(player, powers, horizontal || player.facing);
  }
  player.dashing = player.dashTime > 0;
  player.dashStretch = player.dashing ? 1 : Math.max(0, player.dashStretch - dt * 8);

  if (player.knockbackTime > 0) {
    player.vx *= Math.pow(0.995, dt * 60);
  } else if (player.megaCharging) {
    player.vx = 0;
  } else if (player.dashing) {
    player.jumpHeldFor = 0;
    player.vx *= 0.992; // O impulso perde um pouco de força durante a arrancada.
  } else if (input.assistance && !player.onGround) {
    if (Math.abs(player.vx) > moveSpeed) {
      player.vx = approach(player.vx, Math.sign(player.vx) * moveSpeed,
        (player.megaCarryTime > 0 ? 260 : powers.impulseDrag ?? 300) * dt);
    }
    const accelerating = Math.abs(player.vx) < moveSpeed && input.assistance.velocityX > player.vx;
    player.vx = approach(player.vx, input.assistance.velocityX,
      (accelerating ? PLAYER.airAcceleration : input.assistance.acceleration) * dt);
  } else if (vacuum && !player.onGround) {
    // Continua deslizando, mas A/D ainda permite corrigir a rota.
    if (horizontal) player.vx = approach(player.vx, horizontal * moveSpeed, 850 * dt);
    else player.vx *= Math.pow(0.997, dt * 60);
  } else if (player.onGround) {
    if (horizontal) {
      const reversing = player.vx * horizontal < 0;
      const easingDash = player.vx * horizontal > 0 && Math.abs(player.vx) > moveSpeed;
      const rate = reversing ? PLAYER.groundBrake : easingDash ? PLAYER.dashEase : PLAYER.groundAcceleration;
      player.vx = approach(player.vx, horizontal * moveSpeed, rate * dt);
    } else {
      player.vx = approach(player.vx, 0, (player.landSlideTime > 0 ? PLAYER.slideCoast : PLAYER.groundCoast) * dt);
    }
  } else {
    const carryingImpulse = horizontal * player.vx > 0 && Math.abs(player.vx) > moveSpeed;
    player.vx = approach(player.vx, horizontal * moveSpeed,
      (carryingImpulse ? (player.megaCarryTime > 0 ? 260 : powers.impulseDrag ?? 300) : horizontal ? (windForce ? Math.min(150,PLAYER.airAcceleration) : PLAYER.airAcceleration) : PLAYER.airCoast) * dt);
  }

  const wasBoosting = player.boosting;
  player.reserveBoosting = powersEnabled && player.reserveTime > 0 && !player.onGround && !player.ceilingBonk;
  const regularBoosting = powersEnabled && player.knockbackTime <= 0 && !player.megaCharging && !player.dashing && player.dashCooldown <= 0 && !player.ceilingBonk && !player.jumpLockAfterDash &&
    (input.held.jump || jumpPressed) && !player.onGround && player.jumpHeldFor >= (powers.boostDelay ?? PLAYER.boostDelay) && player.fuel > 0 && player.y > 0;
  player.boosting = player.reserveBoosting || regularBoosting;
  if (regularBoosting && jumpPressed && !wasOnGround) player.recovering = false;
  if (player.boosting) {
    player.boostFlightTime += dt;
    if (player.boostFlightTime >= 0.12) player.poweredFlight = true;
    if (!wasBoosting) { player.boostFlash = 0.12; player.boostStarted = true; }
    if (!player.reserveBoosting) player.fuel = Math.max(0, player.fuel - powers.boostCost * dt);
  } else if (player.onGround && !vacuum && !player.dashing) {
    player.fuel = Math.min(PLAYER.maxFuel, player.fuel + (powers.refill ?? PLAYER.refill) * dt);
  }

  if (!player.megaCharging) {
    player.vy += (vacuum ? PLAYER.vacuumGravity : PLAYER.gravity) * (player.dashing ? 0.2 : 1) * dt;
  }
  if (regularBoosting && !player.reserveBoosting) {
    // Arrancada forte ao ativar, velocidade constante enquanto segura.
    player.vy = Math.min(player.vy, -(wasBoosting ? powers.boostCruise : powers.boostKick));
  }
  if(windForce&&!player.megaCharging&&player.knockbackTime<=0)player.vx+=windForce*dt;
  const baseMaxSpeed = player.megaCarryTime > 0 ? powers.megaSpeed : powers.maxSpeed ?? PLAYER.maxSpeed;
  const maxSpeed = input.assistance ? Math.max(baseMaxSpeed, Math.min(powers.megaSpeed ?? baseMaxSpeed, Math.abs(player.vx))) : baseMaxSpeed;
  if (!player.dashing) player.vx = Math.max(-maxSpeed, Math.min(maxSpeed, player.vx));
  const maxRiseSpeed = player.reserveBoosting
    ? Math.max(powers.maxRiseSpeed ?? 380, powers.reserveKick) : powers.maxRiseSpeed ?? 380;
  player.vy = Math.max(-maxRiseSpeed, Math.min(420, player.vy));

  const previousFeet = player.y + player.h;
  const previousX = player.x;
  player.x = Math.max(0, Math.min(world.width - player.w, player.x + player.vx * dt));
  let rooftopFloor = world.id === 'rooftops' ? rooftopSurfaceY(world, player.x + player.w / 2) : null;
  const followingRamp = wasOnGround && player.vy >= 0 && rooftopFloor !== null &&
    Math.abs(previousFeet - rooftopFloor) <= Math.abs(player.x - previousX) * 0.55 + 4;
  // Sweep the feet across the stepped surface. An uphill ramp can meet the feet
  // between frames even when they are already below the final sampled height.
  let sweptRoofLanding = false;
  if (world.id === 'rooftops' && player.vy >= 0 && rooftopFloor !== null) {
    const steps = Math.max(1, Math.ceil(Math.abs(player.x - previousX)));
    let lastSurface = rooftopSurfaceY(world, previousX + player.w / 2);
    let lastFeet = previousFeet;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const surface = rooftopSurfaceY(world, previousX + (player.x - previousX) * t + player.w / 2);
      const feet = previousFeet + player.vy * dt * t;
      if (surface !== null && feet >= surface &&
          (lastSurface !== null ? lastFeet <= lastSurface + 1 : lastFeet <= surface + 1)) {
        sweptRoofLanding = true;
        break;
      }
      lastSurface = surface; lastFeet = feet;
    }
  }
  // A contact earlier in the horizontal sweep cannot support feet over a later drop.
  // In particular, stepping into a collapsed roof must fall under gravity, not snap to its bottom.
  if (sweptRoofLanding && previousFeet + player.vy * dt < rooftopFloor - 1) sweptRoofLanding = false;
  if (followingRamp) player.y = rooftopFloor - player.h;
  const solids = solidBlocks(world);
  for (const block of solids) {
    if (block.kind === 'building' && (followingRamp || sweptRoofLanding)) continue;
    // A descending player above a block must land on its top, not hit its side.
    if (player.vy >= 0 && previousFeet <= block.y + 1) continue;
    if (!overlaps(player, block)) continue;
    if (player.vx > 0) player.x = block.x - player.w;
    else if (player.vx < 0) player.x = block.x + block.w;
    player.vx = 0;
    player.dashTime = 0;
    player.dashing = false;
  }
  if (world.id === 'rooftops') rooftopFloor = rooftopSurfaceY(world, player.x + player.w / 2);

  const previousTop = player.y;
  player.y += player.vy * dt;
  player.onGround = false;
  player.airApexY = Math.min(player.airApexY, player.y);
  const landingSpeed = Math.max(0, player.vy);
  if (rooftopFloor !== null && player.vy >= 0 &&
      (followingRamp || sweptRoofLanding || (previousFeet <= rooftopFloor + 1 && player.y + player.h >= rooftopFloor))) {
    player.y = rooftopFloor - player.h;
    player.onGround = true;
  }
  for (const block of solids) {
    if (block.kind === 'building' && player.onGround && rooftopFloor !== null) continue;
    if (player.x + player.w <= block.x || player.x >= block.x + block.w) continue;
    if (player.vy >= 0 && previousFeet <= block.y + 1 && player.y + player.h >= block.y) {
      player.y = block.y - player.h;
      player.onGround = true;
    } else if (player.vy < 0 && previousTop >= block.y + block.h - 1 && player.y <= block.y + block.h) {
      player.y = block.y + block.h;
      player.ceilingBonk = true;
      player.boosting = false;
      player.reserveTime = 0;
      player.reserveBoosting = false;
      player.vy = 0;
    }
  }
  if (player.onGround) player.vy = 0;
  player.landed = !wasOnGround && player.onGround && landingSpeed > 0;
  player.landingSpeed = player.landed ? landingSpeed : 0;
  player.landingHeight = player.landed ? Math.max(0, player.y - player.airApexY) : 0;
  if (player.landed) {
    player.megaCarryTime = 0;
    player.dashStretch = 0;
    player.turnSquashTime = 0;
    player.recovering = false;
    player.reserveReady = true;
    player.reserveTime = 0;
    player.reserveBoosting = false;
    player.boosting = false;
    player.airDashUsed = false;
    // O impulso é uma continuação de um pouso com poder, nunca um salto comum.
    player.reboundWindow = powersEnabled && (player.poweredFlight || player.landedHard || player.landingHeight >= 48) ? (powers.reboundWindow ?? 0.35) : 0;
    player.poweredFlight = false;
    player.boostFlightTime = 0;
    player.landedHard = player.landingHeight >= (world.landing?.minHeight ?? PLAYER.landingMinHeight) &&
      player.landingSpeed >= (world.landing?.minSpeed ?? 0);
    if (player.landedHard) {
      player.landLockDuration = world.landing?.lockDuration ?? PLAYER.landingLockDuration;
      player.landLockTime = player.landLockDuration;
      player.landImpactDuration = 0.24;
      player.landImpactTime = player.landImpactDuration;
      player.landImpactStrength = 0.75;
      if (Math.abs(player.vx) > 20) {
        player.landSlideTime = Math.max(PLAYER.slideDuration, player.landLockDuration + 0.08);
      }
    }
  }
  if (player.onGround) player.airApexY = player.y;
  player.sliding = player.onGround && !player.dashing && Math.abs(player.vx) > moveSpeed * 1.1;
  if (player.y <= 0) {
    player.y = 0;
    if (player.vy < 0) player.vy = 0;
    player.ceilingBonk = true;
    player.boosting = false;
    player.reserveTime = 0;
    player.reserveBoosting = false;
  }
  player.dashTime = Math.max(0, player.dashTime - dt);
  if (player.dashTime === 0) {
    player.dashing = false;
    player.megaBoosting = false;
  }

  if (world.id === 'rooftops' && player.onGround) {
    const building = world.buildings.find(building =>
      player.x + player.w > building.x && player.x < building.x + building.w &&
      Math.abs(player.y + player.h - rooftopSurfaceY(world, player.x + player.w / 2)) < 1);
    if (building && building.index > world.checkpoint.building) {
      world.checkpoint = { x: building.x + 48, y: rooftopSurfaceY(world, building.x + 48 + player.w / 2), building: building.index };
    }
  }
  if (player.y > (world.deathY ?? world.groundY + 80)) {
    const spawn = world.checkpoint ?? { x: 16, y: world.groundY };
    Object.assign(player, createPlayer(spawn.y), { x: spawn.x, respawned: true });
  }
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
