// Efeitos visuais pequenos; não alteram a física.
import { playerPose, recoverPose } from './animation.js?v=route-obstacles';
import { BOOST_FIRE } from './palette.js';
import { CLASSROOM_SCALE } from './world.js?v=milenio';

const boostColors = [BOOST_FIRE.outer, BOOST_FIRE.middle, BOOST_FIRE.core, BOOST_FIRE.spark];

export function createEffects() {
  const particles = [];
  const landingParticles = [];
  const ghosts = [];
  const explosions = [];
  const landingImpacts = [];
  let trailTimer = 0;

  function addParticle(x, y, vx, vy, life, color, size = 2) {
    if (particles.length >= 100) particles.shift();
    particles.push({ x, y, vx, vy, life, maxLife: life, color, size });
  }

  function burst(player, horizontal) {
    const count = horizontal ? (player.megaStarted ? 48 : 30) : player.reserveBoosting ? 4 : player.reserveBoosting ? 4 : 14;
    if (horizontal) {
      explosions.push({
        x: player.x + player.w / 2 - player.dashDirection * 13,
        y: player.y + player.h / 2,
        direction: player.dashDirection,
        life: player.megaStarted ? 0.32 : 0.22,
        maxLife: player.megaStarted ? 0.32 : 0.22,
      });
    }
    for (let i = 0; i < count; i++) {
      const x = player.x + player.w / 2 - (horizontal ? player.dashDirection * 13 : 0);
      const y = player.y + (horizontal ? player.h / 2 : player.h);
      const color = boostColors[i % boostColors.length];
      addParticle(
        x + (Math.random() - 0.5) * (horizontal ? 18 : 10),
        y + (Math.random() - 0.5) * (horizontal ? 20 : 12),
        horizontal ? -player.dashDirection * (65 + Math.random() * 220) : (Math.random() - 0.5) * 100,
        horizontal ? (Math.random() - 0.5) * 210 : 60 + Math.random() * 160,
        0.12 + Math.random() * (horizontal ? 0.25 : 0.18),
        color,
        horizontal && i % 5 === 0 ? 3 : 2
      );
    }
  }

  function landingBurst(player) {
    const groundY = player.y + player.h;
    const centerX = player.x + player.w / 2;
    const spread = Math.min(1, Math.max(0, (player.landingHeight - 64) / 110));
    const smokeColors = ['#b7c9c0', '#93aaa2', '#6f8d84'];
    const grassColors = ['#a5d394', '#85ba9c', '#5c9d77', '#d4dc9a'];
    for (let i = 0; i < 16 + Math.round(spread * 10); i++) {
      const side = i % 2 ? 1 : -1;
      landingParticles.push({
        kind: 'smoke', x: centerX + (Math.random() - 0.5) * 12, y: groundY - 2,
        vx: side * (20 + Math.random() * (55 + spread * 45)) + player.vx * 0.18,
        vy: -8 - Math.random() * 35, life: 0.3 + Math.random() * 0.32,
        color: smokeColors[i % smokeColors.length], size: 2 + i % 2,
      });
    }
    for (let i = 0; i < 12 + Math.round(spread * 10); i++) {
      const side = i % 2 ? 1 : -1;
      landingParticles.push({
        kind: 'grass', x: centerX + (Math.random() - 0.5) * 18, y: groundY - 1,
        vx: side * (25 + Math.random() * (75 + spread * 35)) + player.vx * 0.15,
        vy: -65 - Math.random() * (75 + spread * 35), life: 0.55 + Math.random() * 0.25,
        groundY, color: grassColors[i % grassColors.length], size: i % 3 ? 2 : 3,
      });
    }
    if (landingParticles.length > 120) landingParticles.splice(0, landingParticles.length - 120);
  }

  function landingImpact(player, strength = 1) {
    const x = player.x + player.w / 2;
    const y = player.y + player.h;
    landingImpacts.push({ x, y, strength, life: 0.48, maxLife: 0.48 });
    const dustColors = ['#e4c6a3', '#b59f95', '#88768b', '#d8b88e'];
    for (let i = 0; i < 36; i++) {
      const side = i % 2 ? 1 : -1;
      landingParticles.push({
        kind: 'smoke', x: x + (Math.random() - 0.5) * 22, y: y - 3,
        vx: side * (65 + Math.random() * 130) * strength,
        vy: -22 - Math.random() * 65, life: 0.4 + Math.random() * 0.32,
        color: dustColors[i % dustColors.length], size: 3 + i % 4,
      });
    }
    for (let i = 0; i < 24; i++) {
      landingParticles.push({
        kind: 'grass', x: x + (Math.random() - 0.5) * 24, y: y - 2,
        vx: (i % 2 ? 1 : -1) * (50 + Math.random() * 140) * strength,
        vy: -70 - Math.random() * 140, life: 0.45 + Math.random() * 0.3,
        groundY: y, color: dustColors[i % dustColors.length], size: 2 + i % 2,
      });
    }
    for (let i = 0; i < 12; i++) {
      addParticle(x + (Math.random() - 0.5) * 16, y - 4,
        (i % 2 ? 1 : -1) * (90 + Math.random() * 130) * strength,
        -20 - Math.random() * 75, 0.15 + Math.random() * 0.16,
        i % 3 ? '#8beaff' : '#fff1cb', 2);
    }
    if (landingParticles.length > 120) landingParticles.splice(0, landingParticles.length - 120);
  }

  function update(dt, player, animationTime, sprite, dashSprite, dashAnimationTime, recoverSprite) {
    for (let i = landingImpacts.length - 1; i >= 0; i--) {
      landingImpacts[i].life -= dt;
      if (landingImpacts[i].life <= 0) landingImpacts.splice(i, 1);
    }
    for (let i = landingParticles.length - 1; i >= 0; i--) {
      const p = landingParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.kind === 'grass') p.vy += 450 * dt;
      else p.vx *= Math.pow(0.94, dt * 60);
      if (p.life <= 0 || (p.kind === 'grass' && p.y >= p.groundY && p.vy > 0)) {
        landingParticles.splice(i, 1);
      }
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = ghosts.length - 1; i >= 0; i--) {
      ghosts[i].life -= dt;
      if (ghosts[i].life <= 0) ghosts.splice(i, 1);
    }
    for (let i = explosions.length - 1; i >= 0; i--) {
      explosions[i].life -= dt;
      if (explosions[i].life <= 0) explosions.splice(i, 1);
    }

    if (player.megaCharging) {
      const angle = Math.random() * Math.PI * 2;
      const cx = player.x + player.w / 2;
      const cy = player.y + player.h / 2;
      const radius = 20 + Math.random() * 18;
      addParticle(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius,
        -Math.cos(angle) * 90, -Math.sin(angle) * 90, radius / 90,
        boostColors[Math.floor(Math.random() * boostColors.length)], 2);
    }
    if (player.dashStarted) burst(player, true);
    if (player.boostStarted) burst(player, false);
    if (player.landedHard && !landingImpacts.some(impact => impact.life > impact.maxLife - 0.04)) landingBurst(player);
    if (player.sliding && Math.random() < 0.7) {
      const direction = Math.sign(player.vx);
      addParticle(player.x + player.w / 2 - direction * 5, player.y + player.h - 1,
        -direction * (25 + Math.random() * 40), -10 - Math.random() * 25,
        0.12 + Math.random() * 0.1, '#b5c8ad', 1);
    }

    if (player.dashing) {
      if (Math.random() < 0.8) {
        addParticle(player.x + player.w / 2 - player.dashDirection * 8,
          player.y + 4 + Math.random() * (player.h - 8),
          -player.dashDirection * (50 + Math.random() * 80), (Math.random() - 0.5) * 45,
          0.1 + Math.random() * 0.12, BOOST_FIRE.middle, 2);
      }
      trailTimer -= dt;
      if (trailTimer <= 0) {
        if (ghosts.length >= 12) ghosts.shift();
        const recover = player.recovering && recoverSprite ? recoverPose(player) : null;
        const scale = recover ? { x: 1, y: 1, facing: recover.facing } : playerPose(player);
        const ghostSprite = recover ? recoverSprite : dashSprite ?? sprite;
        const ghostFrame = recover ? recover.frame : dashSprite
          ? Math.min(dashSprite.count - 1, Math.floor(dashAnimationTime * dashSprite.fps))
          : sprite ? Math.floor(animationTime * sprite.fps) % sprite.count : 0;
        ghosts.push({
          x: player.x, y: player.y, playerW: player.w, playerH: player.h, facing: scale.facing,
          sprite: ghostSprite, frame: ghostFrame,
          scaleX: scale.x, scaleY: scale.y,
          life: 0.26, maxLife: 0.26,
        });
        trailTimer = player.megaBoosting ? 0.016 : 0.025;
      }
    } else {
      trailTimer = 0;
    }

    if (player.boosting && Math.random() < (player.reserveBoosting ? 0.2 : 0.75)) {
      addParticle(player.x + 4 + Math.random() * 6, player.y + player.h,
        (Math.random() - 0.5) * 35, 90 + Math.random() * 80, 0.12,
        boostColors[Math.floor(Math.random() * boostColors.length)]);
    }
  }

  function draw(ctx, cameraX, sprite) {
    ctx.save();
    for (const impact of landingImpacts) {
      const progress = 1 - impact.life / impact.maxLife;
      const x = Math.round(impact.x - cameraX);
      const y = Math.round(impact.y - 2);
      const radius = (10 + progress * 92) * impact.strength;
      ctx.globalAlpha = (1 - progress) * 0.8;
      for (let i = 0; i < 64; i++) {
        const angle = i * Math.PI / 32;
        ctx.fillStyle = i % 3 ? '#dcbfb4' : '#8beaff';
        ctx.fillRect(Math.round(x + Math.cos(angle) * radius),
          Math.round(y + Math.sin(angle) * radius * 0.11), 3, 2);
      }
      ctx.globalAlpha = Math.max(0, 1 - progress / 0.24) * 0.85;
      ctx.fillStyle = '#fff1cb';
      ctx.fillRect(x - 30, y - 2, 60, 4);
      ctx.fillRect(x - 12, y - 6, 24, 3);
    }
    for (const explosion of explosions) {
      const progress = 1 - explosion.life / explosion.maxLife;
      const x = Math.round(explosion.x - cameraX - explosion.direction * progress * 5);
      const y = Math.round(explosion.y);
      const radius = Math.round(5 + progress * 9);
      ctx.globalAlpha = Math.min(1, explosion.life / explosion.maxLife * 1.5);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) {
        ctx.fillStyle = progress > 0.5 ? BOOST_FIRE.spark : BOOST_FIRE.outer;
        ctx.fillRect(Math.round(x + dx * radius), Math.round(y + dy * radius), 3, 3);
      }
      ctx.fillStyle = BOOST_FIRE.outer;
      ctx.fillRect(x - 6, y - 5, 12, 10);
      ctx.fillStyle = BOOST_FIRE.middle;
      ctx.fillRect(x - 4, y - 3, 8, 6);
      if (progress < 0.55) {
        ctx.fillStyle = BOOST_FIRE.core;
        ctx.fillRect(x - 2, y - 2, 4, 4);
      }
    }
    for (const ghost of ghosts) {
      ctx.globalAlpha = 0.55 * ghost.life / ghost.maxLife;
      const ghostSprite = ghost.sprite ?? sprite;
      if (ghostSprite) {
        const w = Math.round(ghostSprite.frameW * CLASSROOM_SCALE * ghost.scaleX);
        const h = Math.round(ghostSprite.frameH * CLASSROOM_SCALE * ghost.scaleY);
        const x = Math.round(ghost.x - cameraX + (ghost.playerW - w) / 2);
        const y = Math.round(ghost.y + ghost.playerH - h);
        const sourceX = (ghost.frame % ghostSprite.columns) * ghostSprite.frameW;
        const sourceY = Math.floor(ghost.frame / ghostSprite.columns) * ghostSprite.frameH;
        if (ghost.facing < 0) {
          ctx.save();
          ctx.translate(x + w, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(ghostSprite.image, sourceX, sourceY, ghostSprite.frameW, ghostSprite.frameH,
            0, y, w, h);
          ctx.restore();
        } else {
          ctx.drawImage(ghostSprite.image, sourceX, sourceY, ghostSprite.frameW, ghostSprite.frameH,
            x, y, w, h);
        }
      } else {
        ctx.fillStyle = '#c4e8e0';
        ctx.fillRect(Math.round(ghost.x - cameraX), Math.round(ghost.y), ghost.playerW, ghost.playerH);
      }
    }
    for (const p of particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - cameraX), Math.round(p.y), p.size, p.size);
    }
    for (const p of landingParticles) {
      const x = Math.round(p.x - cameraX);
      const y = Math.round(p.y);
      ctx.globalAlpha = Math.min(0.85, p.kind === 'smoke' ? p.life * 1.5 : p.life * 2);
      ctx.fillStyle = p.color;
      if (p.kind === 'smoke') {
        ctx.fillRect(x, y, p.size + 1, p.size);
        ctx.fillRect(x - 2, y + 1, 2, 2);
        ctx.fillRect(x + p.size, y - 1, 2, 2);
      } else {
        ctx.fillRect(x, y, 1, p.size + 1);
        ctx.fillRect(x + 1, y + 1, 1, 1);
      }
    }
    ctx.restore();
  }

  function clear() {
    particles.length = landingParticles.length = ghosts.length = explosions.length = 0;
    landingImpacts.length = 0;
    trailTimer = 0;
  }
  return { update, draw, clear, landingImpact };
}
