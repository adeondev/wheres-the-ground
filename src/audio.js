// Sistema de áudio para efeitos sonoros físicos e interações
export function createAudio() {
  let ctx = null;
  const buffers = new Map();
  const transitionSounds = [1, 2, 3, 4, 5, 7, 8, 9].map(number => `transitionClick${number}`);
  const soundPaths = {
    jump: 'assets/sounds/players/physic/jump.mp3',
    landing: 'assets/sounds/players/physic/landing.mp3',
    stepConcrete: 'assets/sounds/players/physic/step_concrete.mp3',
    dash: 'assets/sounds/players/physic/dash.mp3',
    boosterup: 'assets/sounds/players/physic/boosterup.mp3',
    dialogA: 'assets/sounds/players/dialog/a.mp3',
    dialogO: 'assets/sounds/players/dialog/o.mp3',
    momDialogPop: 'assets/sounds/npc/pop/sfx.mp3',
    powersMusic: 'assets/music/powers.mp3',
    ...Object.fromEntries([1, 2, 3, 4, 5, 7, 8, 9].map(number =>
      [`transitionClick${number}`, `assets/sounds/transition/keyClick${number}.ogg`])),
  };
  const htmlAudioFallback = {};
  let powersReady = Promise.resolve();

  let boosterSource = null;
  let boosterGain = null;
  let boosterStopTimer = null;
  let isBoosterActive = false;

  function getAudioContext() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        ctx = new AudioCtx();
      }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  // Pré-carrega os sons com Web Audio API e prepara fallback em HTMLAudioElement
  for (const [name, path] of Object.entries(soundPaths)) {
    try {
      const audio = new Audio(path);
      audio.preload = 'auto';
      htmlAudioFallback[name] = audio;
    } catch {
      // Ignora ambientes sem suporte a HTMLAudioElement
    }

    const loading = fetch(path)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then(arrayBuffer => {
        const c = getAudioContext();
        if (c) {
          return c.decodeAudioData(arrayBuffer).then(decoded => {
            buffers.set(name, decoded);
            // Se o boosterup terminou de carregar e o voo já está ativo, inicia o som
            if (name === 'boosterup' && isBoosterActive && !boosterSource) {
              startBoosterLoop();
            }
          });
        }
      })
      .catch(err => {
        console.warn(`Não foi possível pré-carregar o áudio ${name}:`, err);
      });
    if (name === 'powersMusic') powersReady = loading;
  }

  const POWERS_PEAK = 114.95;
  const POWERS_CHARGE_DURATION = 3;
  const POWERS_START = POWERS_PEAK - POWERS_CHARGE_DURATION;
  const POWERS_VOLUME = 0.32;
  const POWERS_FADE_IN = POWERS_CHARGE_DURATION * 0.8;
  let powersPosition = POWERS_START;
  let powersStartedAt = 0;
  let powersSource = null;
  let powersGain = null;
  let powersReleased = false;
  let powersFallback = null;
  let powersFades = [];

  function fadePowersFallback(audio, to, duration, onFinish = () => {}) {
    powersFades = powersFades.filter(fade => fade.audio !== audio);
    powersFades.push({ audio, from: audio.volume, to, duration, elapsed: 0, onFinish });
  }

  function updatePowersFades(dt) {
    for (let i = powersFades.length - 1; i >= 0; i--) {
      const fade = powersFades[i];
      fade.elapsed += dt;
      const progress = Math.min(1, fade.elapsed / fade.duration);
      fade.audio.volume = fade.from + (fade.to - fade.from) * progress;
      if (progress === 1) { powersFades.splice(i, 1); fade.onFinish(); }
    }
  }

  function getPowersMusicTime() {
    if (powersSource && ctx) return powersPosition + ctx.currentTime - powersStartedAt;
    const fallback = powersFallback;
    return fallback && !fallback.paused ? fallback.currentTime : powersPosition;
  }

  function playPowersMusic() {
    const c = getAudioContext();
    const buffer = buffers.get('powersMusic');
    if (powersSource) return;
    if (c && buffer) {
      const source = c.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      powersGain = c.createGain();
      powersGain.gain.setValueAtTime(0, c.currentTime);
      powersGain.gain.linearRampToValueAtTime(POWERS_VOLUME, c.currentTime + POWERS_FADE_IN);
      source.connect(powersGain);
      powersGain.connect(c.destination);
      powersStartedAt = c.currentTime;
      source.start(powersStartedAt, powersPosition % buffer.duration);
      powersSource = source;
    } else {
      if (powersFallback && !powersFallback.paused) return;
      const fallback = htmlAudioFallback.powersMusic?.cloneNode();
      if (!fallback) return;
      powersFallback = fallback;
      fallback.currentTime = powersPosition;
      fallback.volume = 0;
      fallback.loop = true;
      fallback.play().catch(error => console.warn('Erro ao tocar powers:', error));
      fadePowersFallback(fallback, POWERS_VOLUME, POWERS_FADE_IN);
    }
  }

  function setPowersCharging(active) {
    if (powersReleased) return;
    if (active) {
      setClassroomMusic(false, 0.3);
      playPowersMusic();
    } else {
      powersPosition = POWERS_START;
      if (powersSource) {
        const source = powersSource;
        const gain = powersGain;
        const now = ctx.currentTime;
        if (gain.gain.cancelAndHoldAtTime) gain.gain.cancelAndHoldAtTime(now);
        else {
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(gain.gain.value, now);
        }
        gain.gain.linearRampToValueAtTime(0, now + 0.22);
        source.onended = () => { source.disconnect(); gain.disconnect(); };
        source.stop(now + 0.22);
        powersSource = powersGain = null;
      }
      if (powersFallback) {
        const fallback = powersFallback;
        powersFallback = null;
        fadePowersFallback(fallback, 0, 0.22, () => fallback.pause());
      }
    }
  }

  function getPowersChargeProgress() {
    // A barra segue o relógio do áudio, para o disparo coincidir com 1:54.95.
    const position = getPowersMusicTime();
    if (position >= POWERS_PEAK - 0.000001) return 1;
    return Math.max(0, Math.min(1, (position - POWERS_START) / POWERS_CHARGE_DURATION));
  }

  function releasePowersMusic() {
    powersReleased = true;
    playPowersMusic(); // Continua do mesmo instante como música de fundo.
  }

  function resetPowersMusic() {
    powersReleased = false;
    setPowersCharging(false);
    powersPosition = POWERS_START;
  }

  function play(name, { volume = 1, playbackRate = 1, duration = 0 } = {}) {
    const c = getAudioContext();
    const buffer = buffers.get(name);

    if (c && buffer) {
      try {
        const source = c.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = playbackRate;

        const gainNode = c.createGain();
        gainNode.gain.value = volume;

        source.connect(gainNode);
        gainNode.connect(c.destination);

        source.start(0);
        if (duration > 0) {
          gainNode.gain.setValueAtTime(volume, c.currentTime + duration - 0.015);
          gainNode.gain.linearRampToValueAtTime(0, c.currentTime + duration);
          source.stop(c.currentTime + duration);
        }
        return;
      } catch (err) {
        console.warn(`Erro ao tocar áudio WebAudio [${name}]:`, err);
      }
    }

    // Fallback para HTMLAudioElement se o buffer ainda não estiver decodificado
    const fallback = htmlAudioFallback[name];
    if (fallback) {
      try {
        const clone = fallback.cloneNode();
        clone.volume = Math.max(0, Math.min(1, volume));
        clone.playbackRate = playbackRate;
        clone.preservesPitch = false;
        clone.play().catch(() => {});
        if (duration > 0) setTimeout(() => clone.pause(), duration * 1000);
      } catch {
        // Ignora erros de autoplay em fallback
      }
    }
  }

  function playJump() {
    const pitch = 0.98 + Math.random() * 0.04;
    play('jump', { volume: 0.85, playbackRate: pitch });
  }

  function playLanding(hard = false) {
    if (!hard) return;
    play('landing', { volume: 0.45, playbackRate: 1.05, duration: 0.28 });
  }

  function playDash(mega = false) {
    const pitch = (mega ? 0.95 : 1.32) + Math.random() * 0.06;
    play('dash', { volume: mega ? 0.7 : 0.45, playbackRate: pitch });
  }

  function playStep(surface) {
    if (surface !== 'concrete') return;
    play('stepConcrete', { volume: 0.4, playbackRate: 0.95 + Math.random() * 0.1 });
  }

  function playTransitionClick() {
    const choice = transitionSounds[Math.floor(Math.random() * transitionSounds.length)];
    play(choice, { volume: 0.22 });
  }

  function startBoosterLoop() {
    const c = getAudioContext();
    const buffer = buffers.get('boosterup');
    if (!c || !buffer) return;

    if (!boosterSource) {
      try {
        boosterSource = c.createBufferSource();
        boosterSource.buffer = buffer;
        boosterSource.loop = true;

        boosterGain = c.createGain();
        boosterGain.gain.setValueAtTime(0, c.currentTime);

        boosterSource.connect(boosterGain);
        boosterGain.connect(c.destination);

        boosterSource.start(0);
      } catch (err) {
        console.warn('Erro ao iniciar loop do booster:', err);
        return;
      }
    }

    if (boosterGain) {
      const now = c.currentTime;
      boosterGain.gain.cancelScheduledValues(now);
      boosterGain.gain.setValueAtTime(boosterGain.gain.value, now);
      // Fade-in dinâmico (~0.07s) com volume mais suave
      boosterGain.gain.linearRampToValueAtTime(0.35, now + 0.07);
    }
  }

  function stopBoosterLoop() {
    const c = getAudioContext();
    if (c && boosterGain) {
      const now = c.currentTime;
      boosterGain.gain.cancelScheduledValues(now);
      boosterGain.gain.setValueAtTime(boosterGain.gain.value, now);
      // Fade-out suave (~0.12s)
      boosterGain.gain.linearRampToValueAtTime(0.0001, now + 0.12);

      if (boosterStopTimer) clearTimeout(boosterStopTimer);
      boosterStopTimer = setTimeout(() => {
        if (!isBoosterActive && boosterSource) {
          try {
            boosterSource.stop();
          } catch {}
          try {
            boosterSource.disconnect();
          } catch {}
          boosterSource = null;
          boosterGain = null;
        }
      }, 140);
    }

    const fallback = htmlAudioFallback.boosterup;
    if (fallback) {
      try {
        fallback.pause();
        fallback.currentTime = 0;
      } catch {}
    }
  }

  function updateBooster(active) {
    if (active === isBoosterActive) return;
    isBoosterActive = Boolean(active);

    if (isBoosterActive) {
      if (boosterStopTimer) {
        clearTimeout(boosterStopTimer);
        boosterStopTimer = null;
      }
      startBoosterLoop();

      // Fallback para HTMLAudioElement se Web Audio ainda não tiver o buffer
      if (!buffers.has('boosterup') && htmlAudioFallback.boosterup) {
        try {
          htmlAudioFallback.boosterup.loop = true;
          htmlAudioFallback.boosterup.volume = 0.35;
          htmlAudioFallback.boosterup.play().catch(() => {});
        } catch {}
      }
    } else {
      stopBoosterLoop();
    }
  }

  let currentDialogSource = null;
  let currentDialogGain = null;
  let dialogFallbackTimer = null;
  const dialogueVoices = {
    gabriel: { sounds: ['dialogA', 'dialogO'], pitch: 0.92, variation: 0.24 },
    mom: { sounds: ['momDialogPop'], pitch: 1.04, variation: 0.24 },
    milenio: { sounds: ['momDialogPop'], pitch: 0.9, variation: 0.16 },
    policial: { sounds: ['momDialogPop'], pitch: 0.78, variation: 0.1 },
  };

  function stopDialogBlip() {
    if (dialogFallbackTimer) clearTimeout(dialogFallbackTimer);
    dialogFallbackTimer = null;
    const c = getAudioContext();
    if (currentDialogGain && c) {
      try {
        const now = c.currentTime;
        currentDialogGain.gain.cancelScheduledValues(now);
        currentDialogGain.gain.setValueAtTime(currentDialogGain.gain.value, now);
        currentDialogGain.gain.linearRampToValueAtTime(0.0001, now + 0.015);
      } catch {}
    }
    if (currentDialogSource) {
      const src = currentDialogSource;
      currentDialogSource = null;
      currentDialogGain = null;
      try {
        if (c) {
          src.stop(c.currentTime + 0.02);
        } else {
          src.stop();
        }
      } catch {}
    }
    for (const key of Object.values(dialogueVoices).flatMap(voice => voice.sounds)) {
      const a = htmlAudioFallback[key];
      if (a) {
        try { a.pause(); a.currentTime = 0; } catch {}
      }
    }
  }

  function playDialogBlip(voiceName = 'gabriel') {
    stopDialogBlip();
    const c = getAudioContext();
    const voice = dialogueVoices[voiceName] ?? dialogueVoices.gabriel;
    const list = voice.sounds;
    const choice = list[Math.floor(Math.random() * list.length)];
    const buffer = buffers.get(choice);
    const pitch = voice.pitch + Math.random() * voice.variation;

    if (c && buffer) {
      try {
        const source = c.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = pitch;

        const gainNode = c.createGain();
        const now = c.currentTime;
        const volume = 0.45;
        gainNode.gain.setValueAtTime(volume, now);
        // Cada letra dura no máximo ~0.065s com fade rápido, evitando sons longos ou arrastados
        gainNode.gain.setValueAtTime(volume, now + 0.05);
        gainNode.gain.linearRampToValueAtTime(0.0001, now + 0.07);

        source.connect(gainNode);
        gainNode.connect(c.destination);

        source.start(now);
        source.stop(now + 0.075);

        currentDialogSource = source;
        currentDialogGain = gainNode;
        return;
      } catch (err) {
        console.warn('Erro ao tocar blip:', err);
      }
    }

    const fallback = htmlAudioFallback[choice];
    if (fallback) {
      try {
        fallback.currentTime = 0;
        fallback.volume = 0.4;
        fallback.playbackRate = pitch;
        fallback.preservesPitch = false;
        fallback.play().catch(() => {});
        dialogFallbackTimer = setTimeout(() => {
          dialogFallbackTimer = null;
          try { fallback.pause(); fallback.currentTime = 0; } catch {}
        }, 65);
      } catch {}
    }
  }

  const classroomMusic = new Audio('assets/music/wheres-everyone.mp3');
  classroomMusic.preload = 'auto';
  classroomMusic.loop = true;
  classroomMusic.volume = 0;
  let classroomMusicActive = false;
  let classroomFade = null;

  function playClassroomMusic() {
    classroomMusic.play().catch(error => {
      if (error.name !== 'NotAllowedError') console.warn('Erro ao tocar música da sala:', error);
    });
  }

  function setClassroomMusic(active, duration = 0.8) {
    if (classroomMusicActive === active) return;
    classroomMusicActive = active;
    classroomFade = { from: classroomMusic.volume, to: active ? 0.55 : 0,
      elapsed: 0, duration: Math.max(0, duration) };
    if (active) playClassroomMusic();
  }

  function updateClassroomMusic(dt) {
    updatePowersFades(dt);
    if (!classroomFade) return;
    const fade = classroomFade;
    fade.elapsed += dt;
    const progress = fade.duration > 0 ? Math.min(1, fade.elapsed / fade.duration) : 1;
    const smooth = progress * progress * (3 - 2 * progress);
    classroomMusic.volume = fade.from + (fade.to - fade.from) * smooth;
    if (progress === 1) {
      classroomFade = null;
      if (!classroomMusicActive) {
        classroomMusic.pause();
        classroomMusic.currentTime = 0;
      }
    }
  }

  let introMusic = null;

  function startIntroMusic({ startTime = 84.0, fadeInDuration = 3.0, targetVolume = 0.8 } = {}) {
    setClassroomMusic(false);
    stopIntroMusic(0);
    try {
      introMusic = new Audio('assets/music/wheres-the-ground-introduction.mp3');
      introMusic.volume = fadeInDuration > 0 ? 0 : targetVolume;

      let timeSet = false;
      const setTime = () => {
        if (timeSet || !introMusic) return;
        try {
          introMusic.currentTime = startTime;
          timeSet = true;
        } catch {}
      };

      introMusic.addEventListener('loadedmetadata', setTime, { once: true });
      introMusic.addEventListener('canplay', setTime, { once: true });

      introMusic.play().then(() => {
        setTime();
      }).catch(err => {
        if (err.name !== 'NotAllowedError') console.warn('Erro ao reproduzir música de introdução:', err);
      });

      if (fadeInDuration > 0) {
        const step = 0.05;
        const inc = targetVolume / (fadeInDuration / step);
        const timer = setInterval(() => {
          if (!introMusic) {
            clearInterval(timer);
            return;
          }
          if (introMusic.volume + inc < targetVolume) {
            introMusic.volume += inc;
          } else {
            introMusic.volume = targetVolume;
            clearInterval(timer);
          }
        }, step * 1000);
      }
    } catch (e) {
      console.warn('Erro ao instanciar música de introdução:', e);
    }
  }

  function getIntroMusicTime() {
    return introMusic ? introMusic.currentTime : 0;
  }

  function isIntroMusicPlaying() {
    return Boolean(introMusic && !introMusic.paused && !introMusic.ended);
  }

  function resumeIntroMusicAt(seconds) {
    if (!introMusic || !introMusic.paused) return;
    try {
      introMusic.currentTime = Math.max(0, Math.min(introMusic.duration || 999, seconds));
    } catch {}
    introMusic.play().catch(err => {
      if (err.name !== 'NotAllowedError') console.warn('Erro ao retomar música de introdução:', err);
    });
  }

  function setIntroMusicTime(seconds) {
    if (introMusic) {
      try {
        introMusic.currentTime = Math.max(0, Math.min(introMusic.duration || 999, seconds));
      } catch {}
    }
  }

  function stopIntroMusic(fadeDuration = 0) {
    if (!introMusic) return;
    const m = introMusic;
    introMusic = null;
    if (fadeDuration > 0) {
      const step = 0.05;
      const initialVol = m.volume;
      const dec = initialVol / (fadeDuration / step);
      const timer = setInterval(() => {
        if (m.volume > dec) {
          m.volume -= dec;
        } else {
          clearInterval(timer);
          try {
            m.pause();
            m.currentTime = 0;
          } catch {}
        }
      }, step * 1000);
    } else {
      try {
        m.pause();
        m.currentTime = 0;
      } catch {}
    }
  }

  const unlockAudio = () => {
    getAudioContext();
    if (classroomMusicActive && classroomMusic.paused) playClassroomMusic();
  };
  window.addEventListener('keydown', unlockAudio, { passive: true });
  window.addEventListener('pointerdown', unlockAudio, { passive: true });

  function playPhoneRing() {
    const ctx = getAudioContext(); if (!ctx) return;
    for (const offset of [0, .13, .4, .53]) {
      const gain = ctx.createGain(); gain.connect(ctx.destination);
      const start = ctx.currentTime + offset;
      gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.022, start + .008);
      gain.gain.exponentialRampToValueAtTime(.001, start + .1);
      for (const frequency of [660, 880]) {
        const tone = ctx.createOscillator(); tone.type = 'sine'; tone.frequency.value = frequency;
        tone.connect(gain); tone.start(start); tone.stop(start + .11);
      }
    }
  }
  return {
    playPhoneRing,
    playJump,
    playLanding,
    playDash,
    playStep,
    playTransitionClick,
    setClassroomMusic,
    updateClassroomMusic,
    updateBooster,
    playDialogBlip,
    stopDialogBlip,
    startIntroMusic,
    getIntroMusicTime,
    isIntroMusicPlaying,
    resumeIntroMusicAt,
    setIntroMusicTime,
    stopIntroMusic,
    powersReady,
    setPowersCharging,
    getPowersChargeProgress,
    getPowersMusicTime,
    releasePowersMusic,
    resetPowersMusic,
  };
}
