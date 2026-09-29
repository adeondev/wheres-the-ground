import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
globalThis.Image=class{set src(v){queueMicrotask(()=>this.onload?.())}};
globalThis.fetch=async p=>({ok:true,json:async()=>JSON.parse(readFileSync(p.split('?')[0],'utf8'))});
const roofs=await import('../src/rooftops.js?v=route-obstacles');
const {createPlayer,updatePlayer}=await import('../src/player.js?v=route-obstacles');
const {createRooftopTutorial}=await import('../src/rooftopTutorial.js?v=route-obstacles');
const {createInput}=await import('../src/input.js?v=route-obstacles');
const {overlaps}=await import('../src/world.js?v=route-obstacles');
await roofs.loadRooftopAssets();
function surface() {
  const listeners=new Map(),buttons=new Map();
  globalThis.window={addEventListener(type,fn){listeners.set(type,fn)}};
  globalThis.document={querySelectorAll(){return ['left','right','jump','dash'].map(key=>{
    const b={dataset:{key},listeners:new Map(),setPointerCapture(){},addEventListener(t,f){this.listeners.set(t,f)}};buttons.set(key,b);return b;
  })}};
  const input=createInput(),down=new Set();
  function key(k,value) {
    if(down.has(k)===value)return;
    if(value)down.add(k);else down.delete(k);
    listeners.get(value?'keydown':'keyup')({key:k,repeat:false,preventDefault(){}});
  }
  function touch(k,value){buttons.get(k).listeners.get(value?'pointerdown':'pointerup')({pointerId:k==='jump'?11:12,preventDefault(){}})}
  return {input,key,touch,buttons,listeners};
}
// Permission changes preserve actual held movement; touch and keyboard release independently.
{
 const s=surface();s.key('d',true);s.input.setAllowedKeys([' ']);assert.equal(s.input.held.right,false);
 assert.equal(s.input.physical.right,true);s.input.setAllowedKeys(['d']);assert.equal(s.input.held.right,true);
 s.input.setAllowedKeys(null);s.key(' ',true);assert.equal(s.input.takeJump(),true);
 s.touch('jump',true);s.key(' ',false);assert.equal(s.input.held.jump,true);
 s.touch('jump',false);assert.equal(s.input.held.jump,false);
 s.key('Shift',true);s.listeners.get('blur')();assert.equal(s.input.physical.dash,false);
}
function run(dt,variant='early',inject=null) {
 const world=roofs.createRooftopWorld({tutorial:true}),p=createPlayer(world.spawn.y),s=surface(),events=[],landings=[],hintDurations=new Map();
 const t=createRooftopTutorial(world,p,{skipBasics:true,clearInput:s.input.clear,onLanding(){},onPower:k=>events.push(k)});
 let lastVisibleHint=null, lastPause='',age=0,finished=false,injected=false,retried=false;
 s.input.setAllowedKeys(t.guidance.allowedKeys);s.key('d',true);
 let accumulator=0;const step=1/60;
 rendering: for(let frame=0;frame<20000;frame++) {
  accumulator+=dt;
  while(accumulator>=step-1e-9) {
   accumulator-=step;
   const g=t.guidance;
   if(g.mode==='walk'&&g.hint?.text==='Vá até a ponta'&&g.hint.alpha>=.95)hintDurations.set(t.stage,(hintDurations.get(t.stage)??0)+step);
   if(variant==='left') {s.key('a',g.mode==='assist');s.key('d',g.mode!=='assist');}
   s.input.setAllowedKeys(g.allowedKeys);
   if(g.mode==='retry')retried=true;
   if(inject==='fuel'&&!injected&&t.stage==='approach_mega'&&p.x>world.buildings[4].x+world.buildings[4].w-360){p.fuel=0;injected=true;}
   if(inject&&inject!=='fuel'&&!injected&&t.stage==='reserve_climb') {
     if(inject==='death')p.y=world.deathY+10;
     if(inject==='wall')world.blocks.push({x:p.x+30,y:0,w:50,h:world.height});
     if(inject==='wrongRoof'){p.x=world.buildings[1].x+100;p.y=world.buildings[1].y-p.h-1;p.vy=420;}
     injected=true;
   }
   if(retried&&inject==='wall')world.blocks=world.blocks.filter(b=>b.w!==50);
   if(g.mode==='pause') {
     if(t.stage!==lastPause){lastPause=t.stage;age=0;s.key(' ',false);s.key('Shift',false);s.touch('jump',false);s.touch('dash',false);}
     age+=step;
     if(g.hint?.text.startsWith('Solte')){s.key(' ',false);s.key('Shift',false);s.touch('jump',false);s.touch('dash',false);}
     else if(age>(variant==='late'?.5:step)) {
       if(variant==='touch'){s.touch('jump',true);if(t.onlyCombo)s.touch('dash',true)}
       else if(variant==='shift-first'&&t.onlyCombo){s.key('Shift',true);if(age>step*3)s.key(' ',true)}
       else {s.key(' ',true);if(t.onlyCombo&&age>step*3)s.key('Shift',true)}
     }
   }
   const prev={x:p.x,y:p.y,vx:p.vx},stage=t.stage;
   t.updateZoom(step);
   if(!t.beforePhysics(s.input,step)){updatePlayer(p,world,s.input,step);t.afterPhysics()}
   s.input.setAllowedKeys(t.guidance.allowedKeys);
   const shown=t.guidance.hint;
   if(t.guidance.mode==='walk'&&shown&&shown.text!==lastVisibleHint)assert.ok(shown.alpha<=.07,`new hint flashed at full opacity: ${shown.text}/${shown.alpha}`);
   lastVisibleHint=shown?.text??null;
   if(t.stage==='reserve_launch_pause'||t.stage==='mega_launch_pause') {
     assert.equal(p.facing,1,'arrival must face the tower');
     assert.ok(p.vx>=0,'arrival must never reverse');
     assert.ok(Math.abs(p.vx-prev.vx)<=700*step+.01,'arrival stopped abruptly');
     assert.ok(shown?.keys.includes('ESPAÇO')||shown?.text==='Solte Espaço','arrival stopped without its command');
   }
   if(p.landed)landings.push({stage,roof:world.buildings.findIndex(b=>p.x+p.w/2>=b.x&&p.x+p.w/2<b.x+b.w),x:p.x});
   if(t.guidance.mode!=='retry'&&!p.respawned&&!(inject&&injected&&!retried)) {
     assert.ok(Math.abs(p.x-prev.x)<=900*step+.01,`position bypass at ${stage}`);
     assert.ok(!world.blocks.some(b=>overlaps(p,b)),`inside building at ${stage}: ${p.x},${p.y}`);
   }
   if(t.stage==='city_route') {finished=true;break rendering;}
  }
 }
 if(!inject)for(const phase of ['approach_drop','approach_reserve','approach_descent','approach_mega'])assert.ok(!hintDurations.has(phase)||hintDurations.get(phase)>=1.2,`walking hint flashed at ${phase}: ${hintDurations.get(phase)}`);
 assert.ok(finished,`stuck: ${t.stage}, x=${p.x}, y=${p.y}, fuel=${p.fuel}, dt=${dt}, ${variant}, ${inject}`);
 assert.deepEqual([...new Set(events)],['rebound','reserve','mega']);
 assert.equal(t.guidance.mode,'free');assert.equal(s.input.held.right,s.input.physical.right,'held D lost on transition');
 if(inject&&inject!=='fuel')assert.ok(retried,'failure did not restart');
 for(const index of [2,3,4,5]) {
   const landing=landings.find(l=>l.roof===index&&l.stage!=='rebound_flight');
   assert.ok(landing,`missing physical landing on roof ${index}`);
   const inset=landing.x-world.buildings[index].x;

   assert.ok(inset>=96&&inset<=240,`unsafe inset ${inset} on roof ${index}`);
 }
 console.log(`PASS: ${1/dt} FPS; ${variant}${inject?' / '+inject:''}; collisions, landing margin and controls`);
 return {world,p,t,s};
}
for(const dt of [1/30,1/60,1/120])run(dt);
run(1/60,'left');run(1/60,'late');run(1/60,'touch');run(1/60,'shift-first');
for(const failure of ['death','wall','wrongRoof','fuel'])run(1/60,'early',failure);
let jump=false,dash=false;
const input={held:{jump:false,dash:false,left:false,right:false},takeJump(){const q=jump;jump=false;return q},takeDash(){const q=dash;dash=false;return q}};
const clear=()=>{jump=dash=false;for(const k of Object.keys(input.held))input.held[k]=false};
// The ordinary stage2 route must reach the extension after the original discovery and dash.
const coreWorld=roofs.createRooftopWorld({tutorial:true}), corePlayer=createPlayer(coreWorld.spawn.y);
let corePending=null, core;
clear();
core=createRooftopTutorial(coreWorld,corePlayer,{clearInput:clear,onLanding(){},
  startDialogue(id){corePending=id;},closeDialogue(){corePending=null;core.onDialogueClose();}});
