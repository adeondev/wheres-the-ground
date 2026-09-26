import { BOOST_FIRE } from './palette.js';

// Chama em pixels desenhada a partir do propulsor, no sentido de direction.
export function drawRocketFlame(ctx, x, y, direction, length, time) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(direction === 'down' ? Math.PI / 2 : direction === 'left' ? Math.PI : 0);

  const flicker = Math.round(Math.sin(time * 38) * 2);
  const tip = Math.max(9, Math.round(length) + flicker);
  const pixel = (px, py, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(px, py, w, h);
  };

  // Silhueta irregular, com duas línguas e uma ponta solta.
  pixel(0, -5, 4, 10, BOOST_FIRE.outer);
  pixel(3, -4, Math.max(3, tip - 8), 8, BOOST_FIRE.outer);
  pixel(6, -6, 4, 2, BOOST_FIRE.outer);
  pixel(7, 4, 5, 2, BOOST_FIRE.outer);
  pixel(tip - 5, -2, 4, 4, BOOST_FIRE.outer);
  pixel(tip, flicker > 0 ? -1 : 1, 2, 2, BOOST_FIRE.outer);

  pixel(0, -3, 5, 6, BOOST_FIRE.middle);
  pixel(4, -2, Math.max(3, tip - 9), 4, BOOST_FIRE.middle);
  pixel(tip - 7, -1, 3, 2, BOOST_FIRE.middle);
  pixel(0, -1, Math.max(3, Math.round(tip * 0.45)), 2, BOOST_FIRE.core);
  pixel(2, 1, 2, 1, BOOST_FIRE.core);
  ctx.restore();
}
