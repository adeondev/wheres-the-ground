export function createInput() {
  const held = { left: false, right: false, jump: false, dash: false, interact: false };
  const physical = { ...held };
  const sources = new Map();
  let jumpQueued=false, dashQueued=false, blastQueued=null, talkQueued=false,
    crtQueued=false, introQueued=false, interactQueued=false;
  let allowedKeys=null, allowedControls=null, signature='all';
  const bindings={a:'left',arrowleft:'left',d:'right',arrowright:'right',w:'jump',arrowup:'jump',' ':'jump',
    shift:'dash',j:'blast',t:'talk',c:'crt',h:'intro',z:'interact',enter:'interact'};
  const allowed = control => !allowedControls || allowedControls.has(control);
  function sync() {
    for(const control of Object.keys(physical)) {
      physical[control]=[...sources.values()].some(value=>value===control);
      held[control]=allowed(control) && [...sources].some(([source,value]) => value===control &&
        (!source.startsWith('key:') || !allowedKeys || allowedKeys.has(source.slice(4))));
    }
  }
  function press(control,source,key=null) {
    if(sources.has(source))return;
    const wasDown=physical[control];
    sources.set(source,control);sync();
    if(!allowed(control)||(key!==null&&allowedKeys&&!allowedKeys.has(key))||wasDown)return;
    if(control==='jump')jumpQueued=true;
    else if(control==='dash')dashQueued=true;
    else if(control==='blast')blastQueued={};
    else if(control==='talk')talkQueued=true;
    else if(control==='crt')crtQueued=true;
    else if(control==='intro')introQueued=true;
    else if(control==='interact')interactQueued=true;
  }
  function release(source) {sources.delete(source);sync();}
  function clear() {
    for(const key of Object.keys(held))held[key]=false;
    jumpQueued=dashQueued=talkQueued=crtQueued=introQueued=interactQueued=false;blastQueued=null;
  }
  window.addEventListener('keydown',event=>{
    const key=event.key.toLowerCase(),control=bindings[key];if(!control)return;
    event.preventDefault();if(!event.repeat)press(control,`key:${key}`,key);
  });
  window.addEventListener('keyup',event=>release(`key:${event.key.toLowerCase()}`));
  window.addEventListener('blur',()=>{sources.clear();sync();clear();});
  for(const button of document.querySelectorAll('[data-key]')) {
    button.addEventListener('pointerdown',event=>{
      event.preventDefault();button.setPointerCapture(event.pointerId);
      press(button.dataset.key,`pointer:${event.pointerId}`);
    });
    const end=event=>release(`pointer:${event.pointerId}`);
    button.addEventListener('pointerup',end);button.addEventListener('pointercancel',end);
    button.addEventListener('lostpointercapture',end);
  }
  return {held,physical,
    reset(){sources.clear();sync();clear();},
    setAllowedKeys(keys=null) {
      const next=keys?[...keys].sort().join('|'):'all';if(next===signature)return;
      signature=next;allowedKeys=keys?new Set(keys):null;
      allowedControls=keys?new Set(keys.map(key=>bindings[key])):null;sync();
      if(!allowed('jump'))jumpQueued=false;if(!allowed('dash'))dashQueued=false;
      if(!allowed('blast'))blastQueued=null;if(!allowed('talk'))talkQueued=false;
      if(!allowed('crt'))crtQueued=false;if(!allowed('intro'))introQueued=false;
      if(!allowed('interact'))interactQueued=false;
    },
    takeJump(){const q=jumpQueued;jumpQueued=false;return q},
    takeDash(){const q=dashQueued;dashQueued=false;return q},
    takeBlast(){const q=blastQueued;blastQueued=null;return q},
    takeTalk(){const q=talkQueued;talkQueued=false;return q},
    takeCrt(){const q=crtQueued;crtQueued=false;return q},
    takeIntro(){const q=introQueued;introQueued=false;return q},
    takeInteract(){const q=interactQueued;interactQueued=false;return q},clear,
  };
}
