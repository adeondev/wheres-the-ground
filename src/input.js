export function createInput() {
  const held = { left: false, right: false, jump: false };
  let jumpQueued = false;
  let dashQueued = false;
  let blastQueued = null;
  let talkQueued = false;
  let crtQueued = false;
  let introQueued = false;

  const bindings = {
    a: 'left', arrowleft: 'left',
    d: 'right', arrowright: 'right',
    w: 'jump', arrowup: 'jump', ' ': 'jump',
    shift: 'dash', j: 'blast', t: 'talk', c: 'crt',
    h: 'intro',
  };

  function press(control) {
    if (control === 'jump') {
      if (!held.jump) jumpQueued = true;
      held.jump = true;
    }
    else if (control === 'dash') dashQueued = true;
    else if (control === 'blast') blastQueued = {};
    else if (control === 'talk') talkQueued = true;
    else if (control === 'crt') crtQueued = true;
    else if (control === 'intro') introQueued = true;
    else held[control] = true;
  }

  function release(control) {
    if (control in held) held[control] = false;
  }

  window.addEventListener('keydown', event => {
    const control = bindings[event.key.toLowerCase()];
    if (!control) return;
    event.preventDefault();
    if (!event.repeat) press(control);
  });
  window.addEventListener('keyup', event => {
    const control = bindings[event.key.toLowerCase()];
    if (control) release(control);
  });
  function clear() {
    for (const key of Object.keys(held)) held[key] = false;
    jumpQueued = false;
    dashQueued = false;
    blastQueued = null;
    talkQueued = false;
    crtQueued = false;
    introQueued = false;
  }
  window.addEventListener('blur', clear);

  for (const button of document.querySelectorAll('[data-key]')) {
    const control = button.dataset.key;
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      press(control);
    });
    const end = () => release(control);
    button.addEventListener('pointerup', end);
    button.addEventListener('pointercancel', end);
    button.addEventListener('lostpointercapture', end);
  }

  return {
    held,
    takeJump() { const queued = jumpQueued; jumpQueued = false; return queued; },
    takeDash() { const queued = dashQueued; dashQueued = false; return queued; },
    takeBlast() { const queued = blastQueued; blastQueued = null; return queued; },
    takeTalk() { const queued = talkQueued; talkQueued = false; return queued; },
    takeCrt() { const queued = crtQueued; crtQueued = false; return queued; },
    takeIntro() { const queued = introQueued; introQueued = false; return queued; },
    clear,
  };
}
