import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
globalThis.Image=class {set src(value){queueMicrotask(()=>this.onload?.());}};
globalThis.fetch=async path=>({ok:true,json:async()=>JSON.parse(readFileSync(path.split('?')[0],'utf8'))});
const {loadRooftopAssets,createRooftopWorld,appendNightDistrict,rooftopSurfaceY}=await import('../src/rooftops.js?v=route-obstacles');
const {createPlayer}=await import('../src/player.js?v=route-obstacles');
const {createStationArrival}=await import('../src/stationArrival.js');
const {dialogueScenes}=await import('../src/dialogueData.js');
await loadRooftopAssets();
assert.equal(dialogueScenes.stationArrival.lines[0].text,'Ótimo. A delegacia é logo aqui embaixo.');
for(const fps of [30,60,120]) {
  const world=createRooftopWorld({tutorial:true});appendNightDistrict(world,{revealed:true});
  const roof=world.buildings.at(-1), ground=rooftopSurfaceY(world,world.finishX);
  const player=Object.assign(createPlayer(ground),{x:world.finishX-14,onGround:true});
  let talks=0,jumps=0;
  const arrival=createStationArrival(player,world,{onDialogue:()=>talks++,onJump:()=>jumps++});
  arrival.begin();arrival.begin();assert.equal(talks,1);
  const start={x:player.x,y:player.y};arrival.update(1);
  assert.equal(player.x,start.x);assert.equal(player.y,start.y,'Gabriel must wait for the dialogue');
  assert.equal(arrival.finishDialogue(),true);assert.equal(arrival.finishDialogue(),false);
  assert.equal(jumps,1);assert.ok(player.vy<0);
  let cleared=false,rose=false;
  for(let i=0;i<fps*6;i++) {
    arrival.update(1/fps);
    cleared ||= player.x>roof.x+roof.w;
    rose ||= player.y<start.y-30;
    assert.equal(player.respawned,false,'the ending must not respawn onto the roof');
    assert.equal(player.boosting,false);
    assert.ok(player.x < world.width-player.w-20,'the descent must not reach the screen/world boundary');
  }
  assert.ok(rose&&cleared,'a natural jump must rise and clear the actual final roof');
  assert.equal(arrival.phase,'done');
  assert.ok(player.x<roof.x+roof.w+140,'the landing approach must stay close to the building');
  console.log(`PASS: ${fps} FPS; single dialogue, jump after dismissal, real roof clearance and descent without respawn.`);
}
