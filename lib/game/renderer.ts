import { obstacles, distance, type ArenaState } from './types'
import type { MapTheme } from './maps'

const playerColors = ['#f1c779', '#a9bdcd', '#b4a6d0', '#a7c596', '#dd9e83']

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill?: string, stroke?: string, lw?: number) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2)
  if (fill) { ctx.fillStyle = fill; ctx.fill() }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw ?? 2; ctx.stroke() }
}

function drawCrown(ctx: CanvasRenderingContext2D, x: number, y: number, sz: number, alpha: number, acc: string, t: number) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.shadowColor = acc; ctx.shadowBlur = 14
  ctx.fillStyle = '#e9c97e'
  ctx.fillRect(x - sz, y, sz * 2, sz * 0.55)
  ctx.beginPath()
  ctx.moveTo(x - sz, y); ctx.lineTo(x - sz, y - sz * 0.9)
  ctx.lineTo(x - sz * 0.48, y - sz * 0.35)
  ctx.lineTo(x, y - sz)
  ctx.lineTo(x + sz * 0.48, y - sz * 0.35)
  ctx.lineTo(x + sz, y - sz * 0.9); ctx.lineTo(x + sz, y)
  ctx.closePath()
  ctx.fillStyle = '#e9c97e'; ctx.fill()
  ctx.strokeStyle = '#9a6c18'; ctx.lineWidth = 0.8; ctx.stroke()
  ctx.shadowColor = '#ff5588'; ctx.shadowBlur = 7
  circle(ctx, x, y - sz, sz * 0.18, '#ff80b0')
  ctx.shadowColor = '#4488ff'; ctx.shadowBlur = 5
  circle(ctx, x - sz * 0.68, y - sz * 0.25, sz * 0.14, '#88bbff')
  circle(ctx, x + sz * 0.68, y - sz * 0.25, sz * 0.14, '#88bbff')
  ctx.restore()
}

function drawMagicalEgg(ctx: CanvasRenderingContext2D, x: number, y: number, acc: string, t: number) {
  const pulse = Math.sin(t * 2.5) * 2.5
  const breathe = Math.sin(t * 1.8) * 3
  // outer halo
  const halo = ctx.createRadialGradient(x, y, 8, x, y, 38 + pulse)
  halo.addColorStop(0, acc + '55'); halo.addColorStop(0.6, acc + '20'); halo.addColorStop(1, 'transparent')
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, 38 + pulse, 0, Math.PI * 2); ctx.fill()
  // stone egg shell
  const shell = ctx.createRadialGradient(x - 4, y - 5, 2, x, y, 15)
  shell.addColorStop(0, '#2a2a2a'); shell.addColorStop(0.6, '#111111'); shell.addColorStop(1, '#050505')
  ctx.save()
  ctx.shadowColor = acc; ctx.shadowBlur = 18
  ctx.beginPath(); ctx.ellipse(x, y + breathe * 0.2, 10, 14, 0, 0, Math.PI * 2)
  ctx.fillStyle = shell; ctx.fill()
  // glowing cracks
  ctx.strokeStyle = acc; ctx.lineWidth = 1.2; ctx.shadowBlur = 12
  ctx.beginPath(); ctx.moveTo(x - 2, y - 11); ctx.lineTo(x + 1, y - 4); ctx.lineTo(x - 3, y + 2); ctx.lineTo(x + 2, y + 9); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + 3, y - 8); ctx.lineTo(x + 7, y - 2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x - 8, y + 4); ctx.stroke()
  // inner glow leaking out
  ctx.globalAlpha = 0.35 + Math.sin(t * 3) * 0.2
  const inner = ctx.createRadialGradient(x, y, 0, x, y, 8)
  inner.addColorStop(0, '#ffffff'); inner.addColorStop(0.4, acc); inner.addColorStop(1, 'transparent')
  ctx.fillStyle = inner; ctx.beginPath(); ctx.ellipse(x, y, 10, 14, 0, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
  // orbiting dust motes
  for (let i = 0; i < 5; i++) {
    const ang = t * 1.2 + i * 1.26, d = 16 + Math.sin(t * 2 + i * 1.5) * 4
    ctx.save(); ctx.globalAlpha = 0.4 + Math.sin(t * 3 + i) * 0.3
    ctx.shadowColor = acc; ctx.shadowBlur = 6
    circle(ctx, x + Math.cos(ang) * d, y + Math.sin(ang) * d, 1.8, acc)
    ctx.restore()
  }
  // floating crown above egg
  drawCrown(ctx, x, y - 30 + Math.sin(t * 2) * 3, 7, 0.92, acc, t)
  // label
  ctx.save(); ctx.globalAlpha = 0.7; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'
  ctx.fillStyle = acc; ctx.fillText('YOUR EGG · [E] HATCH', x, y - 48)
  ctx.restore()
}

