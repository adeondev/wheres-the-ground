// Deforma apenas a imagem; a caixa de colisão mantém o mesmo tamanho.
export const TURN_DURATION = 0.18;
export const DASH_ANIMATION_DURATION = 0.3;

export function playerVisualFacing(player) {
  return player.turnSquashTime > TURN_DURATION / 2 + 1e-9 ? player.turnFromFacing : player.facing;
}

export function playerPose(player) {
  const phase = player.landImpactTime > 0
    ? 1 - player.landImpactTime / player.landImpactDuration
    : 1;
  const landing = phase < 0.6
    ? player.landImpactStrength * (1 - phase / 0.6)
    : -0.08 * player.landImpactStrength * Math.sin((phase - 0.6) / 0.4 * Math.PI);
  const dash = player.dashStretch * (1 - Math.max(0, landing));
  const turnProgress = 1 - player.turnSquashTime / TURN_DURATION;
  const turn = player.turnSquashTime > 0
    ? Math.sin(Math.PI * turnProgress) ** 2
    : 0;

  return {
    x: 1 + dash * 0.48 + landing * 0.48 - turn * 0.3,
    y: 1 - dash * 0.22 - landing * 0.45 + turn * 0.08,
    facing: playerVisualFacing(player),
  };
}
