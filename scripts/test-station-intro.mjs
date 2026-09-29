import assert from 'node:assert/strict';
import { createStationIntro } from '../src/stationIntro.js';
import { dialogueScenes } from '../src/dialogueData.js';

assert.equal(dialogueScenes.stationGreeting.lines[0].text, 'Fala, garoto.');

for (const fps of [30, 60, 120]) {
  const player = { x: 8, vx: 0, facing: -1 };
  const cop = { facing: 1 };
  let speeches = 0;
  const intro = createStationIntro(player, cop, {
    walkSpeed: 52.5,
    onSpeak: () => speeches++,
  });
  let stoppedAt, turnedAt, spokeAt;
  for (let frame = 0; frame < fps * 4; frame++) {
    const before = intro.phase;
    intro.update(1 / fps);
    const time = (frame + 1) / fps;
    if (before === 'entering' && intro.phase === 'waiting') stoppedAt = time;
    if (before === 'waiting' && intro.phase === 'turned') turnedAt = time;
    if (before === 'turned' && intro.phase === 'talking') spokeAt = time;
  }
  assert.equal(player.x, 72);
  assert.equal(player.vx, 0);
  assert.equal(player.facing, 1);
  assert.equal(cop.facing, -1);
  assert.ok(turnedAt - stoppedAt >= 1 - 1 / fps);
  assert.ok(spokeAt - turnedAt >= 0.4 - 1 / fps);
  assert.equal(speeches, 1);
  assert.equal(intro.finishDialogue(), true);
  assert.equal(intro.finishDialogue(), false);
  console.log(`PASS: ${fps} FPS; automatic entrance, pause, police turn and one greeting.`);
}
