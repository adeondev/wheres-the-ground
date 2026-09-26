// Introdução cinematográfica em typewriter e transição para o jogo
const UI_PATH = 'assets/ui/dialogue/';

// Acervo selecionado dos 4 foguetes mais emblemáticos da história espacial
const ROCKETS = [
  {
    id: 'saturn_v',
    tag: 'ORBITAL ARCHIVE // 01-SATURN-V',
    name: 'SATURN V',
    meta: 'NASA // 1967-1973 // MOON',
    lines: [
      '// 111M SUPER HEAVY LAUNCHER.',
      '// FLEW APOLLO 11 TO MOON.',
      '// MOST POWERFUL ROCKET FLOWN.',
    ],
    src: 'assets/sprites/intro/rockets/saturn_v.jpg',
  },
  {
    id: 'space_shuttle',
    tag: 'ORBITAL ARCHIVE // 02-SHUTTLE',
    name: 'SPACE SHUTTLE',
    meta: 'NASA // 1981-2011 // ORBITER',
    lines: [
      '// REUSABLE WINGED SPACECRAFT.',
      '// EXECUTED 135 CREWED FLIGHTS.',
      '// DEPLOYED HUBBLE AND ISS.',
    ],
    src: 'assets/sprites/intro/rockets/space_shuttle.jpg',
  },
  {
    id: 'vostok_1',
    tag: 'ORBITAL ARCHIVE // 03-VOSTOK-1',
    name: 'VOSTOK 1',
    meta: 'USSR // 1961 // FIRST HUMAN',
    lines: [
      '// HISTORIC R-7 LAUNCH VEHICLE.',
      '// CARRIED GAGARIN TO ORBIT.',
      '// FIRST HUMAN SPACEFLIGHT.',
    ],
    src: 'assets/sprites/intro/rockets/vostok_1.jpg',
  },
  {
    id: 'falcon_9',
    tag: 'ORBITAL ARCHIVE // 04-FALCON-9',
    name: 'FALCON 9',
    meta: 'SPACEX // 2010-PRES // BOOSTER',
    lines: [
      '// TWO-STAGE REUSABLE LAUNCHER.',
      '// VERTICAL BOOSTER LANDINGS.',
      '// SLASHED COST TO ORBIT.',
    ],
    src: 'assets/sprites/intro/rockets/falcon_9.jpg',
  },
];

