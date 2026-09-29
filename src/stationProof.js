const PROOF_DURATION = 1.8;

export function createStationProof() {
  let elapsed = 0;
  return {
    get elapsed() { return elapsed; },
    get lift() {
      if (elapsed < 0.3 || elapsed >= 1.55) return 0;
      if (elapsed < 0.7) return Math.round((elapsed - 0.3) / 0.4 * 10);
      if (elapsed < 1.15) return 10;
      return Math.round((1.55 - elapsed) / 0.4 * 10);
    },
    get boosting() { return elapsed >= 0.3 && elapsed < 1.15; },
    get done() { return elapsed >= PROOF_DURATION; },
    update(dt) { elapsed = Math.min(PROOF_DURATION, elapsed + dt); },
    drawPapers(ctx) {
      if (elapsed < 0.35 || elapsed >= 1.65) return;
      const flight = Math.min(1, (elapsed - 0.35) / 0.8);
      ctx.save();
      ctx.fillStyle = '#f5f0e7';
      for (let i = 0; i < 3; i++) {
        const x = 111 + i * 11 + Math.round(flight * (i - 1) * 8);
        const y = 74 - Math.round(Math.sin(flight * Math.PI) * (9 + i * 3));
        ctx.fillRect(x, y, 5, 3);
      }
      ctx.restore();
    },
  };
}
