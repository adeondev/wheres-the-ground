import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
globalThis.Image = class { set src(value) { this.path = value; queueMicrotask(() => this.onload?.()); } };
globalThis.fetch = async path => ({ ok: true, json: async () => JSON.parse(readFileSync(path.split('?')[0], 'utf8')) });
const roofs = await import('../src/rooftops.js?v=route-obstacles');
const { createPlayer, updatePlayer } = await import('../src/player.js?v=route-obstacles');
await roofs.loadRooftopAssets();
const world = roofs.createRooftopWorld({ tutorial: true });
assert.equal(world.buildings.length, 18);
assert.equal(world.buildings[0].w, 768);assert.equal(world.buildings[0].y, 1120);
assert.equal(world.buildings[1].x-world.buildings[0].w,320);
const input = direction => ({ held: { left: direction < 0, right: direction > 0, jump: false, dash: false }, takeJump: () => false, takeDash: () => false });
const ramps = world.buildings.filter(b => new Set(b.roofOffsets).size > 1);
assert.ok(ramps.length >= 7);
for (const building of ramps) {
  assert.ok(!building.tiles.some(part => /^rampa_c1_f[1-4]$/.test(part.tile.id)), `outer ramp cap inside roof ${building.index}`);
  const joinCol = building.index % 2 === 1 ? 13 : 6;
  for (const [row, id] of ['piso_loop_telhado','concreto_loop_cima','concreto_loop_meio','concreto_loop_meio'].entries()) {
    assert.ok(building.tiles.some(part => part.tile.id === id && part.x === building.x + joinCol * 32 && part.y === building.y + row * 32), `missing middle join ${building.index}/${row}`);
  }
  for (const direction of [-1,1]) {
    const x = building.x + (direction>0 ? 48 : building.w-76);
    const p = createPlayer(roofs.rooftopSurfaceY(world,x+14));p.x=x;
    let traversed=false;
    for(let frame=0;frame<240;frame++) {
      updatePlayer(p,{...world,blocks:world.blocks.filter(b=>b.kind!=='obstacle')},input(direction),1/60);
      assert.equal(p.onGround,true,`lost ground on roof ${building.index}, ${direction}, x=${p.x-building.x}`);
      assert.equal(p.y+p.h,roofs.rooftopSurfaceY(world,p.x+p.w/2));
      if(direction>0 ? p.x>building.x+building.w-60 : p.x<building.x+32){traversed=true;break;}
    }
    assert.ok(traversed,`stuck on roof ${building.index}, ${direction}`);
  }
  const px=building.x+10*32;const p=createPlayer(roofs.rooftopSurfaceY(world,px+14)-180);p.x=px;p.onGround=false;p.vy=150;
  for(let f=0;f<120&&!p.onGround;f++)updatePlayer(p,world,input(0),1/60);
  assert.equal(p.onGround,true);assert.equal(p.y+p.h,roofs.rooftopSurfaceY(world,p.x+p.w/2));
}
// Diagonal descents must catch both uphill orientations instead of crossing the ramp.
for (const dt of [1/30,1/60,1/120]) for (const b of ramps) {
  const direction=b.index%2===1?1:-1;
  const px=b.x+320;
  const p=createPlayer(roofs.rooftopSurfaceY(world,px+14)-2);
  Object.assign(p,{x:px,onGround:false,vy:420,vx:direction*900,dashing:true,dashTime:.2,dashDirection:direction});
  updatePlayer(p,world,input(direction),dt);
  assert.equal(p.onGround,true,`missed uphill ramp at ${1/dt} FPS / ${b.index}`);
  assert.equal(p.y+p.h,roofs.rooftopSurfaceY(world,p.x+p.w/2));
}
const obstacle=world.blocks.find(b=>b.kind==='obstacle');
for(const direction of [-1,1]) {
  const p=createPlayer(roofs.rooftopSurfaceY(world,obstacle.x));
  p.x=direction>0?obstacle.x-p.w-4:obstacle.x+obstacle.w+4;
  for(let frame=0;frame<100;frame++)updatePlayer(p,world,input(direction),1/60);
  assert.equal(p.x,direction>0?obstacle.x-p.w:obstacle.x+obstacle.w,'vent must block walking');
}
for(const dt of [1/30,1/60,1/120]) {
  const p=createPlayer(obstacle.y-180);p.x=obstacle.x+20;p.onGround=false;p.vy=420;
  for(let frame=0;frame<120&&!p.onGround;frame++)updatePlayer(p,world,input(0),dt);
  assert.equal(p.y+p.h,obstacle.y,'land on vent top');
  const jumper=createPlayer(roofs.rooftopSurfaceY(world,obstacle.x));jumper.x=obstacle.x-jumper.w-12;
  const jumperInput=input(1);let fresh=true;jumperInput.takeJump=()=>{const value=fresh;fresh=false;return value};
  for(let frame=0;frame<120&&jumper.x<obstacle.x+obstacle.w;frame++)updatePlayer(jumper,world,jumperInput,dt);
  assert.ok(jumper.x>=obstacle.x+obstacle.w,'normal jump must clear the vent');
}
assert.ok(world.width<30000,'free route should be shorter');
assert.ok(world.width-world.finishX>=256,'camera must have room beyond the full finish flag');
assert.ok(world.hazards.length>=3);
const vent=world.hazards[0];vent.phase=0;vent.time=0.3;
assert.equal(vent.y,roofs.rooftopSurfaceY(world,vent.x)-30,'emitter must meet upper sprite edge');
const p=createPlayer(vent.y-4);p.x=vent.x-14;
roofs.updateRooftopHazards(world,p,1/60);
assert.ok(vent.puffs.every(puff=>puff.y+3<=vent.y),'new smoke must stay above the rim');
assert.equal(p.vy,-260);assert.equal(Math.abs(p.vx),350);assert.equal(p.onGround,false);
updatePlayer(p,world,input(-1),1/60);assert.ok(p.vx>330,'knockback canceled by movement');
console.log(`PASS: ${world.buildings.length} buildings, ${world.width}px map, ${ramps.length} ramps traversed both ways and landed on, ${world.hazards.length} smoke hazards; tutorial preserved.`);
