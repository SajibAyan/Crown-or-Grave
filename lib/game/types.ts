export const WORLD_WIDTH = 1000
export const WORLD_HEIGHT = 700
export const obstacles = [
  { x: 290, y: 180, w: 65, h: 95 }, { x: 650, y: 430, w: 65, h: 95 },
  { x: 635, y: 170, w: 100, h: 40 }, { x: 255, y: 480, w: 100, h: 40 },
  { x: 465, y: 215, w: 70, h: 36 }, { x: 465, y: 450, w: 70, h: 36 },
  { x: 170, y: 340, w: 45, h: 65 }, { x: 785, y: 295, w: 45, h: 65 },
]
export type GameInput = { dx: number; dy: number; aimX: number; aimY: number; attack: boolean; ability: boolean; hatch: boolean; cycle: boolean }
export const emptyInput = (): GameInput => ({ dx: 0, dy: 0, aimX: 500, aimY: 350, attack: false, ability: false, hatch: false, cycle: false })
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
export function canStand(x: number, y: number) {
  return x >= 22 && x <= 978 && y >= 22 && y <= 678 && !obstacles.some(o => x > o.x - 14 && x < o.x + o.w + 14 && y > o.y - 14 && y < o.y + o.h + 14)
}
