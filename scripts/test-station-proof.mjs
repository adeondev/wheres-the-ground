import assert from 'node:assert/strict';
import { createStationProof } from '../src/stationProof.js';
import { dialogueScenes } from '../src/dialogueData.js';

const state = {};
dialogueScenes.stationGreeting.onExit(state);
assert.equal(state.triggerStationProof, true);
assert.equal(dialogueScenes.stationGreeting.lines[0].text, 'Fala, garoto.');
assert.equal(dialogueScenes.stationResolution.lines[0].text, '...Tá. Você estava voando.');

for (const fps of [30, 60, 120]) {
  const proof = createStationProof();
  let maxLift = 0;
  let boosted = false;
  let drawCalls = 0;
  const paperCtx = { save() {}, restore() {}, fillRect() { drawCalls++; } };
  for (let frame = 0; frame < fps * 2; frame++) {
    proof.update(1 / fps);
    maxLift = Math.max(maxLift, proof.lift);
    boosted ||= proof.boosting;
    proof.drawPapers(paperCtx);
    if (proof.done) break;
  }
  assert.equal(maxLift, 10);
  assert.equal(boosted, true);
  assert.ok(drawCalls > 0);
  assert.equal(proof.done, true);
  assert.equal(proof.lift, 0);
  assert.equal(proof.boosting, false);
  console.log(`PASS: ${fps} FPS; proof lifts Gabriel, moves papers, then lands before dialogue resumes.`);
}
