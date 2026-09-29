import { readFileSync, writeFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const path = 'assets/sprites/tilesets/open_world_tileset.review.metadata.json';
const metadata = JSON.parse(readFileSync(path, 'utf8'));
const sandbox = { window: {} };
runInNewContext(readFileSync('tools/tileset-assemblies.js', 'utf8'), sandbox);
const { build, check } = sandbox.window.TilesetAssemblies;
const placements = [];
function place(id, width, height, x, y) {
  const recipe = metadata.assemblies.find(item => item.id === id);
  for (const part of build(recipe, width, height, x, y)) placements.push({ id: `p${placements.length + 1}`, ...part });
}
place('predio', 16, 8, 0, 128);
place('predio', 8, 6, 320, 160);
place('mureta', 16, 1, 0, 112);
place('corrimao', 8, 1, 320, 144);
place('acesso', 4, 3, 16, 80);
place('caixa_dagua', 2, 3, 80, 80);
place('respiro', 1, 1, 112, 112);
place('varal', 4, 2, 128, 96);
place('bloco_telhado', 4, 1, 192, 112);
place('antena', 3, 2, 304, 128);
place('acesso_caixa', 4, 6, 336, 64);
place('cano', 1, 5, 16, 144);
place('cano', 1, 5, 224, 144);
placements.push({ id: `p${placements.length + 1}`, tileId: 'personagem_referencia', x: 48, y: 100, flipX: false });
metadata.scene = { width: 448, height: 256, background: '#292738', placements };
const ramp = metadata.assemblies.find(item => item.id === 'rampa');
const rampParts = [];
for (let col = 0; col < 28; col++) {
  const x = col * 16;
  const flatY = x < 64 || x >= 384 ? 48 : x >= 192 && x < 256 ? 96 : null;
  if (flatY !== null) rampParts.push({ tileId: 'piso_loop_telhado', x, y: flatY, flipX: false });
  for (let y = flatY === null ? 112 : flatY + 16; y < 256; y += 16)
    rampParts.push({ tileId: 'concreto_loop_meio', x, y, flipX: false });
}
rampParts.push(...build(ramp, 8, 4, 64, 48), ...build(ramp, 8, 4, 256, 48, 16, true));
for (const part of rampParts) {
  const replacement = ramp.interiorJoin?.replacements[part.tileId];
  if (replacement) { part.tileId = replacement; part.flipX = false; }
}
metadata.rampDemo = { placements: rampParts, surfaces: [
  { x: 0, width: 64, y: 49 }, { x: 64, width: 128, y: 48, heights: ramp.surface.heights },
  { x: 192, width: 64, y: 97 }, { x: 256, width: 128, y: 48, heights: [...ramp.surface.heights].reverse() },
  { x: 384, width: 64, y: 49 }
] };
metadata.reviewHazard = { assemblyId: null, status: 'awaiting-identification',
  behavior: { type: 'smoke-emitter', direction: 'up', period: 3, activeDuration: 1.8,
    knockback: { horizontal: 180, vertical: -180, cooldown: 0.7 } } };
const errors = check(metadata);
if (errors.length) throw Error(JSON.stringify(errors));
const ids = new Set(metadata.tiles.map(tile => tile.id));
for (const tile of metadata.tiles) {
  const r = tile.source;
  if (tile.role !== 'character' && (r.w !== 16 || r.h !== 16 || r.x % 16 || r.y % 16)) throw Error(tile.id);
  if (r.x + r.w > metadata.image.width || r.y + r.h > metadata.image.height) throw Error(tile.id);
}
for (const recipe of metadata.assemblies) {
  if (build(recipe, recipe.defaultWidth, recipe.defaultHeight).some(item => !ids.has(item.tileId))) throw Error(recipe.id);
}
const json = JSON.stringify(metadata, null, 2) + '\n';
writeFileSync(path, json);
for (const page of ['tools/tileset-editor.html', 'tools/tileset-review.html']) {
  const html = readFileSync(page, 'utf8').replace(/(<script id="default-metadata" type="application\/json">)[\s\S]*?(<\/script>)/,
    (_, open, close) => `${open}\n${json}${close}`);
  writeFileSync(page, html);
}
console.log(`Revisão pronta: ${metadata.tiles.length} tiles, ${metadata.assemblies.length} montagens, ${placements.length} peças na cena; encaixes OK.`);
