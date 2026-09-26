async function loadSprite(folder, metadataFile = 'metadata.json') {
  const response = await fetch(folder + metadataFile);
  if (!response.ok) throw new Error(`Metadata do Gabriel: HTTP ${response.status}`);
  const metadata = await response.json();
  const image = new Image();
  image.src = folder + metadata.spritesheet;
  await image.decode();
  const columns = metadata.columns ?? metadata.frame_count;
  const rows = Math.ceil(metadata.frame_count / columns);
  if (image.width < metadata.frame_w * columns || image.height < metadata.frame_h * rows) {
    throw new Error('Spritesheet do Gabriel não corresponde ao metadata.');
  }
  return {
    image,
    frameW: metadata.frame_w,
    frameH: metadata.frame_h,
    count: metadata.frame_count,
    columns,
    fps: metadata.fps,
  };
}

export function loadGabriel() {
  return loadSprite('./assets/sprites/player/spr_gabriel/');
}

export function loadGabrielRun() {
  return loadSprite('./assets/sprites/player/spr_gabriel/', 'metadata_run.json');
}

export function loadGabrielJump() {
  return loadSprite('./assets/sprites/player/spr_gabriel/', 'metadata_jump.json');
}

export function loadGabrielBoost() {
  return loadSprite('./assets/sprites/player/spr_gabriel/', 'metadata_boost.json');
}

export function loadGabrielDash() {
  return loadSprite('./assets/sprites/player/spr_gabriel/', 'metadata_dash.json');
}

export function loadGabrielLanding() {
  return loadSprite('./assets/sprites/player/spr_gabriel/', 'metadata_landing.json');
}