function drawWall(ctx: CanvasRenderingContext2D, o: { x: number; y: number; w: number; h: number }, m: MapTheme) {
  const wh = 14
  // drop shadow below wall
  ctx.fillStyle = m.wShad + 'aa'; ctx.fillRect(o.x + 6, o.y + wh + o.h - 4, o.w + 10, 18)
  // side face (dark)
  ctx.fillStyle = m.wSide; ctx.fillRect(o.x, o.y + wh, o.w, o.h)
  // right bevel face
  ctx.fillStyle = m.wSide + 'bb'; ctx.fillRect(o.x + o.w, o.y + wh - 3, 5, o.h + 3)
  // top face — bright (light from above)
  ctx.fillStyle = m.wTop; ctx.fillRect(o.x, o.y, o.w, wh)
  // highlight strip on top edge
  ctx.fillStyle = '#ffffff28'; ctx.fillRect(o.x + 2, o.y + 1, o.w - 4, 3)
  // mortar lines on top
  ctx.strokeStyle = m.wSide + '66'; ctx.lineWidth = 1
  for (let bx = o.x + 18; bx < o.x + o.w; bx += 18) { ctx.beginPath(); ctx.moveTo(bx, o.y); ctx.lineTo(bx, o.y + wh); ctx.stroke() }
  // mortar lines on side
  for (let by = o.y + wh + 14; by < o.y + wh + o.h - 4; by += 18) { ctx.beginPath(); ctx.moveTo(o.x, by); ctx.lineTo(o.x + o.w, by); ctx.stroke() }
}

function drawMapDetails(ctx: CanvasRenderingContext2D, m: MapTheme, t: number) {
  if (m.det === 'forest') {
    for (let i = 0; i < 60; i++) {
      const x = (i * 137.3 + 29) % 980, y = (i * 83.7 + 63) % 670
      if (x < 90 || x > 890 || y < 45 || y > 625) {
        circle(ctx, x, y, 14 + (i % 3) * 6, m.fog + 'aa')
        circle(ctx, x - 4, y - 4, 11 + (i % 3) * 5, '#2e4128')
        circle(ctx, x + 6, y - 7, 9, m.acc + '50')
      } else { ctx.fillStyle = i % 2 ? m.acc + '38' : m.acc + '18'; ctx.fillRect(x, y, 3, 2) }
    }
  } else if (m.det === 'ice') {
    for (let i = 0; i < 35; i++) {
      const x = (i * 113 + 17) % 980, y = (i * 97 + 41) % 670
      if (x < 75 || x > 905 || y < 30 || y > 640) {
        ctx.save(); ctx.strokeStyle = m.acc + '80'; ctx.lineWidth = 1.5
        for (let a = 0; a < 6; a++) { const ang = a * Math.PI / 3, sz = 7 + i % 9; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * sz, y + Math.sin(ang) * sz); ctx.stroke() }
        ctx.restore()
      }
      ctx.strokeStyle = m.acc + '12'; ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 14, y + 9); ctx.lineTo(x + 9, y + 20); ctx.stroke()
    }
  } else if (m.det === 'lava') {
    for (let i = 0; i < 25; i++) {
      const x = (i * 157 + 55) % 950, y = (i * 121 + 73) % 630
      const g = ctx.createRadialGradient(x, y, 0, x, y, 22)
      g.addColorStop(0, m.acc + '45'); g.addColorStop(1, 'transparent')
      ctx.fillStyle = g; ctx.fillRect(x - 22, y - 22, 44, 44)
      ctx.strokeStyle = m.acc + '55'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (i % 5 - 2) * 14, y + 22); ctx.stroke()
    }
    // animated embers
    for (let i = 0; i < 20; i++) {
      const ex = (i * 193 + t * 25) % 950, ey = (i * 89 + t * 18) % 660
      ctx.save(); ctx.globalAlpha = 0.35 + Math.sin(t * 5 + i) * 0.3
      ctx.shadowColor = m.acc; ctx.shadowBlur = 10
      circle(ctx, ex, ey, 1.5, m.acc); ctx.restore()
    }
  } else if (m.det === 'stone') {
    for (let tx = 0; tx < 980; tx += 65) for (let ty = 0; ty < 670; ty += 65) {
      ctx.strokeStyle = m.acc + '15'; ctx.lineWidth = 1; ctx.strokeRect(tx + 4, ty + 4, 57, 57)
      ctx.fillStyle = m.acc + '18'; ctx.fillRect(tx + 4, ty + 4, 7, 7); ctx.fillRect(tx + 54, ty + 4, 7, 7)
    }
    ;[[450, 300], [550, 300], [450, 390], [550, 390]].forEach(([px, py]) => {
      ctx.save(); ctx.shadowColor = m.acc; ctx.shadowBlur = 8
      circle(ctx, px, py, 9, m.wSide, m.acc + '55'); ctx.restore()
    })
  } else if (m.det === 'void') {
    for (let i = 0; i < 70; i++) {
      const sx = (i * 113 + 7) % 980, sy = (i * 79 + 23) % 670
      ctx.save(); ctx.globalAlpha = 0.25 + Math.sin(t + i * 0.7) * 0.2
      circle(ctx, sx, sy, 1, '#fff'); ctx.restore()
    }
    for (let i = 0; i < 7; i++) {
      const rx = (i * 173 + 80) % 700 + 80, ry = (i * 127 + 50) % 550 + 50
      ctx.save(); ctx.globalAlpha = 0.28
      const rg = ctx.createRadialGradient(rx, ry, 0, rx, ry, 28)
      rg.addColorStop(0, m.acc); rg.addColorStop(1, 'transparent')
      ctx.fillStyle = rg; ctx.beginPath(); ctx.ellipse(rx, ry, 5, 24 + Math.sin(t * 2 + i) * 5, 0, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }
  }
}

