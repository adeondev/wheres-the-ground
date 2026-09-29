import { PLAYER } from './config.js';
import { updatePlayer } from './player.js?v=route-obstacles';
const MOVE = ['a','d','arrowleft','arrowright'];
const APPROACH = {approach_drop:[1,'drop'],approach_reserve:[2,'reserve_launch'],
  approach_descent:[3,'descent'],approach_mega:[4,'mega_launch']};
const ACTIONS = {
  drop:['Pule para o telhado abaixo',['ESPAÇO'],'drop_flight'],
  rebound:['Aproveite o pouso',['ESPAÇO'],'rebound_flight'],
  reserve_launch:['Suba até a torre',['ESPAÇO'],'reserve_climb'],
  reserve:['Use a reserva',['ESPAÇO'],'reserve_recover'],
  descent:['Desça ao próximo telhado',['ESPAÇO'],'descent_flight'],
  mega_launch:['Ganhe altura',['ESPAÇO'],'mega_climb'],
  mega:['Carregue o impulso',['SHIFT','ESPAÇO'],'mega_cross'],
};
export function createRooftopPowerTutorial(world, player, {onPower=()=>{}}={}) {
  world.allowPowers=true;world.allowBlast=world.allowTools=false;
  let phase='approach_drop',pause=null,flight=null,retry=null,safe=null,furthestRoof=1;
  let burstTime=-1,notice=null,noticeTime=0,hintAge=0,lastHintId=null,autoJump=false,autoDash=false,lastInput=null;
  const roof=i=>world.buildings[i];
  const roofIndex=()=>world.buildings.findIndex(b=>player.x+player.w/2>=b.x&&player.x+player.w/2<b.x+b.w);
  const physical=()=>lastInput?.physical??lastInput?.held??{};
  function snapshot(kind=null) {
    safe={player:structuredClone(player),checkpoint:structuredClone(world.checkpoint),phase,kind};
  }
  snapshot();
  function clearSignals() {
    for(const key of ['jumpStarted','boostStarted','dashStarted','landed','landedHard','reserveStarted','reboundStarted','megaStarted','respawned'])player[key]=false;
  }
  function stop(kind, settling=false) {
    if(settling){player.facing=player.turnFromFacing=1;player.turnSquashTime=0;}
    pause={kind,settling,elapsed:0,releaseJump:Boolean(physical().jump),releaseDash:kind==='mega'&&Boolean(physical().dash),pending:false};
    hintAge=0;
    if(player.onGround)snapshot(kind);
  }
  function recover() {if(!retry){retry={elapsed:0,restored:false};pause=null;flight=null;notice=null;}}
  function restore() {
    Object.assign(player,structuredClone(safe.player));world.checkpoint=structuredClone(safe.checkpoint);
    phase=safe.phase;pause=null;flight=null;autoJump=autoDash=false;clearSignals();
    if(safe.kind)stop(safe.kind);
    player.respawned=true;
    notice='Vamos tentar de novo';noticeTime=2;hintAge=0;
  }
  function signals() {
    for(const kind of ['rebound','reserve','mega'])if(player[`${kind}Started`]){if(kind!=='reserve')burstTime=0;onPower(kind);if(flight)flight.fired=true;}
  }
  function physics(keys,dt,assistance=null) {
    const jumpPressed=Boolean(keys.jump&&!autoJump),dashPressed=Boolean(keys.dash&&!autoDash);
    autoJump=Boolean(keys.jump);autoDash=Boolean(keys.dash);
    updatePlayer(player,world,{held:{left:false,right:false,jump:false,dash:false,...keys},
      takeJump:()=>jumpPressed,takeDash:()=>dashPressed,assistance},dt);
    signals();
  }
  function start(kind) {
    pause=null;phase=ACTIONS[kind][2];autoJump=autoDash=false;
    const targets={drop:2,rebound:2,reserve_launch:3,reserve:3,descent:4,mega_launch:5,mega:5};
    flight={kind,target:targets[kind],elapsed:0,stalled:0,offset:0,fired:false};hintAge=0;
  }
  function timeToLand(targetY,boostSeconds=0) {
    let feet=player.y+player.h,vy=player.vy;
    for(let t=1/120;t<6;t+=1/120) {
      if(t<=boostSeconds)vy=-world.powers.boostCruise;
      else vy=Math.min(420,vy+PLAYER.gravity/120);
      feet+=vy/120;
      if(vy>0&&feet>=targetY)return t;
    }
    return null;
  }
  function steer(dt) {
    flight.offset=Math.max(-24,Math.min(24,flight.offset+(Number(lastInput.held.right)-Number(lastInput.held.left))*20*dt));
    const target=roof(flight.target);
    let inset=160;
    if(flight.kind==='rebound')inset=Math.min(target.w-120,player.takeoffGroundY===target.y?560:480);
    const remainingBoost=['drop','descent'].includes(flight.kind)?Math.max(0,.25-flight.elapsed):0;
    const time=timeToLand(target.y,remainingBoost);
    const max=flight.kind==='mega'?world.powers.megaSpeed:world.moveSpeed;
    const velocity=time?Math.max(0,Math.min(max,(target.x+inset+flight.offset-player.x)/Math.max(.12,time))):world.moveSpeed;
    return {velocityX:velocity,acceleration:180};
  }
  function finish(next,message) {
    flight=null;phase=next;notice=message;noticeTime=2;hintAge=0;
    if(player.onGround){snapshot();furthestRoof=Math.max(furthestRoof,roofIndex());}
  }
  function runFlight(dt) {
    const f=flight;f.elapsed+=dt;
    const previous={x:player.x,y:player.y};
    const keys={right:true,jump:false,dash:false};
    if(['drop','descent'].includes(f.kind))keys.jump=f.elapsed<=.25+1e-8;
    else if(f.kind==='rebound')keys.jump=f.elapsed<=dt+1e-8;
    else if(['reserve_launch','reserve','mega_launch'].includes(f.kind))keys.jump=true;
    else if(f.kind==='mega') {
      const combo=!player.airDashUsed&&!player.megaCharging;
      keys.jump=combo||player.megaCharging||player.dashCooldown<=0;
      keys.dash=combo||player.megaCharging;
    }
    const direction=Number(lastInput.held.right)-Number(lastInput.held.left);
    const assistance=f.kind==='reserve_launch'||f.kind==='mega_launch'
      ? {velocityX:world.moveSpeed+direction*20,acceleration:180}:steer(dt);
    physics(keys,dt,assistance);
    f.stalled=Math.hypot(player.x-previous.x,player.y-previous.y)<.05?f.stalled+dt:0;
    if(player.respawned||f.elapsed>8||f.stalled>1){recover();return;}
    if(f.kind==='reserve_launch'&&player.fuel<=0&&player.vy>0&&player.reserveReady){stop('reserve');return;}
    if(f.kind==='mega_launch'&&player.takeoffGroundY-player.y-player.h>=420&&player.fuel>=world.powers.megaCost){stop('mega');return;}
    if(!player.landed)return;
    if(roofIndex()!==f.target||!['drop','descent','rebound','reserve','mega'].includes(f.kind)||
        ['rebound','reserve','mega'].includes(f.kind)&&!f.fired){recover();return;}
    if(f.kind==='drop'){finish('rebound_ready',null);stop('rebound');}
    else if(f.kind==='rebound')finish('approach_reserve','Isso! Impulso no pouso');
    else if(f.kind==='reserve')finish('approach_descent','Reserva utilizada');
    else if(f.kind==='descent')finish('approach_mega',null);
    else finish('city_route','Boa! Agora é com você');
  }
  function walkingHintVisible() {
    const approach=APPROACH[phase];
    if(!approach||noticeTime>0&&notice)return false;
    const b=roof(approach[0]);
    const endX=b.x+b.w-player.w-(approach[1]==='mega_launch'?8:104);
    // Don't introduce a walking instruction that would immediately be replaced by the action.
    return player.x>=b.x+b.w-900&&(lastHintId===phase||endX-player.x>=world.moveSpeed*1.75);
  }
  function state() {
    const mode=retry?'retry':pause?'pause':flight?'assist':phase==='city_route'?'free':'walk';
    const kind=pause?.kind;
    let hint=null;
    if(pause)hint={text:pause.releaseJump?'Solte Espaço':pause.releaseDash?'Solte Shift':ACTIONS[kind][0],
      keys:pause.releaseJump||pause.releaseDash?[]:ACTIONS[kind][1],alpha:Math.min(1,pause.elapsed/.25),pressed:pause.pending};
    else if(noticeTime>0&&notice)hint={text:notice,keys:[],alpha:lastHintId===notice?Math.min(1,hintAge/.25,noticeTime/.2):0};
    else if(mode==='walk'&&walkingHintVisible())
      hint={text:'Vá até a ponta',keys:[],alpha:lastHintId===phase?Math.min(1,hintAge/.25):0};
    return {mode,allowedKeys:mode==='retry'?[]:mode==='free'?null:mode==='pause'?(kind==='mega'?[' ','shift']:[' ']):MOVE,
      hint,fade:retry?Math.max(0,1-Math.abs(retry.elapsed-.09)/.09):0};
  }
  return {
    get state(){return state()},
    get stage(){return retry?'retry':pause?`${pause.kind}_pause`:phase==='city_route'&&furthestRoof>=10?'complete':phase},
    get extended(){return true},get onlySpace(){return Boolean(pause)&&pause.kind!=='mega'},get onlyCombo(){return pause?.kind==='mega'},
    get controlsLocked(){return Boolean(retry)},get allowedKeys(){return state().allowedKeys},
    get showChargeBar(){return player.megaCharging},get charge(){return player.megaCharging?1-player.megaChargeTime/world.powers.megaChargeDuration:0},
    get preparation(){return false},get reserveCue(){return pause?.kind==='reserve'},get reboundCue(){return pause?.kind==='rebound'},
    get pose(){return pause&&!pause.settling?{sprite:player.onGround?'landing':'jump',frame:0}:null},get burstTime(){return burstTime},get prompt(){return ''},
    update(dt){
      noticeTime=Math.max(0,noticeTime-dt);if(pause)pause.elapsed+=dt;
      const near=walkingHintVisible();
      const hintId=pause?.kind??(noticeTime>0&&notice?notice:near?phase:null);
      if(hintId!==lastHintId){hintAge=0;lastHintId=hintId;}else hintAge+=dt;
      if(burstTime>=0){burstTime+=dt;if(burstTime>.6)burstTime=-1}
    },
    onDialogueClose(){return false},
    beforePhysics(input,dt) {
      lastInput=input;
      if(retry){clearSignals();player.boosting=false;retry.elapsed+=dt;if(retry.elapsed>=.09&&!retry.restored){restore();retry.restored=true;}if(retry.elapsed>=.18)retry=null;return true;}
      if(pause) {
        if(pause.settling) {
          physics({},dt);
          if(Math.abs(player.vx)<.01){pause.settling=false;snapshot(pause.kind);}
        } else if(player.onGround)player.fuel=Math.min(PLAYER.maxFuel,player.fuel+world.powers.refill*dt);
        clearSignals();player.boosting=false;
        const raw=input.physical??input.held;
        if(!raw.jump)pause.releaseJump=false;if(!raw.dash)pause.releaseDash=false;
        const jump=input.takeJump(),dash=input.takeDash();
        if(!pause.releaseJump&&!pause.releaseDash&&(pause.kind==='mega'?raw.jump&&raw.dash&&(jump||dash):jump))pause.pending=true;
        const fueled=!['reserve_launch','mega_launch'].includes(pause.kind)||player.fuel>=99;
        if(pause.pending&&pause.elapsed>=.25&&!pause.settling&&fueled)start(pause.kind);
        return true;
      }
      if(flight){runFlight(dt);return true;}
      if(phase==='city_route')return false;
      const [index,kind]=APPROACH[phase]??[];
      if(index===undefined){recover();return true;}
      const startX=roof(index).x+48,endX=roof(index).x+roof(index).w-player.w-(kind==='mega_launch'?8:104);
      let left=input.held.left,right=input.held.right;
      if(player.x<=startX&&left)left=false;
      const coast=player.landSlideTime>0?PLAYER.slideCoast:PLAYER.groundCoast;
      const stoppingDistance=Math.max(0,player.vx*player.vx/(2*coast)-player.vx*dt/2);
      if(player.onGround&&player.vx>0&&player.x>=endX-stoppingDistance) {
        stop(kind,true);
        return true;
      }
      physics({left,right},dt);
      if(player.respawned||!player.onGround||roofIndex()!==index){recover();return true;}
      if(player.x>=endX)stop(kind,true);
      return true;
    },
    afterPhysics(){if(phase==='city_route'){signals();if(player.onGround)furthestRoof=Math.max(furthestRoof,roofIndex())}},
  };
}
