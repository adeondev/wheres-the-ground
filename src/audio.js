// Sistema de áudio para efeitos sonoros físicos e interações
export function createAudio() {
  let ctx = null;
  const buffers = new Map();
  const soundPaths = {
    jump: 'assets/sounds/players/physic/jump.mp3',
    landing: 'assets/sounds/players/physic/landing.mp3',
    dash: 'assets/sounds/players/physic/dash.mp3',
    boosterup: 'assets/sounds/players/physic/boosterup.mp3',
    dialogA: 'assets/sounds/players/dialog/a.mp3',
    dialogI: 'assets/sounds/players/dialog/i.mp3',
    dialogO: 'assets/sounds/players/dialog/o.mp3',
  };
  const htmlAudioFallback = {};

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

    fetch(path)
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
  }

  function play(name, { volume = 1, playbackRate = 1 } = {}) {
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
        clone.play().catch(() => {});
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
    const volume = hard ? 0.95 : 0.65;
    const pitch = hard ? 0.95 : 1.05;
    play('landing', { volume, playbackRate: pitch });
  }

  function playDash() {
    const pitch = 1.32 + Math.random() * 0.06;
    play('dash', { volume: 0.45, playbackRate: pitch });
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

  function stopDialogBlip() {
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
    for (const key of ['dialogA', 'dialogO']) {
      const a = htmlAudioFallback[key];
      if (a) {
        try { a.pause(); a.currentTime = 0; } catch {}
      }
    }
  }

  function playDialogBlip() {
    stopDialogBlip();
    const c = getAudioContext();
    const list = ['dialogA', 'dialogO'];
    const choice = list[Math.floor(Math.random() * list.length)];
    const buffer = buffers.get(choice);
    const pitch = 0.92 + Math.random() * 0.24;

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
        fallback.play().catch(() => {});
        setTimeout(() => {
          try { fallback.pause(); fallback.currentTime = 0; } catch {}
        }, 65);
      } catch {}
    }
  }

  let introMusic = null;

  function startIntroMusic({ startTime = 84.0, fadeInDuration = 3.0, targetVolume = 0.8 } = {}) {
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
        console.warn('Erro ao reproduzir música de introdução:', err);
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
  };
  window.addEventListener('keydown', unlockAudio, { passive: true });
  window.addEventListener('pointerdown', unlockAudio, { passive: true });

  return {
    playJump,
    playLanding,
    playDash,
    updateBooster,
    playDialogBlip,
    stopDialogBlip,
    startIntroMusic,
    getIntroMusicTime,
    setIntroMusicTime,
    stopIntroMusic,
  };
}
