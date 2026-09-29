import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
globalThis.Image=class{set src(value){queueMicrotask(()=>this.onload?.());}};
globalThis.fetch=async path=>({ok:true,json:async()=>JSON.parse(readFileSync(path.split('?')[0],'utf8'))});
const {loadRooftopAssets,createRooftopWorld}=await import('../src/rooftops.js?v=route-obstacles');
const {createCityChapter}=await import('../src/cityChapter.js?v=route-obstacles');
const {dialogueScenes}=await import('../src/dialogueData.js?v=route-obstacles');
await loadRooftopAssets();
assert.ok(dialogueScenes.milenioPhone.lines.length >= 12);
assert.ok(dialogueScenes.milenioPhone.lines.filter(l=>l.speaker==='Milênio').every(l=>l.text.includes('[shake]')));
for(const fps of [30,60,120]){
 const world=createRooftopWorld({tutorial:true}),original=world.buildings.slice(),blocks=world.blocks.slice();
 let calls=0,rings=0,ready=0;const chapter=createCityChapter(world,{onRing:()=>rings++,onAnswer:()=>calls++,onReady:()=>ready++});
 chapter.ring();chapter.ring();assert.equal(rings,1);assert.equal(chapter.locked,true);assert.equal(chapter.answer(),false);
 for(let i=0;i<fps;i++)chapter.update(1/fps);
 assert.equal(chapter.answer(),true);assert.equal(chapter.answer(),false);assert.equal(calls,1);
 assert.equal(chapter.phase,'talking');chapter.finishCall();chapter.finishCall();
 assert.equal(world.buildings.length,36);assert.ok(world.nightBuildings.every(b=>b.riseOffset>0&&b.pendingSolids));
 assert.ok(original.every((b,i)=>world.buildings[i]===b),'existing roofs must stay in place');
 let previousNight=0;let previousRise=world.nightBuildings.map(b=>b.riseOffset);
 for(let i=0;i<fps*7;i++){
  chapter.update(1/fps);assert.ok(world.nightBlend>=previousNight);previousNight=world.nightBlend;
  world.nightBuildings.forEach((b,j)=>{assert.ok(b.riseOffset<=previousRise[j]);previousRise[j]=b.riseOffset;});
 }
 assert.equal(chapter.phase,'free');assert.equal(chapter.locked,false);assert.equal(chapter.cameraOffset,0);assert.equal(ready,1);
 assert.equal(world.nightBlend,1);assert.equal(world.goalVisible,true);
 assert.ok(world.nightBuildings.every(b=>b.riseOffset===0&&!b.pendingSolids));
 assert.ok(blocks.every(b=>world.blocks.includes(b)),'append must preserve the old collision bodies');
 assert.ok(world.blocks.some(b=>b.building===35));
 chapter.ring();assert.equal(chapter.phase,'free','the second route must not repeat the first call');
 chapter.complete();assert.equal(chapter.locked,true);assert.equal(chapter.phase,'complete');
 console.log(`PASS: ${fps} FPS; single phone call, in-place map growth, monotonic night/rise, solid new roofs and unlocked controls.`);
}