export function renderArena(
  ctx: CanvasRenderingContext2D,
  s: ArenaState,
  you: string,
  width: number,
  height: number,
  mapTheme: MapTheme,
  t: number,
  playerColour: string
) {
  const scale = Math.min(width / 750, height / 525)
  ctx.clearRect(0, 0, width, height)
  const m = mapTheme

  ctx.fillStyle = m.bg; ctx.fillRect(0, 0, width, height)
  ctx.save()
  ctx.translate((width - 750 * scale) / 2, (height - 525 * scale) / 2)
  ctx.scale(scale, scale)

  // floor
  ctx.fillStyle = m.floor; ctx.fillRect(0, 0, 750, 525)
  for (let x = 0; x < 750; x += 50) for (let y = 0; y < 525; y += 50) {
    const n = Math.sin(x * .17 + y * .49) * 1000
    ctx.fillStyle = n % 3 > 1 ? m.t1 : m.t2; ctx.fillRect(x + 2, y + 2, 46, 46)
  }

  // map-specific floor details
  drawMapDetails(ctx, m, t)

  // arena circles
  circle(ctx, 375, 262, 138, m.floor + '70', '#68724c20')
  circle(ctx, 375, 262, 108, m.floor + '60', '#69784f30')
  circle(ctx, 375, 262, 35, m.floor, '#6f775344')
  ctx.save(); ctx.translate(375, 262); ctx.rotate(Math.PI / 4); ctx.strokeStyle = m.acc + '44'; ctx.lineWidth = 1; ctx.strokeRect(-15, -15, 30, 30); ctx.restore()

  // walls — new solid style with shadows
  for (const o of obstacles) drawWall(ctx, o, m)

  // shrinking ring overlay
  ctx.save()
  ctx.beginPath(); ctx.rect(-5, -5, 760, 535); ctx.arc(375, 262, s.radius, 0, Math.PI * 2, true)
  ctx.fillStyle = '#142136bb'; ctx.fill('evenodd'); ctx.restore()
  ctx.setLineDash([9, 9]); ctx.strokeStyle = '#95b6c795'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(375, 262, s.radius, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([])

  const me = s.players.find(p => p.id === you)

  // effects
  for (const e of s.effects) {
    const color = e.kind === 'ice' || e.kind === 'time' ? '#a3d6ed' : e.kind === 'quake' ? '#e8c87a' : '#efc374'
    circle(ctx, e.x, e.y, e.radius, `${color}12`, `${color}66`)
  }

  // eggs — new magical cracked stone orb
  for (const [i, p] of s.players.entries()) {
    if (!p.hatched && p.alive && p.visible) {
      if (p.id === you) {
        drawMagicalEgg(ctx, p.eggX, p.eggY, m.acc, t)
      } else {
        // other players eggs — simpler version
        const pulse = Math.sin(t * 3 + i) * 2
        const ehalo = ctx.createRadialGradient(p.eggX, p.eggY, 5, p.eggX, p.eggY, 26 + pulse)
        ehalo.addColorStop(0, m.acc + '40'); ehalo.addColorStop(1, 'transparent')
        ctx.fillStyle = ehalo; ctx.beginPath(); ctx.arc(p.eggX, p.eggY, 26 + pulse, 0, Math.PI * 2); ctx.fill()
        ctx.save(); ctx.shadowColor = m.acc; ctx.shadowBlur = 12
        ctx.beginPath(); ctx.ellipse(p.eggX, p.eggY, 8, 12, 0, 0, Math.PI * 2)
        ctx.fillStyle = '#151515'; ctx.fill()
        ctx.strokeStyle = m.acc; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(p.eggX, p.eggY - 9); ctx.lineTo(p.eggX + 2, p.eggY); ctx.lineTo(p.eggX - 1, p.eggY + 6); ctx.stroke()
        ctx.restore()
        drawCrown(ctx, p.eggX, p.eggY - 22 + Math.sin(t * 2 + i) * 2, 5, 0.7, m.acc, t)
      }
    }
  }

  // players
  for (const [i, p] of s.players.entries()) {
    if (!p.alive) {
      if (p.visible) { ctx.strokeStyle = '#67705a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x - 5, p.y - 5); ctx.lineTo(p.x + 5, p.y + 5); ctx.moveTo(p.x + 5, p.y - 5); ctx.lineTo(p.x - 5, p.y + 5); ctx.stroke() }
      continue
    }
    const seen = p.id === you || p.invisibleUntil <= s.time || (me && me.revealUntil > s.time && distance(me, p) < 260)
    if (!p.visible || !seen) continue
    ctx.save()
    if (p.invisibleUntil > s.time) ctx.globalAlpha = .4
    if (p.speedUntil > s.time) { for (let j = 1; j <= 4; j++) circle(ctx, p.x - j * 7, p.y + j * 3, 13 - j, (p.id === you ? playerColour : (playerColors[i] ?? '#a9bdcd')) + '25') }
    if (p.shieldUntil > s.time) circle(ctx, p.x, p.y, 110, '#accde710', '#accde760')
    if (p.revealUntil > s.time) { ctx.setLineDash([3, 9]); circle(ctx, p.x, p.y, 260, '#ecc68105', '#ecc68130'); ctx.setLineDash([]) }
    if (p.invulnerableUntil > s.time) circle(ctx, p.x, p.y, 23, '#f4d59520', '#f4d59590')
    // mirror image effect
    if ((p as any).mirrorUntil > s.time) {
      ctx.setLineDash([4, 4]); circle(ctx, p.x + 35, p.y - 10, 16, '#bbabe830', '#bbabe870'); ctx.setLineDash([])
    }
    const pColor = p.id === you ? playerColour : (playerColors[i] ?? '#a9bdcd')
    circle(ctx, p.x + 3, p.y + 9, 16, '#06110b80')
    circle(ctx, p.x, p.y, 16, '#131d15', p.id === you ? '#f6d78e' : pColor)
    circle(ctx, p.x, p.y, 11, pColor)
    circle(ctx, p.x - 3, p.y - 3, 4, '#fff5dc80')
    if (p.frozenUntil > s.time) circle(ctx, p.x, p.y, 20, '#a5dbeb60', '#c1e6f2')
    ctx.font = '10px sans-serif'; ctx.textAlign = 'center'
    ctx.fillStyle = p.id === you ? '#f5e1b1' : '#d6e0cd'
    ctx.fillText(p.id === you ? `${p.name} · YOU` : p.name, p.x, p.y - 31)
    ctx.fillStyle = '#0c150de0'; ctx.fillRect(p.x - 20, p.y - 25, 40, 4)
    ctx.fillStyle = p.hp < 30 ? '#ce8871' : pColor; ctx.fillRect(p.x - 20, p.y - 25, 40 * p.hp / 100, 4)
    if (p.teleportAt > s.time) { ctx.setLineDash([4, 4]); circle(ctx, p.teleportX, p.teleportY, 19, '#bbabe830', '#bbabe8'); ctx.setLineDash([]) }
    ctx.restore()
  }

  // projectiles
  for (const b of s.projectiles) {
    ctx.save(); ctx.shadowColor = b.owner === you ? '#f6d485' : '#c2cfb6'; ctx.shadowBlur = 12
    circle(ctx, b.x, b.y, 3.5, b.owner === you ? '#f6d485' : '#c2cfb6'); ctx.restore()
  }

  // vignette
  const vignette = ctx.createRadialGradient(375, 262, 142, 375, 262, 480)
  vignette.addColorStop(0, 'transparent'); vignette.addColorStop(1, m.fog + '99')
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, 750, 525)

  // map name
  ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left'
  ctx.fillStyle = m.acc + 'aa'; ctx.fillText('⬡ ' + m.name, 14, 22)

  ctx.restore()
}