function coreStep(keys={}) {
  jump ||= Boolean(keys.jump&&!input.held.jump);dash ||= Boolean(keys.dash&&!input.held.dash);
  for(const k of Object.keys(input.held))input.held[k]=Boolean(keys[k]);
  core.updateZoom(1/60);
  if(!corePending&&!core.beforePhysics(input,1/60)){updatePlayer(corePlayer,coreWorld,input,1/60);core.afterPhysics();}
}
function coreUntil(stage,keys={},max=900){for(let f=0;f<max&&core.stage!==stage;f++)coreStep(keys);assert.equal(core.stage,stage);}
function coreClose(){assert.ok(corePending);corePending=null;core.onDialogueClose();clear();}
core.interact(coreWorld.npcs[0]);coreClose();
corePlayer.x=coreWorld.buildings[0].w-corePlayer.w-34;
coreStep();coreUntil('first_flight',{jump:true});coreUntil('first_dialogue');coreClose();
coreStep({jump:true});coreUntil('await_dash');coreStep({dash:true});coreUntil('final_dialogue');coreClose();
assert.equal(core.stage,'approach_drop');assert.equal(core.extended,true);assert.equal(coreWorld.allowBlast,false);
console.log('PASS: real input, early/held/touch combos, physical collisions and recovery; original cinematic preserved.');
