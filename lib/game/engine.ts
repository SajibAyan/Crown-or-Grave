import { cooldowns } from './abilities'
import { SOLO_RIVALS } from './solo-rivals'
import { canStand, distance, emptyInput, obstacles, WORLD_CX, WORLD_CY, type ArenaState, type GameInput, type Player } from './types'

// Zone shrink rates per map (index = map id)
const SHRINK_RATES = [2.0, 1.5, 3.2, 2.2, 3.8]
const SHRINK_START = [25, 30, 18, 24, 15] // when zone starts shrinking
// Normal solo combat tuning. Each map also has one rival with a distinctive tactic.
const BOT_SHOT_COOLDOWN = 0.9
const BOT_ORBIT_DISTANCE = 130
const BOT_REACTION_TIME = 0.35
const BOT_AIM_INTERVAL = 0.25
const BOT_AIM_ERROR = 40
const BOT_SHOOT_RANGE = 240

type BotReaction = {
  targetId: string | null
  readyAt: number
  nextAimAt: number
  aimX: number
  aimY: number
  observedX: number
  observedY: number
  observedAt: number
  velocityX: number
  velocityY: number
}

export class PracticeEngine {
  state: ArenaState
  private projectileId = 0
  private previousInputs = new Map<string, GameInput>()
  private botReactions = new Map<string, BotReaction>()
  private mapId: number

  constructor(name: string, mapId: number = 0) {
    this.mapId = mapId
    const powers = Array.from({ length: 20 }, (_, i) => i)
    for (let i = powers.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [powers[i], powers[j]] = [powers[j], powers[i]] }
    const rival = SOLO_RIVALS[mapId] ?? SOLO_RIVALS[0]
    const rivalPowerIndex = powers.indexOf(rival.ability)
    ;[powers[1], powers[rivalPowerIndex]] = [powers[rivalPowerIndex], powers[1]]
    // All-Seeing Eye and Invisibility are a pair: either both are in the
    // five-player roster or neither is. Preserve the map rival's guaranteed power.
    const top5 = powers.slice(0, 5)
    const hasEye = top5.includes(5), hasInvisibility = top5.includes(2)
    if (hasEye !== hasInvisibility) {
      const missing = hasEye ? 2 : 5
      const paired = hasEye ? 5 : 2
      const source = powers.indexOf(missing)
      // Prefer a normal computer slot; do not replace the rival or the paired power.
      const destination = [4, 3, 2, 0].find(index => powers[index] !== paired)!
      ;[powers[destination], powers[source]] = [powers[source], powers[destination]]
    }
    const names = [name, rival.name, 'Wraith', 'Phantom', 'Specter']
    const players = names.map((n, i): Player => {
      const angle = -Math.PI / 2 + i * Math.PI * 2 / 5
      const x = WORLD_CX + Math.cos(angle) * 225, y = WORLD_CY + Math.sin(angle) * 202
      return {
        id: i === 0 ? 'you' : `bot-${i}`, name: n, x, y, hp: 100, ability: powers[i],
        hatched: false, alive: true, cooldown: 0, shotCooldown: 0, speedUntil: 0,
        invisibleUntil: 0, frozenUntil: 0, revealUntil: 0, shieldUntil: 0,
        invulnerableUntil: 0, revives: 0, rewindUsed: false, safeX: x, safeY: y,
        teleportAt: 0, teleportX: 0, teleportY: 0, copies: [], selectedCopy: -1,
        cycleCooldown: 0, kills: 0, bot: i > 0,
        eggX: x - Math.cos(angle) * 26, eggY: y - Math.sin(angle) * 26,
        visible: true, mirrorUntil: 0, chainTarget: null,
        berserkerUntil: 0, ironSkinUntil: 0,
        meteorAt: 0, meteorX: 0, meteorY: 0,
      }
    })
    this.state = { time: 0, status: 'playing', players, projectiles: [], effects: [], winner: null, radius: 382, events: [`${rival.name}: ${rival.hint}`, 'Five enter. One remains.'] }
  }

  event(text: string) { this.state.events = [text, ...this.state.events].slice(0, 4) }

