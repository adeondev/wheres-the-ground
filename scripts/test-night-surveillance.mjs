globalThis.Image = class { set src(value) {} };
const { createPlayer, updatePlayer } = await import('../src/player.js?v=route-obstacles');
import assert from 'node:assert/strict';
import { createNightSurveillance } from '../src/nightSurveillance.js?v=route-obstacles';

for (const fps of [30, 60, 120]) {
  const building = { x: 1000, y: 500, w: 1000, roofOffsets: Array(1000).fill(0) };
  const watch = createNightSurveillance({ nightBuildings: [{ ...building, x: 0 }, building] });
  const player = { x: 1588, y: 452, w: 24, h: 48, vx: 600, vy: 0, onGround: true,
    dashing: true, boosting: true, recovering: true, fuel: 47 };
  watch.update(1 / fps, player);
  assert.equal(watch.caught, true, 'crossing the light must capture Gabriel');
  const reaction = watch.reaction.text;
  const position = { x: player.x, y: player.y };
  for (let i = 0; i < fps * 3; i++) {
    watch.hold(player); watch.update(1 / fps, player);
    assert.equal(watch.caught, true, 'the search must last long enough to be visible');
    assert.equal(player.x, position.x); assert.equal(player.y, position.y);
    assert.equal(player.vx, 0); assert.equal(player.vy, 0);
    assert.equal(player.fuel, 47); assert.equal(player.dashing, false);
    if (i < fps) assert.equal(watch.reaction.text, reaction, 'the exclamation must stay stable during one capture');
  }
  assert.equal(watch.reaction, null, 'the brief exclamation must clear before controls return');
  for (let i = 0; i < fps; i++) watch.update(1 / fps, player);
  assert.equal(watch.caught, false, 'the light must turn off and release controls');
  for (let i = 0; i < fps * 2; i++) watch.update(1 / fps, player);
  assert.equal(watch.caught, false, 'the shutdown must give Gabriel time to leave');
  const inactive = createNightSurveillance({ nightBuildings: [{ ...building, x: 0 }, building] });
  inactive.update(1 / fps, player, false);
  assert.equal(inactive.caught, false, 'phone calls and reveal must not trigger a capture');
  console.log(`PASS: ${fps} FPS; capture, stationary landing hold, fuel preservation, release and escape window.`);
}

for (const fps of [30, 60, 120]) {
  const building = { x: 1000, y: 500, w: 1000, roofOffsets: Array(1000).fill(0), index: 1 };
  const world = { id: 'rooftops', width: 3000, height: 1600, deathY: 1680, allowPowers: true,
    buildings: [{ ...building, x: 0, index: 0 }, building], nightBuildings: [{ ...building, x: 0 }, building],
    blocks: [{ kind: 'building', building: 1, x: 1000, y: 500, w: 1000, h: 1100 }], winds: [],
    checkpoint: { x: 1200, y: 500, building: 1 } };
  const watch = createNightSurveillance(world);
  const p = Object.assign(createPlayer(500), { x: 1588, y: 400, vy: 80, onGround: false, airApexY: 400 });
  const input = { held: { left: false, right: false, jump: false, dash: false }, takeJump: () => false, takeDash: () => false };
  watch.update(1 / fps, p);
  assert.equal(watch.caught, false, 'passing above the footprint must be safe');
  p.y = 444; watch.update(1 / fps, p);
  assert.equal(watch.caught, true, 'feet touching the visible footprint must capture');
  assert.equal(p.vy, 80, 'capture must preserve vertical momentum');
  assert.ok(Math.abs(watch.trackingPoint.y - (p.y + p.h / 2)) > 20, 'acquisition must not snap the beam to Gabriel');
  let landed = false;
  for (let i = 0; i < fps; i++) {
    const y = p.y, aim = watch.trackingPoint;
    watch.hold(p); updatePlayer(p, world, input, 1 / fps); watch.update(1 / fps, p, !p.respawned);
    assert.ok(p.y >= y, 'the capture must not lift or teleport Gabriel');
    assert.ok(p.y - y <= 420 / fps + 1e-6, 'the fall must follow the normal velocity limit');
    assert.ok(Math.hypot(watch.trackingPoint.x - aim.x, watch.trackingPoint.y - aim.y) <= 420 / fps + 1e-6, 'the beam must follow smoothly');
    assert.ok(Math.abs(watch.shakeX) <= 2 && Math.abs(watch.shakeY) <= 1);
    landed ||= p.landed;
  }
  assert.equal(landed, true, 'normal physics must report a real landing');
  assert.equal(p.y + p.h, 500);
  assert.equal(watch.caught, true, 'the beam must stay on Gabriel after he lands');
  watch.update(1 / fps, p, false);
  assert.equal(watch.caught, false, 'respawn or a scene lock must cancel capture');
  console.log(`PASS: ${fps} FPS; airborne momentum/gravity, real landing, bounded tracking, smaller shake and respawn release.`);
}

