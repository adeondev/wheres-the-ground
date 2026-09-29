import assert from 'node:assert/strict';
globalThis.Image = class { set src(path) { this.onload(); } };
const { drawHelicopter, helicopterPatrolPose, helicopterSocket } = await import('../src/helicopters.js');
for (const fps of [30, 60, 120]) {
  for (const side of [0, 1]) {
    const light = {x:600,side,phase:0,time:0,building:{y:500}};
    let previous=helicopterPatrolPose(light);
    for (let i=1;i<=fps*20;i++) {
      light.time=i/fps;
      const pose=helicopterPatrolPose(light), socket=helicopterSocket(pose,2.6);
      assert.ok(Math.hypot(pose.x-previous.x,pose.y-previous.y)<60/fps,'patrol must remain continuous');
      assert.equal(pose.facing,previous.facing,'hovering must not mirror or squeeze the sprite at each reversal');
      assert.ok(Math.abs(pose.bank-previous.bank)<.03/fps,'bank must change smoothly');
      assert.ok((socket.x-pose.x)*pose.facing>60,'light must originate at the nose in both directions');
      assert.ok(Math.abs(socket.y-pose.y)<12,'light must stay attached to the front while banking');
      const scales=[];
      const ctx={globalAlpha:1,save(){},restore(){},translate(){},rotate(){},scale(x,y){scales.push([x,y]);},drawImage(){}};
      drawHelicopter(ctx,pose.x,pose.y,light.time,{...pose,scale:2.6});
      assert.deepEqual(scales,[[pose.facing*2.6,2.6]],'sprite proportions must remain unchanged through patrol');
      assert.ok(!ctx.filter.includes('blur'));
      previous=pose;
    }
  }
  console.log(`PASS: ${fps} FPS; stable sprite proportions, smooth patrol and nose-mounted light in both directions.`);
}
