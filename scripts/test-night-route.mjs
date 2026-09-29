import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
globalThis.Image=class{set src(value){queueMicrotask(()=>this.onload?.());}};
globalThis.fetch=async path=>({ok:true,json:async()=>JSON.parse(readFileSync(path.split('?')[0],'utf8'))});
const {loadRooftopAssets,createRooftopWorld,appendNightDistrict,rooftopSurfaceY}=await import('../src/rooftops.js?v=route-obstacles');
const {createPlayer,updatePlayer}=await import('../src/player.js?v=route-obstacles');
await loadRooftopAssets();
for(const fps of [30,60,120]){
 const world=createRooftopWorld({tutorial:true});appendNightDistrict(world,{revealed:true});
 world.winds=[];
 let successes=0;
 const roofs=[world.buildings[17],...world.nightBuildings];
 for(let i=0;i<roofs.length-1;i++){
  const from=roofs[i],to=roofs[i+1],x=from.x+from.w-72;
  const p=Object.assign(createPlayer(rooftopSurfaceY(world,x)),{x,vx:330});
  let jump=true,landed=false,dash=false;
  const input={held:{right:true,left:false,jump:true,dash:false},takeJump(){const q=jump;jump=false;return q},takeDash(){const q=dash;dash=false;return q},takeBlast(){return null}};
  for(let frame=0;frame<fps*7;frame++){
   input.held.jump=frame<fps*(from.y<=384 ? .90 : 1.55);
   if(from.y<=384 && frame===Math.round(fps*.30))dash=true;
   input.held.dash=from.y<=384 && frame>=Math.round(fps*.30) && frame<fps*.90;
   input.held.right=p.x<to.x+160;
   updatePlayer(p,world,input,1/fps);
   if(p.onGround&&p.x>=to.x&&p.x<to.x+to.w){landed=true;break;}
   if(p.respawned)break;
  }
  if(!landed) console.log({from: {x:from.x,w:from.w,y:from.y},to:{x:to.x,y:to.y},p:{x:p.x,y:p.y,fuel:p.fuel,vx:p.vx,vy:p.vy,respawned:p.respawned}});
  assert.ok(landed,`${fps} FPS crossing ${i}: x=${p.x} y=${p.y} target=${to.x},${to.y}`);successes++;
 }
 console.log(`PASS: ${fps} FPS; ${successes} night crossings using real boost, gravity and collision.`);
}
