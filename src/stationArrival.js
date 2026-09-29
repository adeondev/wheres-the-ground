import { PLAYER } from './config.js';
import { updatePlayer } from './player.js?v=route-obstacles';

export function createStationArrival(player, world, { onDialogue = () => {}, onJump = () => {} } = {}) {
  let phase = 'idle';
  const groundY = player.y + player.h;
  const roofEdge = world.buildings.at(-1).x + world.buildings.at(-1).w;
  const physicsWorld = { ...world, allowPowers: false, allowTools: false, deathY: Infinity,
    powers: { ...world.powers, impulseDrag: 650 } };
  const input = { held: { left: false, right: true, jump: false, dash: false },
    takeJump: () => false, takeDash: () => false };
  return {
    get phase() { return phase; },
    get departing() { return phase === 'jump' || phase === 'done'; },
    begin() {
      if (phase !== 'idle') return;
      phase = 'talking'; player.vx = player.vy = 0; player.facing = 1;
      onDialogue();
    },
    finishDialogue() {
      if (phase !== 'talking') return false;
      phase = 'jump';
      Object.assign(player, { facing: 1, vx: world.moveSpeed ?? PLAYER.speed, vy: -PLAYER.jump,
        onGround: false, landLockTime: 0, landImpactTime: 0, turnSquashTime: 0,
        dashing: false, boosting: false, recovering: false, megaCharging: false, megaBoosting: false,
        reserveBoosting: false, dashTime: 0, reserveTime: 0, landSlideTime: 0,
        poweredFlight: false, takeoffGroundY: groundY, airApexY: player.y });
      onJump(); return true;
    },
    update(dt) {
      if (phase !== 'jump') return;
      // Once clear of the facade, shed forward momentum and descend beside the building.
      if (player.x >= roofEdge + 24) physicsWorld.moveSpeed = 0;
      updatePlayer(player, physicsWorld, input, dt);
      // Inicia a transição depois que Gabriel some abaixo do telhado.
      if (player.vy > 0 && player.y + player.h > groundY + 220) {
        phase = 'done'; player.vx = player.vy = 0;
      }
    },
  };
}