  update(dt: number, human: GameInput) {
    const s = this.state
    if (s.status !== 'playing') return
    dt = Math.min(dt, .05)
    s.time += dt
    if (s.time < 3) return

    const shrinkRate = SHRINK_RATES[this.mapId] ?? 2.0
    const shrinkStart = SHRINK_START[this.mapId] ?? 25
    s.radius = Math.max(34, 382 - Math.max(0, s.time - shrinkStart) * shrinkRate)
    s.effects = s.effects.filter(e => e.until > s.time)

    for (const p of s.players) {
      if (!p.alive) continue
      p.cooldown = Math.max(0, p.cooldown - dt)
      p.shotCooldown = Math.max(0, p.shotCooldown - dt)
      p.cycleCooldown = Math.max(0, p.cycleCooldown - dt)

      // Meteor impact timing
      if (p.meteorAt > 0 && s.time >= p.meteorAt) {
        s.players.filter(o => o.alive && distance(o, { x: p.meteorX, y: p.meteorY }) < 72).forEach(o => {
          if (o.id !== p.id) this.damage(o, 40, p.id)
        })
        s.effects.push({ x: p.meteorX, y: p.meteorY, radius: 72, until: s.time + 0.7, kind: 'quake', owner: p.id })
        this.event(`${p.name} — meteor lands!`)
        p.meteorAt = 0
      }

      if (p.teleportAt && s.time >= p.teleportAt) {
        if (canStand(p.teleportX, p.teleportY)) { p.x = p.teleportX; p.y = p.teleportY }
        p.teleportAt = 0
      }

      const input = p.bot ? this.botInput(p) : human
      const previous = this.previousInputs.get(p.id) ?? emptyInput()
      const abilityPressed = input.ability && !previous.ability
      const cyclePressed = input.cycle && !previous.cycle
      this.previousInputs.set(p.id, { ...input })

      if (p.frozenUntil <= s.time) {
        const length = Math.hypot(input.dx, input.dy)
        if (length > 0) {
          const speed = 130 * (p.speedUntil > s.time ? 3.5 : p.invulnerableUntil > s.time && p.ability === 14 ? 2 : 1) * dt
          const nx = p.x + input.dx / Math.max(1, length) * speed, ny = p.y + input.dy / Math.max(1, length) * speed
          if (canStand(nx, p.y)) p.x = nx
          if (canStand(p.x, ny)) p.y = ny
        }
        if (input.hatch && !p.hatched && distance(p, { x: p.eggX, y: p.eggY }) < 64) {
          p.hatched = true
          this.event(`${p.name} awakened a power.`)
          s.effects.push({ x: p.x, y: p.y, radius: 80, until: s.time + .7, kind: 'hatch', owner: p.id })
        }
        if (cyclePressed && p.copies.length && p.cycleCooldown <= 0) { p.selectedCopy = p.selectedCopy >= p.copies.length - 1 ? -1 : p.selectedCopy + 1; p.cycleCooldown = .3 }
        if (abilityPressed && p.hatched && p.cooldown <= 0) this.activate(p, input)
        if (p.hatched && p.ability === 9 && p.hp <= 50 && p.cooldown <= 0) this.activate(p, input)
        if (p.hatched && p.ability === 14 && p.hp <= 25 && p.cooldown <= 0 && abilityPressed) this.activate(p, input)

        // Shooting — works while moving
        if (input.attack && p.shotCooldown <= 0) {
          const angle = Math.atan2(input.aimY - p.y, input.aimX - p.x)
          const dmg = p.berserkerUntil > s.time ? 24 : 16
          const cd = p.bot ? BOT_SHOT_COOLDOWN * (p.berserkerUntil > s.time ? 0.5 : 1) : (p.berserkerUntil > s.time ? 0.18 : 0.35)
          s.projectiles.push({ id: this.projectileId++, owner: p.id, x: p.x + Math.cos(angle) * 20, y: p.y + Math.sin(angle) * 20, vx: Math.cos(angle) * 420, vy: Math.sin(angle) * 420, life: 1.4, damage: dmg })
          p.shotCooldown = cd
          p.invisibleUntil = 0
        }
      }

      if (Math.floor(s.time / 4) > Math.floor((s.time - dt) / 4) && distance(p, { x: WORLD_CX, y: WORLD_CY }) < s.radius - 22) { p.safeX = p.x; p.safeY = p.y }
      if (distance(p, { x: WORLD_CX, y: WORLD_CY }) > s.radius) this.damage(p, 18 * dt, null)
    }

    s.projectiles = s.projectiles.filter(b => {
      const frozen = s.effects.some(e => e.kind === 'time' && e.owner !== b.owner && distance(e, b) < e.radius)
      if (!frozen) { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt }
      if (b.life <= 0 || b.x < 0 || b.x > 750 || b.y < 0 || b.y > 525 || obstacles.some(o => b.x > o.x && b.x < o.x + o.w && b.y > o.y && b.y < o.y + o.h)) return false
      for (const p of s.players) {
        if (!p.alive || p.id === b.owner) continue
        if (p.shieldUntil > s.time && distance(p, b) < 110) return false
        if (distance(p, b) < 17) { this.damage(p, b.damage ?? 16, b.owner); return false }
      }
      return true
    })

    const alive = s.players.filter(p => p.alive)
    if (alive.length <= 1) {
      s.status = 'finished'
      s.winner = alive[0]?.id ?? null
      this.event(alive[0] ? `${alive[0].name} ——— GOT THE KING’S CROWN.` : 'The grove claims everyone.')
    }
  }