export function createIntro(audio, { onFinish = () => {} } = {}) {
  let active = false;
  // Fases: idle, seg1_typing, seg1_wait, seg1_fade, seg1_pause,
  // seg2_typing, seg2_wait, seg2_fade, seg3_music,
  // seg4_logo_in, seg4_logo_hold, seg5_logo_slide, seg6_showcase, seg7_start_fade, finished
  let phase = 'idle';
  let phaseTimer = 0;
  let alpha = 1;
  let slideProgress = 0; // 0 = centro, 1 = à esquerda
  let currentRocketIdx = 0;
  let rocketTimer = 0;
  let smoothMusicTime = 0;

  // Carregamento da fonte bitmap pixelada dos diálogos
  const fontImg = new Image();
  fontImg.src = `${UI_PATH}font.png`;
  let fontMeta = null;

  // Imagem oficial da logo do jogo
  const logoImg = new Image();
  logoImg.src = 'assets/sprites/ui/game_logo.png';

  // Pré-carregamento das fotos dos foguetes
  const rocketImages = new Map();
  for (const r of ROCKETS) {
    const img = new Image();
    img.src = r.src;
    rocketImages.set(r.id, img);
  }

  fetch(`${UI_PATH}font.json`)
    .then(res => res.json())
    .then(data => { fontMeta = data; })
    .catch(err => console.warn('Não foi possível carregar metadata da fonte na intro:', err));

  // Textos da introdução
  const SEGMENT_1 = [
    { text: 'Projeto de Gabriel Marques de Souza' },
    { text: '1 ano A' },
  ];

  const SEGMENT_2 = [
    { text: 'Já imaginou como seria sua vida, se o seu objeto' },
    { text: 'ou coisa preferida te desse super-poderes?' },
    { text: 'Eu imaginei.', pauseBefore: 0.9 },
    { text: 'E aqui vai.', pauseBefore: 0.7 },
  ];

  // Estado do typewriter
  let currentLines = [];
  let lineIdx = 0;
  let charIdx = 0;
  let charTimer = 0;
  let linePauseTimer = 0;

  function measureTextWidth(text, scale = 1) {
    const charW = fontMeta ? fontMeta.cellW : 6;
    return text.length * charW * scale;
  }

  function drawPixelText(ctx, text, x, y, color = '#ffffff', scale = 1) {
    if (fontMeta && fontImg.complete && fontImg.naturalWidth > 0) {
      const { chars, cellW, cellH, cols } = fontMeta;
      let curX = Math.round(x);
      const curY = Math.round(y);
      for (const char of Array.from(String(text).toUpperCase())) {
        if (char === ' ') {
          curX += cellW * scale;
          continue;
        }
        const index = Math.max(0, chars.indexOf(char));
        const sx = (index % cols) * cellW;
        const sy = Math.floor(index / cols) * cellH;
        ctx.drawImage(fontImg, sx, sy, cellW, cellH, curX, curY, cellW * scale, cellH * scale);
        curX += cellW * scale;
      }
    } else {
      ctx.save();
      ctx.font = `${8 * scale}px monospace`;
      ctx.fillStyle = color;
      ctx.textBaseline = 'top';
      ctx.fillText(text, Math.round(x), Math.round(y));
      ctx.restore();
    }
  }

  // Gera texto decodificado estilo hacker terminal (glitch decodificando da esquerda para a direita)
  function getDecodedText(finalText, progress) {
    if (progress >= 1) return finalText;
    const glyphs = '0123456789ABCDEFXYZ#%+';
    const total = finalText.length;
    const locked = Math.floor(total * Math.max(0, progress));
    let res = finalText.slice(0, locked);
    for (let i = locked; i < total; i++) {
      const c = finalText[i];
      if (c === ' ' || c === '-' || c === '/' || c === '.') {
        res += c;
      } else {
        res += glyphs[Math.floor(Math.random() * glyphs.length)];
      }
    }
    return res;
  }

  function startSegment(lines, nextPhase) {
    currentLines = lines.map(line => ({ ...line, currentText: '' }));
    lineIdx = 0;
    charIdx = 0;
    charTimer = 0;
    linePauseTimer = lines[0]?.pauseBefore || 0;
    alpha = 1;
    phase = nextPhase;
  }

  function start() {
    active = true;
    alpha = 1;
    slideProgress = 0;
    currentRocketIdx = 0;
    rocketTimer = 0;
    smoothMusicTime = 0;
    audio.stopDialogBlip();
    audio.stopIntroMusic(0);
    startSegment(SEGMENT_1, 'seg1_typing');
  }

  function skipToLogoTime() {
    if (phase === 'seg3_music') {
      audio.setIntroMusicTime(89.0);
      smoothMusicTime = 89.0;
    }
  }

  function startGameFromShowcase() {
    if (phase === 'seg6_showcase') {
      phase = 'seg7_start_fade';
      phaseTimer = 0.7;
      audio.stopIntroMusic(0.8);
    }
  }

  function nextRocket() {
    currentRocketIdx = (currentRocketIdx + 1) % ROCKETS.length;
    rocketTimer = 0;
  }

  function finish(fadeDuration = 1.0) {
    audio.stopDialogBlip();
    audio.stopIntroMusic(fadeDuration);
    active = false;
    phase = 'idle';
    onFinish();
  }

  function updateTypewriter(dt, onDone) {
    if (lineIdx >= currentLines.length) {
      audio.stopDialogBlip();
      onDone();
      return;
    }

    if (linePauseTimer > 0) {
      linePauseTimer -= dt;
      return;
    }

    charTimer -= dt;
    if (charTimer <= 0) {
      const line = currentLines[lineIdx];
      charIdx++;
      const newChar = line.text[charIdx - 1];
      line.currentText = line.text.slice(0, charIdx);

      // Reproduz som com blip para caracteres visíveis
      if (newChar && newChar !== ' ') {
        audio.playDialogBlip();
      }

      // Intervalo entre caracteres com pausas naturais em pontuação
      let delay = 0.042;
      if (newChar === ',') delay = 0.22;
      else if (newChar === '.' || newChar === '?' || newChar === '!') delay = 0.32;
      charTimer = delay;

      if (charIdx >= line.text.length) {
        audio.stopDialogBlip();
        lineIdx++;
        charIdx = 0;
        if (lineIdx < currentLines.length) {
          linePauseTimer = currentLines[lineIdx].pauseBefore || 0.45;
        } else {
          onDone();
        }
      }
    }
  }

  function update(dt) {
    if (!active) return;

    // Usa o relógio do áudio quando ele toca; segue visualmente se o autoplay for bloqueado.
    if (phase === 'seg3_music' || phase.startsWith('seg4_logo') || phase === 'seg5_logo_slide' || phase === 'seg6_showcase' || phase === 'seg7_start_fade') {
      const realTime = audio.getIntroMusicTime();
      if (audio.isIntroMusicPlaying() && realTime >= 84) {
        smoothMusicTime = realTime;
      } else if (smoothMusicTime >= 84) {
        smoothMusicTime += dt;
      }
    }

    switch (phase) {
      case 'seg1_typing':
        updateTypewriter(dt, () => {
          audio.stopDialogBlip();
          phase = 'seg1_wait';
          phaseTimer = 2.0; // Espera para ler o nome
        });
        break;

      case 'seg1_wait':
        audio.stopDialogBlip();
        phaseTimer -= dt;
        if (phaseTimer <= 0) {
          phase = 'seg1_fade';
          phaseTimer = 0.6;
        }
        break;

      case 'seg1_fade':
        phaseTimer -= dt;
        alpha = Math.max(0, phaseTimer / 0.6);
        if (phaseTimer <= 0) {
          alpha = 0;
          phase = 'seg1_pause';
          phaseTimer = 0.5;
        }
        break;

      case 'seg1_pause':
        phaseTimer -= dt;
        if (phaseTimer <= 0) {
          startSegment(SEGMENT_2, 'seg2_typing');
        }
        break;

      case 'seg2_typing':
        updateTypewriter(dt, () => {
          audio.stopDialogBlip();
          phase = 'seg2_wait';
          phaseTimer = 2.4; // Espera para ler a reflexão
        });
        break;

      case 'seg2_wait':
        audio.stopDialogBlip();
        phaseTimer -= dt;
        if (phaseTimer <= 0) {
          phase = 'seg2_fade';
          phaseTimer = 0.6;
        }
        break;

      case 'seg2_fade':
        phaseTimer -= dt;
        alpha = Math.max(0, phaseTimer / 0.6);
        if (phaseTimer <= 0) {
          alpha = 0;
          phase = 'seg3_music';
          smoothMusicTime = 84.0;
          audio.startIntroMusic({ startTime: 84.0, fadeInDuration: 3.0, targetVolume: 0.8 });
        }
        break;

      case 'seg3_music': {
        const musicTime = smoothMusicTime || audio.getIntroMusicTime();
        // Surge exatamente na batida aos 1:29.45
        if (musicTime >= 89.45) {
          phase = 'seg4_logo_in';
          phaseTimer = 0.8;
          alpha = 0;
          slideProgress = 0;
        }
        break;
      }

      case 'seg4_logo_in':
        phaseTimer -= dt;
        alpha = Math.min(1, 1 - phaseTimer / 0.8);
        if (phaseTimer <= 0) {
          alpha = 1;
          phase = 'seg4_logo_hold';
          phaseTimer = 10.0; // 10 segundos centralizado
        }
        break;

      case 'seg4_logo_hold':
        phaseTimer -= dt;
        alpha = 1;
        slideProgress = 0;
        if (phaseTimer <= 0) {
          phase = 'seg5_logo_slide';
          phaseTimer = 1.1; // Desliza suavemente para a esquerda
        }
        break;

      case 'seg5_logo_slide':
        phaseTimer -= dt;
        slideProgress = Math.min(1, Math.max(0, 1 - phaseTimer / 1.1));
        if (phaseTimer <= 0) {
          slideProgress = 1;
          phase = 'seg6_showcase';
          phaseTimer = 0;
          rocketTimer = 0;
        }
        break;

      case 'seg6_showcase':
        slideProgress = 1;
        alpha = 1;
        rocketTimer += dt;
        // Permanece 12 segundos em cada foguete para permitir leitura confortável
        if (rocketTimer >= 12.0) {
          nextRocket();
        }
        break;

      case 'seg7_start_fade':
        phaseTimer -= dt;
        alpha = Math.max(0, phaseTimer / 0.7);
        if (phaseTimer <= 0) {
          alpha = 0;
          finish();
        }
        break;
    }
  }

  function getDockLogoWidth(width) {
    return Math.min(184, Math.max(115, Math.round(width * 0.34)));
  }

  function getLogoBeatPose(musicTime) {
    const totalBeats = Math.max(0, musicTime - 89.45) / (60 / 134);
    const beatIndex = Math.floor(totalBeats);
    const beatFraction = totalBeats - beatIndex;
    // Ataque imediato na batida; só a volta tem suavização, como um alto-falante.
    const pulse = Math.exp(-beatFraction * 6.5);
    const direction = beatIndex % 2 === 0 ? -1 : 1;
    return {
      pulse,
      direction,
      scale: 1 + (beatIndex % 4 === 0 ? 0.065 : 0.045) * pulse,
      angle: direction * 0.095 * pulse,
      shiftX: direction * 4 * pulse,
    };
  }

  function drawLogo(ctx, width, height, currentAlpha) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, currentAlpha));

    // Posição centralizada
    const centerScale = Math.min((width - 40) / 1225, 205 / 1145);
    const centerW = Math.round(1225 * centerScale);
    const centerH = Math.round(1145 * centerScale);
    const centerX = Math.round((width - centerW) / 2);
    const centerY = Math.round((height - centerH) / 2);

    // Posição ancorada à esquerda (durante o showcase)
    // Agrupa a logo e o texto de início em um bloco centralizado verticalmente.
    const dockW = getDockLogoWidth(width);
    const dockH = Math.round(dockW * (1145 / 1225));
    const leftCenterX = Math.round(width * 0.25);
    const dockX = Math.round(leftCenterX - dockW / 2);

    const totalLeftBlockH = dockH + 8 + 31;
    const dockY = Math.round((height - totalLeftBlockH) / 2);

    // Interpolação suave com cosseno
    const ease = 0.5 - 0.5 * Math.cos(slideProgress * Math.PI);
    const curX = Math.round(centerX + (dockX - centerX) * ease);
    const curY = Math.round(centerY + (dockY - centerY) * ease);
    const curW = Math.round(centerW + (dockW - centerW) * ease);
    const curH = Math.round(centerH + (dockH - centerH) * ease);

    if (logoImg.complete && logoImg.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const drawPose = (musicTime, opacity, trail) => {
        const pose = getLogoBeatPose(musicTime);
        ctx.save();
        ctx.globalAlpha = currentAlpha * opacity;
        if (trail) {
          ctx.globalCompositeOperation = 'screen';
          ctx.shadowColor = pose.direction < 0 ? '#bd62ff' : '#5fcaff';
          ctx.shadowBlur = 10 * pose.pulse;
        }
        ctx.translate(curX + curW / 2 + pose.shiftX, curY + curH / 2);
        ctx.rotate(pose.angle);
        ctx.drawImage(logoImg, -curW * pose.scale / 2, -curH * pose.scale / 2, curW * pose.scale, curH * pose.scale);
        ctx.restore();
      };

      // Ecos das poses anteriores criam o rastro da virada, sem atrasar a pose principal.
      for (let i = 4; i >= 1; i--) {
        const pastTime = smoothMusicTime - i * 0.035;
        if (pastTime >= 89.45) drawPose(pastTime, 0.035 + (4 - i) * 0.03, true);
      }
      drawPose(smoothMusicTime, 1, false);
    } else {
      drawLogoPlaceholder(ctx, width, height, currentAlpha);
    }

    ctx.restore();
    ctx.imageSmoothingEnabled = false;

    // Quando a logo estiver ancorada à esquerda, desenha o prompt abaixo dela
    if (slideProgress > 0) {
      drawStartPrompt(ctx, leftCenterX, dockY + dockH + 8, ease * currentAlpha);
    }
  }

  function drawStartPrompt(ctx, centerX, y, currentAlpha) {
    if (currentAlpha <= 0) return;
    ctx.save();

    const beatPulse = 0.72 + 0.28 * getLogoBeatPose(smoothMusicTime).pulse;
    ctx.globalAlpha = currentAlpha * beatPulse;

    const line1 = 'PRESS ANY KEY';
    const line2 = 'TO START';
    const textScale = 1.5;
    const w1 = measureTextWidth(line1, textScale);
    const w2 = measureTextWidth(line2, textScale);

    const x1 = Math.round(centerX - w1 / 2);
    const x2 = Math.round(centerX - w2 / 2);

    drawPixelText(ctx, line1, x1, y, '#ffffff', textScale);
    drawPixelText(ctx, line2, x2, y + 16, '#f4ba79', textScale);

    // Bloco cursor piscando no final de TO START
    if (Math.floor(Date.now() / 280) % 2 === 0) {
      ctx.fillStyle = '#f4ba79';
      ctx.fillRect(x2 + w2 + 4, y + 17, 5, 10);
    }

    ctx.restore();
  }

  // Showcase estilo terminal hacker: praticamente só foto e texto sobre fundo pitch black
  function drawShowcase(ctx, width, height, currentAlpha) {
    if (slideProgress <= 0) return;

    ctx.save();
    const ease = 0.5 - 0.5 * Math.cos(slideProgress * Math.PI);
    const panelAlpha = ease * currentAlpha;
    ctx.globalAlpha = Math.max(0, Math.min(1, panelAlpha));

    // Logo no quadrante esquerdo
    const leftCenterX = Math.round(width * 0.25);
    const dockW = getDockLogoWidth(width);
    const logoRightEdge = leftCenterX + Math.round(dockW / 2);

    // Coluna dos foguetes no quadrante direito com margem segura da borda
    const imgW = Math.min(175, Math.max(150, Math.round(width * 0.35)));
    const imgH = Math.round(imgW * (110 / 180));
    const rightMargin = Math.max(24, Math.round(width * 0.055));
    // Garante que o início da coluna direita respeite a margem direita da tela
    const rightX = Math.max(logoRightEdge + 20, Math.round(width - imgW - rightMargin));

    const rocket = ROCKETS[currentRocketIdx];
    if (!rocket) {
      ctx.restore();
      return;
    }

    // 1. Tag de arquivo do terminal
    drawPixelText(ctx, rocket.tag, rightX, 18, '#85ba9c', 1);

    // 2. Título decodificando em glitch cibernético
    const decodeProgress = Math.min(1, rocketTimer / 0.45);
    const decodedName = getDecodedText(rocket.name, decodeProgress);
    drawPixelText(ctx, decodedName, rightX, 29, '#f4f0df', 1);

    // 3. Metadados do foguete (País, Ano, Missão)
    drawPixelText(ctx, rocket.meta, rightX, 40, '#f4ba79', 1);

    // 4. Foto do foguete com cantos de mira e linha laser de telemetria
    const imgX = rightX;
    const imgY = 52;

    const rImg = rocketImages.get(rocket.id);
    if (rImg && rImg.complete && rImg.naturalWidth > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(rImg, imgX, imgY, imgW, imgH);
      ctx.restore();
      ctx.imageSmoothingEnabled = false;

      // Laser scanline varrendo a imagem
      const scanOffset = (rocketTimer * 75) % (imgH + 12);
      if (scanOffset < imgH) {
        ctx.fillStyle = '#85ba9c40';
        ctx.fillRect(imgX, imgY + scanOffset, imgW, 2);
      }

    }

    // Cantos em mira no estilo terminal [ ┌ ┐ └ ┘ ]
    const cornerLen = 5;
    ctx.strokeStyle = '#85ba9c';
    ctx.lineWidth = 1;

    // Canto superior esquerdo
    ctx.beginPath();
    ctx.moveTo(imgX - 2, imgY - 2 + cornerLen);
    ctx.lineTo(imgX - 2, imgY - 2);
    ctx.lineTo(imgX - 2 + cornerLen, imgY - 2);
    ctx.stroke();

    // Canto superior direito
    ctx.beginPath();
    ctx.moveTo(imgX + imgW + 2 - cornerLen, imgY - 2);
    ctx.lineTo(imgX + imgW + 2, imgY - 2);
    ctx.lineTo(imgX + imgW + 2, imgY - 2 + cornerLen);
    ctx.stroke();

    // Canto inferior esquerdo
    ctx.beginPath();
    ctx.moveTo(imgX - 2, imgY + imgH + 2 - cornerLen);
    ctx.lineTo(imgX - 2, imgY + imgH + 2);
    ctx.lineTo(imgX - 2 + cornerLen, imgY + imgH + 2);
    ctx.stroke();

    // Canto inferior direito
    ctx.beginPath();
    ctx.moveTo(imgX + imgW + 2 - cornerLen, imgY + imgH + 2);
    ctx.lineTo(imgX + imgW + 2, imgY + imgH + 2);
    ctx.lineTo(imgX + imgW + 2, imgY + imgH + 2 - cornerLen);
    ctx.stroke();

    // 5. Linhas de texto em digitação contínua estilo hacker (velocidade calma para leitura)
    const startY = imgY + imgH + 9;
    const CHARS_PER_SEC = 36;
    const typeStart = 0.45;
    const totalTyped = Math.max(0, Math.floor((rocketTimer - typeStart) * CHARS_PER_SEC));

    let charBudget = totalTyped;
    let cursorX = rightX;
    let cursorY = startY;
    let showCursor = false;

    for (let i = 0; i < rocket.lines.length; i++) {
      const fullLine = rocket.lines[i];
      const curLineY = startY + i * 11;

      if (charBudget >= fullLine.length) {
        drawPixelText(ctx, fullLine, rightX, curLineY, '#e4e8dc', 1);
        charBudget -= fullLine.length;
        if (i === rocket.lines.length - 1) {
          cursorX = rightX + measureTextWidth(fullLine, 1) + 2;
          cursorY = curLineY;
          showCursor = true;
        }
      } else if (charBudget > 0) {
        const partial = fullLine.slice(0, charBudget);
        drawPixelText(ctx, partial, rightX, curLineY, '#e4e8dc', 1);
        cursorX = rightX + measureTextWidth(partial, 1) + 2;
        cursorY = curLineY;
        showCursor = true;
        charBudget = 0;
      }
    }

    // Bloco cursor piscando no terminal
    if (showCursor && Math.floor(Date.now() / 250) % 2 === 0) {
      ctx.fillStyle = '#85ba9c';
      ctx.fillRect(cursorX, cursorY, 4, 7);
    }

    // 6. Linha de status inferior discreta
    const statusY = startY + rocket.lines.length * 11 + 5;
    drawPixelText(ctx, 'STATUS: DECLASSIFIED', rightX, statusY, '#85ba9c88', 1);

    ctx.restore();
  }

  function drawLogoPlaceholder(ctx, width, height, currentAlpha) {
    ctx.save();
    ctx.globalAlpha = currentAlpha;

    const boxW = Math.min(290, width - 24);
    const boxH = 104;
    const boxX = Math.round((width - boxW) / 2);
    const boxY = Math.round((height - boxH) / 2);

    ctx.fillStyle = '#0b1320ee';
    ctx.fillRect(boxX, boxY, boxW, boxH);

    ctx.strokeStyle = '#85ba9c';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    const titleText = "WHERE'S THE GROUND?";
    const titleW = measureTextWidth(titleText, 1);
    drawPixelText(ctx, titleText, (width - titleW) / 2, boxY + 32, '#f4f0df', 1);

    ctx.restore();
  }

  function draw(ctx, width, height) {
    if (!active) return;

    // Fundo pitch black absoluto cinematográfico
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    // Renderização dos textos do Segmento 1
    if (phase.startsWith('seg1_')) {
      const centerY = height / 2;
      const l1 = currentLines[0]?.currentText || '';
      const l2 = currentLines[1]?.currentText || '';

      const w1 = measureTextWidth(l1, 1);
      const w2 = measureTextWidth(l2, 1);

      drawPixelText(ctx, l1, (width - w1) / 2, centerY - 14, '#f4f0df', 1);
      drawPixelText(ctx, l2, (width - w2) / 2, centerY + 4, '#85ba9c', 1);
    }

    // Renderização dos textos do Segmento 2
    else if (phase.startsWith('seg2_')) {
      const centerY = height / 2;
      const l1 = currentLines[0]?.currentText || '';
      const l2 = currentLines[1]?.currentText || '';
      const l3 = currentLines[2]?.currentText || '';
      const l4 = currentLines[3]?.currentText || '';

      const w1 = measureTextWidth(l1, 1);
      const w2 = measureTextWidth(l2, 1);
      const w3 = measureTextWidth(l3, 1);
      const w4 = measureTextWidth(l4, 1);

      drawPixelText(ctx, l1, (width - w1) / 2, centerY - 32, '#f4f0df', 1);
      drawPixelText(ctx, l2, (width - w2) / 2, centerY - 18, '#f4f0df', 1);
      drawPixelText(ctx, l3, (width - w3) / 2, centerY + 6, '#f4ba79', 1);
      drawPixelText(ctx, l4, (width - w4) / 2, centerY + 20, '#85ba9c', 1);
    }

    // Fase 3: Música tocando em pitch black absoluto (sem barra ou texto)
    else if (phase === 'seg3_music') {
      // Pitch black silencioso/musical
    }

    // Fases 4, 5, 6, 7: Logo e Showcase Hacker
    else if (
      phase.startsWith('seg4_logo') ||
      phase === 'seg5_logo_slide' ||
      phase === 'seg6_showcase' ||
      phase === 'seg7_start_fade'
    ) {
      drawLogo(ctx, width, height, alpha);
      drawShowcase(ctx, width, height, alpha);
    }

    ctx.restore();
  }

  // Atalhos de teclado durante a intro
  window.addEventListener('keydown', event => {
    if (!active) return;

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (!event.repeat) finish(0);
      return;
    }

    // Se estiver no showcase de foguetes: QUALQUER tecla inicia o jogo!
    if (phase === 'seg6_showcase') {
      startGameFromShowcase();
      return;
    }

    // L avança a música até perto da logo sem encerrar a introdução.
    if (phase === 'seg3_music' && event.key.toLowerCase() === 'l') {
      skipToLogoTime();
      return;
    }

    // Esc encerra imediatamente e vai pro jogo
    if (event.key === 'Escape') {
      finish(0);
    }
  });

  // Clique ou toque no canvas durante o showcase também inicia o jogo
  window.addEventListener('pointerdown', () => {
    if (!active) return;
    if (phase === 'seg6_showcase') {
      startGameFromShowcase();
    }
  });

  return {
    start,
    update,
    draw,
    finish,
    skipToLogoTime,
    startGameFromShowcase,
    nextRocket,
    get active() { return active; },
  };
}
