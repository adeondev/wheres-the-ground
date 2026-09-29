const MAX_OFFSET = 9;
const BOOST_ZOOM = 0.055;
const BOOST_ZOOM_DURATION = 0.32;

export function createCameraEffects() {
  const impulses = [];
  let zoomRemaining = 0;
  let x = 0;
  let y = 0;
  let zoom = 1;
  let chargeShake = 0;
  let chargeTime = 0;
  let roofShake = 0;

  function setChargeShake(progress) {
    const buildup = Math.max(0, Math.min(1, (progress - 0.5) / 0.5));
    chargeShake = buildup * buildup * 4;
  }

  function kick(horizontal, vertical, duration) {
    impulses.push({ horizontal, vertical, duration, remaining: duration });
  }

  function pulseZoom() {
    zoomRemaining = BOOST_ZOOM_DURATION;
  }

  function update(dt) {
    chargeTime += dt;
    let nextX = Math.sin(chargeTime * 73) * chargeShake + Math.sin(chargeTime * 61) * roofShake;
    let nextY = Math.sin(chargeTime * 91 + 0.8) * chargeShake * 0.65 + Math.sin(chargeTime * 79) * roofShake * .7;
    for (let i = impulses.length - 1; i >= 0; i--) {
      const impulse = impulses[i];
      impulse.remaining -= dt;
      if (impulse.remaining <= 0) {
        impulses.splice(i, 1);
        continue;
      }
      const fade = impulse.remaining / impulse.duration;
      const jitter = () => (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.5);
      nextX += jitter() * impulse.horizontal * fade;
      nextY += jitter() * impulse.vertical * fade;
    }
    x = Math.round(Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, nextX)));
    y = Math.round(Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, nextY)));

    zoomRemaining = Math.max(0, zoomRemaining - dt);
    if (zoomRemaining > 0) {
      const progress = 1 - zoomRemaining / BOOST_ZOOM_DURATION;
      const rise = Math.min(1, progress / 0.18);
      const fall = Math.max(0, 1 - Math.max(0, progress - 0.18) / 0.82);
      zoom = 1 + BOOST_ZOOM * rise * fall * fall;
    } else {
      zoom = 1;
    }
  }

  function clear() {
    impulses.length = 0;
    zoomRemaining = 0;
    x = 0;
    y = 0;
    zoom = 1;
    chargeShake = 0;
    roofShake = 0;
  }

  return { kick, pulseZoom, setChargeShake, setRoofShake: strength => { roofShake = Math.min(1, strength) * 1.5; }, update, clear,
    get x() { return x; }, get y() { return y; }, get zoom() { return zoom; } };
}
