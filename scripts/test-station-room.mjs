import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

globalThis.Image = class {
  complete = true;
  naturalWidth = 122;
  set src(value) { this.path = value; }
};

const { createStationWorld, drawWorld, drawStationForeground } = await import('../src/world.js');
const { drawNpcs } = await import('../src/npcs.js');
const { createPlayer, updatePlayer } = await import('../src/player.js');
const world = createStationWorld();
const player = Object.assign(createPlayer(world.groundY), { x: 8 });
assert.equal(world.width, 244);
assert.equal(world.height, 122);
assert.equal(player.y + player.h, world.groundY);
assert.ok(player.h / world.height > .35, 'Gabriel must be sized for the station artwork');
assert.ok(existsSync('assets/rooms/cops_area/cops_area.png'));
assert.ok(existsSync('assets/rooms/cops_area/cops_area_up.png'));
const copSprite = readFileSync('assets/sprites/npc/policial/spritesheet_cop.png');
assert.equal(copSprite.readUInt32BE(16), 280);
assert.equal(copSprite.readUInt32BE(20), 48);
assert.equal(world.npcs[0].id, 'policial');
assert.deepEqual([world.npcs[0].w, world.npcs[0].h], [80, 96]);
assert.equal(world.npcs[0].y, world.groundY + 14);

const layers = [];
const scales = [];
const ctx = {
  fillRect() {},
  save() {}, restore() {}, translate() {},
  scale(x, y) { scales.push([x, y]); },
  drawImage(image, ...args) { layers.push({ path: image.path, args }); },
};
drawWorld(ctx, world, 0, world.width, world.height);
drawNpcs(ctx, world, 0, 0);
drawStationForeground(ctx, 0, 0, 1);
assert.deepEqual(layers.map(layer => layer.path), [
  'assets/rooms/cops_area/cops_area.png',
  'assets/sprites/npc/policial/spritesheet_cop.png',
  'assets/rooms/cops_area/cops_area_up.png',
]);
assert.deepEqual(layers[1].args.slice(0, 4), [0, 0, 40, 41]);
assert.deepEqual(layers[1].args.slice(-2), [80, 82]);
assert.equal(world.npcs[0].y - world.npcs[0].h + layers[1].args.at(-1), world.groundY);
assert.equal(ctx.imageSmoothingEnabled, false);
assert.deepEqual(scales, [[1, 1]]);
world.npcs[0].facing = -1;
drawNpcs(ctx, world, 0, 0);
assert.deepEqual(scales.at(-1), [-1, 1]);

const input = {
  held: { left: false, right: true, jump: false, dash: false },
  takeJump: () => false,
  takeDash: () => false,
};
for (let i = 0; i < 180; i++) updatePlayer(player, world, input, 1 / 60);
assert.ok(player.x > 78, 'Gabriel can pass across the counter');
assert.equal(player.y + player.h, world.groundY, 'Gabriel remains on the station floor');
console.log('PASS: station artwork loads with a playable room and solid floor.');