  activate(p: Player, input: GameInput) {
    const s = this.state
    const power = p.ability === 4 && p.selectedCopy >= 0 ? p.copies[p.selectedCopy] : p.ability
    if (power === undefined) return
    p.cooldown = p.ability === 4 && power !== 4 ? 10 + cooldowns[power] * 1.2 : cooldowns[power]
    switch (power) {
      case 0: p.speedUntil = s.time + 1; break
      case 1: {
        // Teleport in movement direction if moving, else toward cursor
        const moving = Math.hypot(input.dx, input.dy) > 0
        let tx: number, ty: number
        if (moving) {
          const len = Math.max(1, Math.hypot(input.dx, input.dy))
          tx = p.x + (input.dx / len) * 165
          ty = p.y + (input.dy / len) * 165
        } else {
          const dx = input.aimX - p.x, dy = input.aimY - p.y
          const d = Math.max(1, Math.hypot(dx, dy)), r = Math.min(165, d)
          tx = p.x + dx / d * r; ty = p.y + dy / d * r
        }
        if (!canStand(tx, ty)) { p.cooldown = 0; return }
        p.teleportAt = s.time + 1; p.teleportX = tx; p.teleportY = ty
        break
      }
      case 2: p.invisibleUntil = s.time + 7; break
      case 3: case 6:
        s.players.filter(o => o.id !== p.id && o.alive && distance(p, o) < 150).forEach(o => { o.frozenUntil = s.time + 3 })
        s.effects.push({ x: p.x, y: p.y, radius: 150, until: s.time + 3, kind: power === 3 ? 'ice' : 'time', owner: p.id }); break
      case 4: {
        const nearest = s.players.filter(o => o.id !== p.id && o.alive && o.hatched && o.ability !== 4 && !p.copies.includes(o.ability) && distance(p, o) <= 200).sort((a, b) => distance(p, a) - distance(p, b))[0]
        if (nearest) { p.copies.push(nearest.ability); p.selectedCopy = p.copies.length - 1; this.event(`${p.name} copied a power.`) } else p.cooldown = 0
        break
      }
      case 5: p.revealUntil = s.time + 6; break
      case 7: p.hp = Math.min(100, p.hp + 15); break
      case 8: p.hp = Math.min(100, p.hp + 50); break
      case 9: p.shieldUntil = s.time + 3; break
      case 10: {
        const nearby = s.players.filter(o => o.id !== p.id && o.alive && distance(p, o) < 200)
        nearby.forEach(o => {
          const ang = Math.atan2(o.y - p.y, o.x - p.x)
          const nx = o.x + Math.cos(ang) * 90, ny = o.y + Math.sin(ang) * 90
          if (canStand(nx, ny)) { o.x = nx; o.y = ny }
          o.frozenUntil = s.time + 1.5
        })
        s.effects.push({ x: p.x, y: p.y, radius: 200, until: s.time + 0.8, kind: 'quake', owner: p.id })
        this.event(`${p.name} shook the earth!`); break
      }
      case 11: {
        if (p.hp <= 30) { p.cooldown = 0; return }
        const bpTarget = s.players.filter(o => o.id !== p.id && o.alive && o.visible && distance(p, o) < 300).sort((a, b) => distance(p, a) - distance(p, b))[0]
        if (!bpTarget) { p.cooldown = 0; return }
        p.hp -= 30; this.damage(bpTarget, 60, p.id)
        s.effects.push({ x: p.x, y: p.y, radius: 30, until: s.time + 0.6, kind: 'cast', owner: p.id })
        this.event(`${p.name} made a blood pact!`); break
      }
      case 12: {
        p.mirrorUntil = s.time + 6
        s.effects.push({ x: p.x, y: p.y, radius: 60, until: s.time + 0.5, kind: 'cast', owner: p.id })
        this.event(`${p.name} created a mirror image.`); break
      }
      case 13: {
        const sorted = s.players.filter(o => o.id !== p.id && o.alive && o.visible && distance(p, o) < 250).sort((a, b) => distance(p, a) - distance(p, b))
        const damages = [25, 20, 15]
        sorted.slice(0, 3).forEach((o, idx) => { this.damage(o, damages[idx], p.id); s.effects.push({ x: o.x, y: o.y, radius: 25, until: s.time + 0.4, kind: 'cast', owner: p.id }) })
        if (sorted.length === 0) { p.cooldown = 0; return }
        this.event(`${p.name} called down chain lightning!`); break
      }
      case 14: {
        if (p.hp > 25) { p.cooldown = 0; return }
        p.invulnerableUntil = s.time + 3; p.speedUntil = s.time + 3
        s.effects.push({ x: p.x, y: p.y, radius: 50, until: s.time + 0.8, kind: 'cast', owner: p.id })
        this.event(`${p.name} makes their last stand!`); break
      }
      // --- NEW ABILITIES ---
      case 15: {
        // Meteor Strike — impact after 0.8s at cursor
        p.meteorAt = s.time + 0.8; p.meteorX = input.aimX; p.meteorY = input.aimY
        s.effects.push({ x: input.aimX, y: input.aimY, radius: 72, until: s.time + 0.8, kind: 'cast', owner: p.id })
        this.event(`${p.name} calls fire from above!`)
        break
      }
      case 16: {
        // Berserker Rage — 2x fire rate, 1.5x damage for 4s
        p.berserkerUntil = s.time + 4
        s.effects.push({ x: p.x, y: p.y, radius: 50, until: s.time + 0.6, kind: 'cast', owner: p.id })
        this.event(`${p.name} entered berserker rage!`)
        break
      }
      case 17: {
        // Soul Steal — drain 25 HP from nearest
        const stealTarget = s.players.filter(o => o.id !== p.id && o.alive && o.visible && distance(p, o) < 180).sort((a, b) => distance(p, a) - distance(p, b))[0]
        if (!stealTarget) { p.cooldown = 0; return }
        const stolen = Math.min(25, Math.max(0, stealTarget.hp - 1))
        stealTarget.hp -= stolen; p.hp = Math.min(100, p.hp + stolen)
        s.effects.push({ x: stealTarget.x, y: stealTarget.y, radius: 35, until: s.time + 0.6, kind: 'cast', owner: p.id })
        this.event(`${p.name} drained ${Math.round(stolen)} HP from ${stealTarget.name}!`)
        break
      }
      case 18: {
        // Iron Skin — 80% damage reduction for 4s
        p.ironSkinUntil = s.time + 4
        s.effects.push({ x: p.x, y: p.y, radius: 55, until: s.time + 0.5, kind: 'cast', owner: p.id })
        this.event(`${p.name} became iron!`)
        break
      }
      case 19: {
        // Nova Burst — 8 projectiles in all directions
        for (let i = 0; i < 8; i++) {
          const ang = i * Math.PI / 4
          s.projectiles.push({ id: this.projectileId++, owner: p.id, x: p.x + Math.cos(ang) * 22, y: p.y + Math.sin(ang) * 22, vx: Math.cos(ang) * 390, vy: Math.sin(ang) * 390, life: 1.3, damage: 18 })
        }
        s.effects.push({ x: p.x, y: p.y, radius: 65, until: s.time + 0.5, kind: 'quake', owner: p.id })
        this.event(`${p.name} erupted in a nova burst!`)
        break
      }
    }
    s.effects.push({ x: p.x, y: p.y, radius: 40, until: s.time + .5, kind: 'cast', owner: p.id })
  }

