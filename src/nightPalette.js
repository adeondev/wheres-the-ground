// The same sunset highlights occur throughout the atlas, including roofs, ramps and props.
export function makeNightSprite(image, background = false) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = image.width; canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const lights = ctx.createImageData(canvas.width, canvas.height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    if (!pixels.data[i + 3]) continue;
    const [r, g, b] = pixels.data.slice(i, i + 3);
    let rgb;
    if (!background && r > 100 && r > g * 1.15 && g > b && b >= g * .65) {
      // Warm bevels become moonlit blue, retaining their three levels of brightness.
      rgb = r > 220 ? [177, 214, 255] : r > 190 ? [116, 158, 217] : r > 160 ? [84, 122, 182] : [51, 85, 139];
    } else if (r > 150 && r > g * 1.2 && g > 60 && b < 95) {
      rgb = [255, Math.min(240, g + 55), Math.min(160, b + 35)];
      lights.data.set([...rgb, pixels.data[i + 3]], i);
    } else rgb = [Math.round(r * .65), Math.round(g * .75), Math.min(255, Math.round(b * 1.06))];
    pixels.data.set(rgb, i);
  }
  ctx.putImageData(pixels, 0, 0);
  const lightMask = document.createElement('canvas'); lightMask.width = canvas.width; lightMask.height = canvas.height;
  lightMask.getContext('2d').putImageData(lights, 0, 0); canvas.lightMask = lightMask;
  return canvas;
}
