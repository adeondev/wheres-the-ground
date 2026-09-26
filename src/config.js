export const GAME_HEIGHT = 240;

export const PLAYER = {
  speed: 170,
  jump: 320,
  gravity: 1050,
  vacuumGravity: 260,
  boostKick: 365,
  boostCruise: 260,
  boostDelay: 0.08,
  dashSpeed: 450,
  dashDuration: 0.15,
  dashCooldown: 0.3,
  slideDuration: 0.28,
  landingMinHeight: 64,
  landingLockDuration: 0.65,
  groundAcceleration: 2200,
  groundBrake: 3000,
  groundCoast: 700,
  slideCoast: 420,
  dashEase: 850,
  airAcceleration: 1100,
  airCoast: 200,
  maxSpeed: 500,
  maxFuel: 100,
  boostCost: 42, // combustível por segundo
  blastCost: 22,
  refill: 36, // combustível por segundo no chão, fora do vácuo
  blastCooldown: 0.35,
};
