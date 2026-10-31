import { distance, emptyInput, type ArenaState, type GameInput } from './types'

export type ControlAction = 'ability' | 'hatch' | 'attack' | 'cycle'

// Keyboard movement, mouse fire and each touch pointer are independent. Releasing
// a movement finger must never release a different finger holding the Fire button.
export class PlayerControls {
  private keys = new Set<string>()
  private directions = new Map<number, { dx: number; dy: number }>()
  private actions = new Map<number, ControlAction>()
  private pendingFire: number | null = null
  private facing = { dx: 0, dy: -1 }

  setKey(key: string, down: boolean) {
    if (down) this.keys.add(key)
    else this.keys.delete(key)
  }

  pressDirection(pointerId: number, dx: number, dy: number) {
    this.directions.set(pointerId, { dx, dy })
  }

  pressAction(pointerId: number, action: ControlAction) {
    this.actions.set(pointerId, action)
    // Latch a quick tap until a shot actually happens, even if pointerup arrives
    // before the next animation frame or while the weapon is cooling down.
    if (action === 'attack') this.pendingFire = pointerId
  }

  releasePointer(pointerId: number, cancelled = false) {
    this.directions.delete(pointerId)
    this.actions.delete(pointerId)
    if (cancelled && this.pendingFire === pointerId) this.pendingFire = null
  }

  acknowledgeShot() { this.pendingFire = null }

  clear() {
    this.keys.clear(); this.directions.clear(); this.actions.clear(); this.pendingFire = null
  }

  read(state: ArenaState, you: string): GameInput {
    const player = state.players.find(p => p.id === you)
    if (!player?.alive || state.status !== 'playing') return emptyInput()
    let dx = Number(this.keys.has('d')) - Number(this.keys.has('a'))
    let dy = Number(this.keys.has('s')) - Number(this.keys.has('w'))
    for (const direction of this.directions.values()) { dx += direction.dx; dy += direction.dy }
    dx = Math.max(-1, Math.min(1, dx)); dy = Math.max(-1, Math.min(1, dy))
    if (dx || dy) {
      const length = Math.hypot(dx, dy)
      this.facing = { dx: dx / length, dy: dy / length }
    }

    // The same automatic aiming applies to desktop and touch, at ANY distance.
    // Invisibility and Eye reveal range still obey the existing game rules.
    const target = state.players
      .filter(p => p.id !== you && p.alive && p.visible &&
        (p.invisibleUntil <= state.time || (player.revealUntil > state.time && distance(player, p) < 200)))
      .sort((a, b) => distance(player, a) - distance(player, b))[0]
    const held = (action: ControlAction) => Array.from(this.actions.values()).includes(action)
    return {
      dx, dy,
      aimX: target?.x ?? player.x + this.facing.dx * 240,
      aimY: target?.y ?? player.y + this.facing.dy * 240,
      attack: held('attack') || this.pendingFire !== null,
      hatch: this.keys.has('e') || held('hatch'),
      ability: this.keys.has(' ') || this.keys.has('q') || held('ability'),
      cycle: this.keys.has('r') || held('cycle'),
    }
  }
}
