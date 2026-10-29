export const WORLD_WIDTH = 750
export const WORLD_HEIGHT = 525
export const obstacles = [
  { x: 218, y: 135, w: 49, h: 71 }, { x: 488, y: 322, w: 49, h: 71 },
  { x: 476, y: 128, w: 75, h: 30 }, { x: 191, y: 360, w: 75, h: 30 },
  { x: 349, y: 161, w: 52, h: 27 }, { x: 349, y: 338, w: 52, h: 27 },
  { x: 128, y: 255, w: 34, h: 49 }, { x: 589, y: 221, w: 34, h: 49 },
]
export type GameInput = { dx: number; dy: number; aimX: number; aimY: number; attack: boolean; ability: boolean; hatch: boolean; cycle: boolean }
export const emptyInput = (): GameInput => ({ dx: 0, dy: 0, aimX: 375, aimY: 262, attack: false, ability: false, hatch: false, cycle: false })
export type Player = {
  id: string; name: string; x: number; y: number; hp: number; ability: number; hatched: boolean; alive: boolean;
  cooldown: number; shotCooldown: number; speedUntil: number; invisibleUntil: number; frozenUntil: number;
  revealUntil: number; shieldUntil: number; invulnerableUntil: number; revives: number; rewindUsed: boolean;
  safeX: number; safeY: number; teleportAt: number; teleportX: number; teleportY: number;
  copies: number[]; selectedCopy: number; cycleCooldown: number; kills: number; bot: boolean;
  eggX: number; eggY: number; visible: boolean;
  mirrorUntil: number; chainTarget: string | null;
}
export type Projectile = { id: number; owner: string; x: number; y: number; vx: number; vy: number; life: number }
export type Effect = { x: number; y: number; radius: number; until: number; kind: string; owner: string }
export type ArenaState = { time: number; status: 'waiting' | 'playing' | 'finished'; players: Player[]; projectiles: Projectile[]; effects: Effect[]; winner: string | null; radius: number; events: string[] }
export type RoomSnapshot = { type: 'state'; code: string; you: string; host: string; state: ArenaState }
export type GameSession = { mode: 'practice'; name: string } | { mode: 'online'; socket: WebSocket; snapshot: RoomSnapshot }
export const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)
export const WORLD_CX = 375
export const WORLD_CY = 262
export function canStand(x: number, y: number) {
  return x >= 16 && x <= 734 && y >= 16 && y <= 509 && !obstacles.some(o => x > o.x - 11 && x < o.x + o.w + 11 && y > o.y - 11 && y < o.y + o.h + 11)
}