  damage(p: Player, amount: number, attacker: string | null) {
    const s = this.state
    if (p.invulnerableUntil > s.time || !p.alive) return
    // Iron Skin reduces damage by 80%
    if (p.ironSkinUntil > s.time) amount *= 0.2
    p.hp -= amount
    if (p.hp > 0) return
    if (p.hatched && p.ability === 7 && p.revives < 3) { p.revives++; p.hp = 100; p.invulnerableUntil = s.time + 1.5; this.event(`${p.name} rises from the ashes (${3 - p.revives} left).`); return }
    if (p.hatched && p.ability === 6 && !p.rewindUsed) { p.rewindUsed = true; p.hp = 40; p.x = p.safeX; p.y = p.safeY; p.invulnerableUntil = s.time + 1; this.event(`${p.name} rewound time.`); return }
    p.hp = 0; p.alive = false; this.event(`${p.name} was eliminated.`)
    const killer = s.players.find(o => o.id === attacker); if (killer) killer.kills++
  }

  botInput(p: Player): GameInput {
    const s = this.state
    const rival = p.id === 'bot-1' ? (SOLO_RIVALS[this.mapId] ?? SOLO_RIVALS[0]) : null
    // Nearest-opponent targeting applies from the first fight onward, equally to
    // humans and computers. Rival personalities never override this selection.
    const target = s.players
      .filter(o => o.id !== p.id && o.alive && o.visible &&
        (o.invisibleUntil <= s.time || (p.revealUntil > s.time && distance(p, o) < 200)))
      .sort((a, b) => distance(p, a) - distance(p, b))[0]

    const phase = s.players.indexOf(p) * 1.8
    let reaction = this.botReactions.get(p.id)
    if (!reaction || reaction.targetId !== (target?.id ?? null)) {
      reaction = {
        targetId: target?.id ?? null, readyAt: s.time + BOT_REACTION_TIME,
        nextAimAt: 0, aimX: p.x, aimY: p.y,
        observedX: target?.x ?? p.x, observedY: target?.y ?? p.y,
        observedAt: s.time, velocityX: 0, velocityY: 0,
      }
      this.botReactions.set(p.id, reaction)
    }

    const targetDistance = target ? distance(p, target) : Infinity
    const seesTarget = !!target && this.botCanSee(p, target)
    const aware = s.time > 5 && p.hatched && seesTarget && s.time >= reaction.readyAt
    const insideSafeZone = distance(p, { x: WORLD_CX, y: WORLD_CY }) <= s.radius - 55
    const orbitDist = rival?.orbit ?? BOT_ORBIT_DISTANCE
    // Awareness is of visible opponents and approaching projectiles, never a
    // hidden global signal about the human player.
    const threat = s.projectiles
      .filter(b => {
        if (b.owner === p.id) return false
        const speedSquared = b.vx * b.vx + b.vy * b.vy
        if (speedSquared === 0) return false
        const t = ((p.x - b.x) * b.vx + (p.y - b.y) * b.vy) / speedSquared
        return t > 0 && t < Math.min(0.6, b.life) &&
          Math.hypot(b.x + b.vx * t - p.x, b.y + b.vy * t - p.y) < 34 &&
          this.botCanSee(p, b)
      })
      .sort((a, b) => distance(p, a) - distance(p, b))[0]
    let dx = 0, dy = 0

    if (!p.hatched) {
      dx = p.eggX - p.x; dy = p.eggY - p.y
    } else if (!insideSafeZone || !target) {
      // Survival and hatching always take priority over a personality's tactic.
      dx = WORLD_CX - p.x; dy = WORLD_CY - p.y
    } else {
      const angle = Math.atan2(target.y - p.y, target.x - p.x)
      const ordinaryOrbit = Math.sin(s.time * 0.8 + phase)
      // The dodger and stalker keep a deliberate sideways motion instead of
      // repeatedly pausing at the centre of an ordinary bot's strafe cycle.
      const orbit = rival?.kind === 'dodger' || rival?.kind === 'stalker'
        ? (Math.sin(s.time * 0.65 + phase) >= 0 ? 1 : -1)
        : ordinaryOrbit
      const retreating = rival?.kind === 'phoenix' && p.hp <= 55 && aware
      const tooClose = retreating ? 165 : rival?.kind === 'artillery' ? 135 : 65

      if (targetDistance > orbitDist + 40) {
        dx = Math.cos(angle) * 0.85 + Math.cos(angle + Math.PI / 2) * orbit * 0.25
        dy = Math.sin(angle) * 0.85 + Math.sin(angle + Math.PI / 2) * orbit * 0.25
      } else if (targetDistance < tooClose) {
        dx = -Math.cos(angle); dy = -Math.sin(angle)
      } else {
        dx = Math.cos(angle + Math.PI / 2) * orbit + Math.cos(angle) * 0.1
        dy = Math.sin(angle + Math.PI / 2) * orbit + Math.sin(angle) * 0.1
      }

      // Tactics change with the fight, rather than making every rival kite.
      // These only change movement around the SAME nearest opponent.
      if (aware) {
        const side = Math.sin(s.time * 0.65 + phase) >= 0 ? 1 : -1
        const steer = (forward: number, sideways: number) => {
          dx = Math.cos(angle) * forward + Math.cos(angle + Math.PI / 2) * sideways
          dy = Math.sin(angle) * forward + Math.sin(angle + Math.PI / 2) * sideways
        }
        if (rival) {
          switch (rival.kind) {
            case 'dodger':
              // Zigzag into a fight, then circle; incoming shots can interrupt to dodge.
              if (targetDistance > 70) steer(targetDistance > 170 ? 0.75 : 0.15, Math.sin(s.time * 3.2 + phase) >= 0 ? 0.95 : -0.95)
              break
            case 'phoenix':
              // Retreat only while hurt. Re-engage after healing, and push during
              // the brief protection granted by an actual Phoenix revival.
              if (p.invulnerableUntil > s.time && p.revives > 0 && targetDistance > 70) steer(0.95, 0.15 * side)
              else if (p.hp > 70 && targetDistance > 100) steer(0.7, 0.35 * side)
              break
            case 'artillery':
              // Cast, sidestep while the marker counts down, then move forward
              // during the cooldown instead of staying at long range all match.
              if (p.meteorAt > s.time) steer(0.1, 0.95 * side)
              else if (p.cooldown > 0 && targetDistance > 115) steer(0.7, 0.4 * side)
              break
            case 'warden':
              // Armor is an opportunity to advance, not another reason to flee.
              if (p.ironSkinUntil > s.time && targetDistance > 55) steer(0.95, 0.1 * side)
              else if (p.hp > 55 && targetDistance > 120) steer(0.65, 0.2 * side)
              break
            case 'stalker':
              // Close in under cover of invisibility for an ambush; flank while visible.
              if (p.invisibleUntil > s.time) steer(targetDistance > 75 ? 0.9 : 0, 0.35 * side)
              else if (targetDistance > 135) steer(0.35, 0.85 * side)
              break
          }
        } else {
          // Ordinary computers have different movement styles too, without
          // faster reactions, extra health, or more accurate aim.
          switch (s.players.indexOf(p) % 3) {
            case 2: // Pressure: move into the fight.
              if (targetDistance > 95) steer(0.8, 0.2 * ordinaryOrbit)
              break
            case 0: // Flanker: alternate side approaches with short pushes.
              if (targetDistance > 85) steer((s.time + phase) % 4 < 1.2 ? 0.75 : 0.2, 0.85 * side)
              break
            case 1: // Cautious: retreat when hurt, return when healthy.
              if (p.hp < 40 && targetDistance < 165) steer(-0.85, 0.3 * side)
              else if (p.hp >= 40 && targetDistance > 120) steer(0.65, 0.35 * side)
              break
          }
        }
      }

      if (rival && aware && threat &&
        (rival.kind === 'dodger' || rival.kind === 'phoenix' || rival.kind === 'stalker')) {
        const speed = Math.max(1, Math.hypot(threat.vx, threat.vy))
        const sideX = -threat.vy / speed, sideY = threat.vx / speed
        // Try both sides; do not dodge blindly into a wall.
        for (const side of [1, -1]) {
          const dodgeX = dx * 0.25 + sideX * side
          const dodgeY = dy * 0.25 + sideY * side
          const length = Math.max(1, Math.hypot(dodgeX, dodgeY))
          if (canStand(p.x + dodgeX / length * 30, p.y + dodgeY / length * 30)) {
            dx = dodgeX; dy = dodgeY; break
          }
        }
      }
    }

    const len = Math.max(1, Math.hypot(dx, dy)); dx /= len; dy /= len
    if (!canStand(p.x + dx * 30, p.y + dy * 30)) { const turn = s.time % 8 < 4 ? 1 : -1; [dx, dy] = [-dy * turn, dx * turn] }

    // Sample only observed movement; bots cannot track through ruins or invisibility.
    if (target && seesTarget && s.time >= reaction.nextAimAt) {
      const elapsed = s.time - reaction.observedAt
      if (elapsed > 0) {
        const vx = (target.x - reaction.observedX) / elapsed
        const vy = (target.y - reaction.observedY) / elapsed
        const scale = Math.max(1, Math.hypot(vx, vy) / 130)
        reaction.velocityX = vx / scale; reaction.velocityY = vy / scale
      }
      reaction.observedX = target.x; reaction.observedY = target.y; reaction.observedAt = s.time
      reaction.aimX = target.x + Math.sin(s.time * 2.1 + phase) * BOT_AIM_ERROR
      reaction.aimY = target.y + Math.cos(s.time * 1.7 + phase) * BOT_AIM_ERROR
      reaction.nextAimAt = s.time + BOT_AIM_INTERVAL
    }

    const engaged = aware && targetDistance < BOT_SHOOT_RANGE
    const burstTime = (s.time + phase) % 2.2
    let attack = engaged && burstTime < 1.3
    let ability = engaged && p.cooldown <= 0 && Math.sin(s.time * 1.4 + phase) > 0.92
    let aimX = reaction.aimX, aimY = reaction.aimY

    // Eye users can scan when nearby opponents disappear, instead of requiring
    // an already-visible target to reveal an invisible one. This uses only the
    // absence of a visible nearby target, not the hidden opponent's coordinates.
    if (p.ability === 5 && p.hatched && s.time > 5 && p.cooldown <= 0) {
      ability = (engaged || targetDistance > 200) && Math.sin(s.time * 1.4 + phase) > 0.5
    }

    if (rival && p.hatched && s.time > 5 && p.cooldown <= 0) {
      // Guard on ability too, so a changed/copied power cannot trigger the wrong tactic.
      switch (rival.kind) {
        case 'dodger':
          if (p.ability === 0) ability = aware && insideSafeZone && (!!threat || targetDistance < 100)
          break
        case 'phoenix':
          if (p.ability === 7) ability = p.hp <= 75
          break
        case 'artillery':
          if (p.ability === 15) {
            ability = engaged && p.meteorAt === 0
            if (ability) {
              // A modest prediction, not a perfect lock-on. The existing 0.8s
              // ground warning still gives either kind of opponent time to dodge.
              aimX = Math.max(16, Math.min(734, reaction.aimX + reaction.velocityX * 0.35))
              aimY = Math.max(16, Math.min(509, reaction.aimY + reaction.velocityY * 0.35))
              attack = false
            }
          }
          break
        case 'warden':
          if (p.ability === 18) ability = aware && (!!threat || p.hp <= 55)
          break
        case 'stalker':
          if (p.ability === 2) ability = engaged && p.invisibleUntil <= s.time && (targetDistance > 100 || p.hp <= 55)
          break
      }
    }
    // Any invisibility user gets time to reposition instead of cancelling its
    // own power with a shot on the activation frame. The stalker also waits to
    // get close for its ambush, unless its invisibility is about to expire.
    if (p.ability === 2 && (ability || p.invisibleUntil - s.time > 5.2)) attack = false
    if (rival?.kind === 'stalker' && p.ability === 2 &&
      p.invisibleUntil - s.time > 1 && targetDistance > 115) attack = false

    return { dx, dy, aimX, aimY, attack, hatch: true, ability, cycle: false }
  }

  private botCanSee(from: { x: number; y: number }, to: { x: number; y: number }) {
    const steps = Math.max(1, Math.ceil(distance(from, to) / 10))
    for (let i = 1; i < steps; i++) {
      const x = from.x + (to.x - from.x) * i / steps
      const y = from.y + (to.y - from.y) * i / steps
      if (obstacles.some(o => x > o.x && x < o.x + o.w && y > o.y && y < o.y + o.h)) return false
    }
    return true
  }
}
