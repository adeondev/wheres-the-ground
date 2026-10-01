import assert from 'node:assert/strict';

const button = key => {
  const listeners = new Map();
  return {
    dataset: { key },
    setPointerCapture() {},
    addEventListener(type, listener) { listeners.set(type, listener); },
    emit(type, pointerId) { listeners.get(type)?.({ pointerId, preventDefault() {} }); },
  };
};
const left = button('left');
const interact = button('interact');
const jump = button('jump');
const buttons = [left, interact, jump];
globalThis.window = { addEventListener() {} };
globalThis.document = { querySelectorAll: () => buttons };

const { createInput } = await import('../src/input.js');
const input = createInput();
left.emit('pointerdown', 1);
interact.emit('pointerdown', 2);
assert.equal(input.held.left, true, 'walking remains held while tapping FALAR');
assert.equal(input.takeInteract(), true, 'FALAR queues interaction');
assert.equal(input.takeInteract(), false, 'one touch starts one interaction');
interact.emit('pointerup', 2);
assert.equal(input.held.left, true, 'lifting the second finger keeps walking');
jump.emit('pointerdown', 3);
assert.equal(input.held.jump, true, 'jump can be held with movement');
assert.equal(input.takeJump(), true);
left.emit('pointerup', 1);
jump.emit('pointerup', 3);
assert.equal(input.held.left, false);
assert.equal(input.held.jump, false);

input.setAllowedKeys(['a', 'd']);
interact.emit('pointerdown', 4);
assert.equal(input.takeInteract(), false, 'locked cutscenes reject touch interaction');
interact.emit('pointerup', 4);
console.log('PASS: multitouch movement, jump and FALAR work; locked scenes block interaction.');
