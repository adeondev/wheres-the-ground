import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
globalThis.Image=class{set src(value){queueMicrotask(()=>this.onload?.());}};
globalThis.fetch=async path=>({ok:true,json:async()=>JSON.parse(readFileSync(path.split('?')[0],'utf8'))});
const roofs=await import('../src/rooftops.js?v=route-obstacles');
const {createPlayer,updatePlayer}=await import('../src/player.js?v=route-obstacles');
const {updateCityObstacles,rooftopWindForce}=await import('../src/cityObstacles.js?v=route-obstacles');
const {overlaps}=await import('../src/world.js?v=route-obstacles');
await roofs.loadRooftopAssets();
const input=(direction=0)=>({held:{left:direction<0,right:direction>0,jump:false,dash:false},takeJump:()=>false,takeDash:()=>false});
for(const fps of [30,60,120]) {
  const dt=1/fps,world=roofs.createRooftopWorld({tutorial:true});
  assert.ok(world.hazards.every(vent=>vent.building>=6));
  assert.ok(world.winds.every(wind=>wind.building>=7));
  assert.ok(world.fragileRoofs.every(roof=>roof.building>=8));
  const roof=world.fragileRoofs[0],p=createPlayer(roof.y);p.x=roof.x+32;
  updateCityObstacles(world,p,dt);assert.equal(roof.state,'warning');
  for(let t=dt;t<.25;t+=dt){updatePlayer(p,world,input(),dt);updateCityObstacles(world,p,dt);}
  assert.equal(roof.state,'warning','must warn before losing support');
  for(let frame=0;frame<fps*2&&roof.state!=='collapsed';frame++){updatePlayer(p,world,input(),dt);updateCityObstacles(world,p,dt);}
  assert.equal(roof.state,'collapsed');
  assert.equal(world.roofShake.collapse,true,'nearby collapse must request camera shake');
  assert.equal(p.onGround,false,'collapse must remove support without moving Gabriel');
  assert.ok(Math.abs(p.y+p.h-roof.y)<.01,'collapse must not teleport the player into the pit');
  assert.equal(roof.debris.length,8,'roof must detach as eight textured slabs');
  assert.ok(roof.debris.every(part=>part.source&&part.h===32&&!part.fractured),'fall must start with actual roof pieces');
  assert.equal(roofs.rooftopSurfaceY(world,p.x+p.w/2),roof.y+roof.depth);
  let impactShake=false;
  for(let frame=0;frame<fps*2;frame++) {
    const beforeY=p.y;
    updatePlayer(p,world,input(),dt);updateCityObstacles(world,p,dt);
    assert.ok(p.y-beforeY<=420*dt+.001,'fall must be continuous at the physical speed, not snap');
    impactShake ||= world.roofShake.impact>0;
    assert.ok(!world.blocks.some(block=>overlaps(p,block)),'fallen roof still has an invisible solid body');
  }
  assert.equal(p.y+p.h,roof.y+roof.depth,'normal gravity must land inside the collapsed section');
  assert.equal(impactShake,true,'fragment impacts must request camera shake');
  assert.equal(roof.debris.length,16,'falling slabs must break into smaller pieces on impact');
  assert.ok(roof.debris.every(part=>part.fractured&&part.settled&&part.bounces>0),'pieces must rebound and come to rest');
  for(const part of roof.debris){
    const c=Math.abs(Math.cos(part.angle)),sin=Math.abs(Math.sin(part.angle));
    const bounds={x:part.x-(part.w*c+part.h*sin)/2+.001,y:part.y-(part.h*c+part.w*sin)/2+.001,w:part.w*c+part.h*sin-.002,h:part.h*c+part.w*sin-.002};
    assert.ok(!world.blocks.some(block=>overlaps(bounds,block)),'rubble must not pass through collision bodies');
    assert.ok(Math.abs(part.y+(part.h*c+part.w*sin)/2-roof.y-roof.depth)<.01,'settled rubble must rest on the pit floor');
  }
  const settledRubble=JSON.stringify(roof.debris);
  for(let frame=0;frame<fps*6;frame++)updateCityObstacles(world,p,dt);
  assert.equal(roof.state,'collapsed','repair must not push a player out of the pit');
  assert.equal(JSON.stringify(roof.debris),settledRubble,'settled rubble must remain stable and persistent');
  p.fuel=0;
  for(let frame=0;frame<fps;frame++){updatePlayer(p,world,input(),dt);updateCityObstacles(world,p,dt);}
  assert.ok(p.fuel>=39,'fuel must recharge inside the pit');
  const escape=input(1);let freshJump=true;escape.takeJump=()=>{const value=freshJump;freshJump=false;return value};
  for(let frame=0;frame<fps*2&&p.x<roof.x+roof.w+16;frame++) {
    escape.held.jump=frame<fps*.45;
    updatePlayer(p,world,escape,dt);updateCityObstacles(world,p,dt);
    assert.ok(!world.blocks.some(block=>overlaps(p,block)),'escaping must respect the pit wall');
  }
  assert.ok(p.x>=roof.x+roof.w+16,'boost must allow escape without a softlock');
  const brokenBlocks=world.blocks.filter(block=>block.kind==='building'&&block.building===8).map(block=>({...block}));
  p.x=roof.x+roof.w+80;p.y=roof.y-p.h;
  for(let frame=0;frame<fps*30;frame++)updateCityObstacles(world,p,dt);
  p.x=roof.x+32;p.y=roof.y-p.h;p.onGround=true;
  updateCityObstacles(world,p,dt);assert.equal(roof.state,'collapsed','returning must not restore the roof');
  assert.equal(roofs.rooftopSurfaceY(world,roof.x+32),roof.y+roof.depth);
  p.respawned=true;updateCityObstacles(world,p,dt);p.respawned=false;
  assert.equal(roof.state,'collapsed','checkpoint retry must preserve broken roofs');
  assert.deepEqual(world.blocks.filter(block=>block.kind==='building'&&block.building===8),brokenBlocks);
  // A fresh map is intact; a running player can leave before support disappears.
  const freshWorld=roofs.createRooftopWorld({tutorial:true}),freshRoof=freshWorld.fragileRoofs[0];
  const runner=createPlayer(freshRoof.y);
  Object.assign(runner,{x:freshRoof.x-runner.w,vx:330,onGround:true,landLockTime:0});
  for(let frame=0;frame<fps;frame++){updatePlayer(runner,freshWorld,input(1),dt);updateCityObstacles(freshWorld,runner,dt);}
  assert.ok(runner.x>freshRoof.x+freshRoof.w,'running player should clear the section before it gives way');

  // Entering an existing pit used to retain a swept contact from the intact roof,
  // then snap Gabriel 96 pixels downward in one frame.
  const pitWorld=roofs.createRooftopWorld({tutorial:true}),pit=pitWorld.fragileRoofs[0];
  const standing=createPlayer(pit.y);standing.x=pit.x+32;
  for(let frame=0;frame<fps;frame++)updateCityObstacles(pitWorld,standing,dt);
  assert.equal(pit.state,'collapsed');
  const crossing=createPlayer(pit.y);Object.assign(crossing,{x:pit.x-46,vx:330});
  let fell=false;
  for(let frame=0;frame<Math.ceil(fps*.4);frame++){
    const beforeY=crossing.y;updatePlayer(crossing,pitWorld,input(1),dt);
    assert.ok(crossing.y-beforeY<=420*dt+.001,'entering the pit must not snap to its lower surface');
    if(!crossing.onGround&&crossing.y>pit.y-crossing.h)fell=true;
  }
  assert.equal(fell,true,'crossing the broken edge must start a natural fall');

  const wind=world.winds[0];
  const airborne=createPlayer(wind.y+100);Object.assign(airborne,{x:wind.x+wind.w/2-14,onGround:false,vx:330,vy:0});
  wind.phase=0;wind.time=4.3;updateCityObstacles(world,airborne,dt);
  assert.equal(wind.warning,true);assert.equal(rooftopWindForce(world,airborne),0);
  assert.ok(wind.time<.1,'first approach must start a visible warning');
  wind.time=1.4;updateCityObstacles(world,airborne,dt);
  assert.ok(rooftopWindForce(world,airborne)<-200,'gust must oppose the first crossing');
  airborne.y=-200;assert.ok(rooftopWindForce(world,airborne)<-200,'high flights must still meet gusts');
  const calm={...airborne};
  updatePlayer(airborne,world,input(1),dt);updatePlayer(calm,{...world,winds:[]},input(1),dt);
  assert.ok(airborne.vx<calm.vx,'gust must affect the actual motion');
  assert.ok(airborne.x<calm.x,'wind must move the collision body, not only its effects');
  assert.equal(airborne.fuel,calm.fuel,'wind must not consume fuel');
  airborne.onGround=true;assert.equal(rooftopWindForce(world,airborne),0);
  airborne.onGround=false;airborne.y=wind.y-200;assert.equal(rooftopWindForce(world,airborne),0);
  wind.time=4;airborne.y=wind.y+100;updateCityObstacles(world,airborne,dt);
  assert.equal(wind.active,false);assert.equal(rooftopWindForce(world,airborne),0);

  const vent=world.hazards[0];vent.phase=0;vent.time=vent.behavior.period-.4;
  const bystander=createPlayer(vent.y-4);bystander.x=vent.x-14;
  roofs.updateRooftopHazards(world,bystander,dt);
  assert.equal(vent.warning,true);assert.equal(bystander.knockbackTime,0);
  vent.time=.4;roofs.updateRooftopHazards(world,bystander,dt);
  assert.equal(vent.active,true);assert.ok(bystander.knockbackTime>0);
  console.log(`PASS: ${fps} FPS; vapor warning/knockback, wind physics, roof warning/fall/permanence/checkpoint.`);
}
