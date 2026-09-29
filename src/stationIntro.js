export function createStationIntro(player, cop, { walkSpeed, onSpeak = () => {} } = {}) {
  const targetX = 72;
  let phase = 'entering';
  let timer = 0;

  return {
    get phase() { return phase; },
    update(dt) {
      if (phase === 'entering') {
        player.facing = 1;
        player.vx = walkSpeed;
        player.x = Math.min(targetX, player.x + walkSpeed * dt);
        if (player.x >= targetX) {
          player.vx = 0;
          phase = 'waiting';
          timer = 1;
        }
      } else if (phase === 'waiting') {
        timer -= dt;
        if (timer <= 0) {
          cop.facing = -1;
          phase = 'turned';
          timer = 0.4;
        }
      } else if (phase === 'turned') {
        timer -= dt;
        if (timer <= 0) {
          phase = 'talking';
          onSpeak();
        }
      }
    },
    finishDialogue() {
      if (phase !== 'talking') return false;
      phase = 'done';
      return true;
    },
  };
}