// Read the rendered light field: its strongest reflection must follow a slope and a vent top.
let field;
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({
  createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
  putImageData: data => { field = data; },
}) }) };
const slope = { x: 0, y: 500, w: 400, roofOffsets: Array.from({length:400},(_,x)=>Math.floor(x/4)), index: 1 };
const scene = { buildings: [slope], nightBuildings: [{...slope,x:-1000}, slope],
  blocks: [{kind:'obstacle',x:250,y:540,w:24,h:32}] };
createNightSurveillance(scene).draw({save(){},restore(){},drawImage(){}}, 0, 480, 400, 160);
for (const px of [210, 230, 260, 280]) {
 const col = Math.floor(px/2), sampleX = (col+.5)*2;
 const expected = sampleX >= 250 && sampleX < 274 ? 540 : 500 + Math.floor(sampleX/4);
 let brightest = -1, peakY = 0;
 for(let row=0;row<field.height;row++) {
  const alpha=field.data[(row*field.width+col)*4+3];
  if(alpha>brightest){brightest=alpha;peakY=480+(row+.5)*2;}
 }
 assert.ok(Math.abs(peakY-expected)<=3, `reflection at ${px} must follow the local surface (${peakY} vs ${expected})`);
 assert.ok(brightest>80,'the contact reflection must remain visible');
 const below=Math.floor((expected+60-480)/2);
 if(below<field.height)assert.equal(field.data[(below*field.width+col)*4+3],0,'the beam must not shine through the facade');
}
const passing = createNightSurveillance(scene);
passing.draw({save(){},restore(){},drawImage(){}},0,480,400,160);
const haloX = 339, haloY = 583;
const haloAlpha = field.data[(Math.floor((haloY-480)/2)*field.width+Math.floor(haloX/2))*4+3];
assert.ok(haloAlpha > 0 && haloAlpha < 20, 'the spill beyond the focus must remain faint and visible');
const inHalo = {x:329,y:536,w:20,h:48,onGround:true,vx:0,vy:0};
passing.update(1/60,inHalo);
assert.equal(passing.caught,false,'the new surrounding spill must never capture Gabriel');
const above = {x:124,y:448,w:24,h:48,onGround:false,vx:330,vy:0};
passing.update(1/60,above);
assert.equal(passing.caught,false,'the airborne cone must never capture');
above.x=228;above.y=470;passing.update(1/60,above);
assert.equal(passing.caught,false,'passing above the spotlight must remain safe after rendering');
const renderContext = {save(){},restore(){},drawImage(){}};
const fixedBeam = createNightSurveillance(scene);
fixedBeam.draw(renderContext,0,0,400,550);
const original = field.data[(250*field.width+105)*4+3];
fixedBeam.draw(renderContext,20,0,200,550);
assert.equal(field.data[(250*field.width+95)*4+3],original,
  'scrolling and viewport width must not drag the beam across the world');
fixedBeam.draw(renderContext,0,0,100,550);
assert.ok(field.data.some((value,index)=>index%4===3&&value>0),
  'the incoming cone must remain visible while its ground focus is still offscreen');
delete globalThis.document;
console.log('PASS: roof contact, sloped reflection, vent top and facade occlusion in the rendered light field.');
