// Efeitos visuais pequenos; não alteram a física.
import { playerPose } from './animation.js';
import { BOOST_FIRE } from './palette.js';

const boostColors = [BOOST_FIRE.outer, BOOST_FIRE.middle, BOOST_FIRE.core, BOOST_FIRE.spark];

export function createEffects() {
  const particles = [];
  const landingParticles = [];
  const ghosts = [];
  const explosions = [];
  let trailTimer = 0;

  function addParticle(x, y, vx, vy, life, color, size = 2) {
    if (particles.length >= 100) particles.shift();
    particles.push({ x, y, vx, vy, life, maxLife: life, color, size });
  }

  function burst(player, horizontal) {
    const count = horizontal ? 30 : 14;
    if (horizontal) {
      explosions.push({
        x: player.x + player.w / 2 - player.dashDirection * 13,
        y: player.y + player.h / 2,
        direction: player.dashDirection,
        life: 0.22, maxLife: 0.22,
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

  function update(dt, player, animationTime, sprite, dashSprite, dashAnimationTime) {
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

    if (player.dashStarted) burst(player, true);
    if (player.boostStarted) burst(player, false);
    if (player.landedHard) landingBurst(player);
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
        const scale = playerPose(player);
        const ghostSprite = dashSprite ?? sprite;
        const ghostFrame = dashSprite
          ? Math.min(dashSprite.count - 1, Math.floor(dashAnimationTime * dashSprite.fps))
          : sprite ? Math.floor(animationTime * sprite.fps) % sprite.count : 0;
        ghosts.push({
          x: player.x, y: player.y, facing: scale.facing,
          sprite: ghostSprite, frame: ghostFrame,
          scaleX: scale.x, scaleY: scale.y,
          life: 0.26, maxLife: 0.26,
        });
        trailTimer = 0.025;
      }
    } else {
      trailTimer = 0;
    }

    if (player.boosting && Math.random() < 0.75) {
      addParticle(player.x + 4 + Math.random() * 6, player.y + player.h,
        (Math.random() - 0.5) * 35, 90 + Math.random() * 80, 0.12,
        boostColors[Math.floor(Math.random() * boostColors.length)]);
    }
  }

  function draw(ctx, cameraX, sprite) {
    ctx.save();
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
        const w = Math.round(ghostSprite.frameW * ghost.scaleX);
        const h = Math.round(ghostSprite.frameH * ghost.scaleY);
        const x = Math.round(ghost.x - cameraX + (14 - w) / 2);
        const y = Math.round(ghost.y + 24 - h);
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
        ctx.fillRect(Math.round(ghost.x - cameraX), Math.round(ghost.y), 14, 24);
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

  return { update, draw };
}
