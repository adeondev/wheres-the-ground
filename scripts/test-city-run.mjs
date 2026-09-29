import assert from 'node:assert/strict';
import { createCityRun, formatRunTime, drawCityRunHud } from '../src/cityRun.js';

const world = { runStartX: 100, finishX: 1000, buildings: [{x:900, y:320, w:240}] };
const player = {x:100, y:200, w:28, h:48, onGround:false};
for(const fps of [30,60,120]) {
  let starts=0;
  const run=createCityRun(world,{onStart:()=>starts++});
  run.update(5,player);
  assert.equal(run.state.started,false,'timer must wait for the final lesson');
  assert.equal(starts,0,'music must keep playing during the lessons');
  for(let frame=0;frame<fps*2;frame++)run.update(1/fps,player,{free:true});
  assert.ok(Math.abs(run.state.elapsed-2)<1e-8);
  run.update(3,player,{free:true,paused:true});
  assert.ok(Math.abs(run.state.elapsed-2)<1e-8,'pause must not consume time');
  player.x=700;run.update(1/fps,player,{free:true});
  assert.ok(run.state.progress>.6);
  player.x=200;run.update(1/fps,player,{free:true});
  assert.ok(run.state.progress<.2,'marker follows actual position after a retry');
  player.x=1000;run.update(1/fps,player,{free:true});
  assert.equal(run.state.finished,false,'flying over the goal does not finish the run');
  player.onGround=true;player.y=272;run.update(1/fps,player,{free:true});
  assert.equal(run.state.finished,true);
  assert.equal(starts,1,'tutorial completion must stop music exactly once');
  const finalTime=run.state.elapsed;run.update(5,player,{free:true});
  assert.equal(run.state.elapsed,finalTime);
  assert.equal(run.state.progress,1);
  assert.equal(createCityRun(world).state.elapsed,0,'new stage resets the clock');
  Object.assign(player,{x:100,y:200,onGround:false});
}
for(const fps of [30,60,120]) {
  let starts=0;const run=createCityRun(world,{onStart:()=>starts++});
  assert.equal(run.state.remaining,240,'the route must start with four minutes');
  const waiting={x:100,y:200,w:28,h:48,onGround:false};
  for(let i=0;i<fps*150;i++)run.update(1/fps,waiting,{free:true});
  assert.equal(run.state.expired,false,'the old 2:30 limit must no longer restart the route');
  for(let i=0;i<fps*90;i++)run.update(1/fps,waiting,{free:true});
  assert.equal(run.state.expired,true,'4:00 must expire at every frame rate');
  assert.ok(run.state.remaining<1e-6);
  const frozen=run.state.elapsed;run.update(20,waiting,{free:true});assert.equal(run.state.elapsed,frozen);
  assert.equal(starts,1);
}
assert.equal(formatRunTime(65.27),'01:05.27');
// Every rectangle must remain inside the narrow viewport as well as the desktop one.
for(const width of [112,480]) {
  const ctx={save(){},restore(){},fillRect(x,y,w,h){assert.ok(x>=0&&x+w<=width&&w>=0&&h>=0);}};
  drawCityRunHud(ctx,{elapsed:12.5,progress:.5,finished:false},width,()=>{});
}
console.log('PASS: route clock at 30/60/120 FPS, pauses, retries, goal landing and responsive HUD.');
